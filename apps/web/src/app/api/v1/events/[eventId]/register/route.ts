import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { inngest } from '@/lib/inngest'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const registerSchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  joinWaitlist: z.boolean().optional().default(false),
})

// ─── Helper: get or create patient ────────────────────────────────────────────

async function getOrCreatePatient(
  clinicId: string,
  name: string,
  phone: string
): Promise<string> {
  const schemaName = `clinic_${clinicId}`
  const existing = await db.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "${schemaName}".patients WHERE phone = $1 LIMIT 1`,
    phone
  )
  if (existing[0]) return existing[0].id

  const created = await db.$queryRawUnsafe<{ id: string }[]>(
    `INSERT INTO "${schemaName}".patients (phone, name, booking_source)
     VALUES ($1, $2, 'event')
     RETURNING id`,
    phone,
    name
  )
  return created[0]!.id
}

// ─── POST /api/v1/events/[eventId]/register ───────────────────────────────────
// Note: [eventId] parameter contains the event SLUG for public registration

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  // Resolve slug → clinicId via global lookup
  const { eventId: slug } = await params

  const slugRows = await db.$queryRawUnsafe<{ clinic_id: string }[]>(
    `SELECT clinic_id FROM event_slugs WHERE slug = $1 LIMIT 1`,
    slug
  )

  if (!slugRows[0]) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const clinicId = slugRows[0].clinic_id
  const schemaName = `clinic_${clinicId}`

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_JSON' } }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    const details: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      details[issue.path.join('.')] = issue.message
    }
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', details } }, { status: 400 })
  }

  const { name, phone, joinWaitlist } = parsed.data

  // Fetch event by slug
  const eventCheckRows = await db.$queryRawUnsafe<{
    id: string
    status: string
    registration_deadline: string | null
    start_time: string
    max_seats: number
    seats_registered: number
  }[]>(
    `SELECT id, status, registration_deadline::text, start_time::text, max_seats, seats_registered
     FROM "${schemaName}".events WHERE slug = $1 LIMIT 1`,
    slug
  )

  if (!eventCheckRows[0]) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const eventCheck = eventCheckRows[0]

  // Validate registration is open
  if (eventCheck.status !== 'published') {
    return NextResponse.json(
      { error: { code: 'REGISTRATION_CLOSED', message: 'This event is not open for registration' } },
      { status: 422 }
    )
  }

  if (eventCheck.registration_deadline) {
    const deadline = new Date(eventCheck.registration_deadline)
    if (deadline < new Date()) {
      return NextResponse.json(
        { error: { code: 'REGISTRATION_CLOSED', message: 'Registration deadline has passed' } },
        { status: 422 }
      )
    }
  }

  // Get or create patient
  const patientId = await getOrCreatePatient(clinicId, name, phone)

  const eventId = eventCheck.id

  // Check for duplicate registration
  const dupRows = await db.$queryRawUnsafe<{ reference_number: string }[]>(
    `SELECT reference_number FROM "${schemaName}".event_registrations
     WHERE event_id = $1 AND patient_id = $2 AND status != 'cancelled' LIMIT 1`,
    eventId,
    patientId
  )
  if (dupRows[0]) {
    return NextResponse.json(
      { error: { code: 'ALREADY_REGISTERED', referenceNumber: dupRows[0].reference_number } },
      { status: 409 }
    )
  }

  // ── Waitlist join path ──────────────────────────────────────────────────────
  if (joinWaitlist) {
    const positionRows = await db.$queryRawUnsafe<{ pos: string }[]>(
      `SELECT COUNT(*)::text AS pos FROM "${schemaName}".event_waiting_list
       WHERE event_id = $1 AND status = 'waiting'`,
      eventId
    )
    const position = parseInt(positionRows[0]?.pos ?? '0', 10) + 1

    await db.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".event_waiting_list (event_id, patient_id, position, status)
       VALUES ($1, $2, $3, 'waiting')
       ON CONFLICT DO NOTHING`,
      eventId,
      patientId,
      position
    )

    return NextResponse.json({ data: { status: 'waitlisted', position } })
  }

  // ── Race-safe seat allocation ───────────────────────────────────────────────
  await db.$executeRawUnsafe('BEGIN')
  try {
    // Lock the event row
    const lockedRows = await db.$queryRawUnsafe<{
      id: string
      seats_registered: number
      max_seats: number
    }[]>(
      `SELECT id, seats_registered, max_seats
       FROM "${schemaName}".events WHERE id = $1 FOR UPDATE`,
      eventId
    )
    const lockedEvent = lockedRows[0]

    if (!lockedEvent || lockedEvent.seats_registered >= lockedEvent.max_seats) {
      await db.$executeRawUnsafe('ROLLBACK')
      return NextResponse.json({ data: { status: 'seats_full' } })
    }

    // Generate reference number: EVT-{first4 of eventId uppercase}-{seq 3-digit}
    const countRows = await db.$queryRawUnsafe<{ cnt: string }[]>(
      `SELECT COUNT(*)::text AS cnt FROM "${schemaName}".event_registrations WHERE event_id = $1`,
      eventId
    )
    const seq = (parseInt(countRows[0]?.cnt ?? '0', 10) + 1).toString().padStart(3, '0')
    const refPrefix = eventId.substring(0, 4).toUpperCase()
    const referenceNumber = `EVT-${refPrefix}-${seq}`

    const cancellationToken = randomUUID()
    const tokenExpiresAt = new Date(eventCheck.start_time)

    // Insert registration
    const regRows = await db.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO "${schemaName}".event_registrations
         (event_id, patient_id, reference_number, status, cancellation_token, token_expires_at)
       VALUES ($1, $2, $3, 'registered', $4, $5)
       RETURNING id`,
      eventId,
      patientId,
      referenceNumber,
      cancellationToken,
      tokenExpiresAt.toISOString()
    )
    const registrationId = regRows[0]?.id

    // Increment seats_registered
    await db.$executeRawUnsafe(
      `UPDATE "${schemaName}".events SET seats_registered = seats_registered + 1, updated_at = NOW()
       WHERE id = $1`,
      eventId
    )

    await db.$executeRawUnsafe('COMMIT')

    // Fire registration confirmation Inngest stub (Epic 14 implements consumer)
    if (registrationId) {
      await inngest.send({
        name: 'event/registration.confirm' as never,
        data: { registrationId, clinicId },
        id: `${registrationId}:reg-confirm`,
      })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.chikitsa360.com'
    const cancellationUrl = `${appUrl}/event/${slug}/cancel?token=${cancellationToken}`

    return NextResponse.json({ data: { status: 'registered', referenceNumber, cancellationUrl } })
  } catch (e) {
    await db.$executeRawUnsafe('ROLLBACK')
    throw e
  }
}
