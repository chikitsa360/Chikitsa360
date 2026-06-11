import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { inngest } from '@/lib/inngest'
import { z } from 'zod'

const cancelSchema = z.object({
  token: z.string().uuid('Invalid token format'),
})

// ─── POST /api/v1/events/[eventId]/cancel ─────────────────────────────────────
// Note: [eventId] param contains the event SLUG (public, no auth)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId: slug } = await params

  // Resolve slug → clinicId
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

  const parsed = cancelSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors } },
      { status: 400 }
    )
  }

  const { token } = parsed.data

  // ── Race-safe cancellation transaction ────────────────────────────────────
  await db.$executeRawUnsafe('BEGIN')
  try {
    // Lock registration row by token
    const regRows = await db.$queryRawUnsafe<{
      id: string
      status: string
      event_id: string
      cancellation_token: string | null
    }[]>(
      `SELECT er.id, er.status, er.event_id, er.cancellation_token
       FROM "${schemaName}".event_registrations er
       WHERE er.cancellation_token = $1
       FOR UPDATE`,
      token
    )

    const registration = regRows[0]

    if (!registration) {
      await db.$executeRawUnsafe('ROLLBACK')
      return NextResponse.json(
        { error: { code: 'INVALID_TOKEN', message: 'Invalid cancellation link.' } },
        { status: 422 }
      )
    }

    if (registration.status === 'cancelled') {
      await db.$executeRawUnsafe('ROLLBACK')
      return NextResponse.json(
        { error: { code: 'ALREADY_CANCELLED', message: 'This cancellation link has already been used.' } },
        { status: 422 }
      )
    }

    // Verify event start_time is still in the future
    const eventRows = await db.$queryRawUnsafe<{ id: string; start_time: string }[]>(
      `SELECT id, start_time AT TIME ZONE 'UTC' AS start_time FROM "${schemaName}".events WHERE id = $1`,
      registration.event_id
    )
    const eventData = eventRows[0]

    if (!eventData || new Date(eventData.start_time) <= new Date()) {
      await db.$executeRawUnsafe('ROLLBACK')
      return NextResponse.json(
        { error: { code: 'EVENT_STARTED', message: 'This cancellation link has expired. The event has already started or ended.' } },
        { status: 422 }
      )
    }

    // Set status = cancelled, clear token (single-use)
    await db.$executeRawUnsafe(
      `UPDATE "${schemaName}".event_registrations
       SET status = 'cancelled', cancellation_token = NULL, updated_at = NOW()
       WHERE id = $1`,
      registration.id
    )

    // Decrement seats_registered (guarded against going negative)
    await db.$executeRawUnsafe(
      `UPDATE "${schemaName}".events
       SET seats_registered = GREATEST(0, seats_registered - 1), updated_at = NOW()
       WHERE id = $1`,
      registration.event_id
    )

    await db.$executeRawUnsafe('COMMIT')

    // Fire Inngest event for cancellation confirmation + auto-promotion (Story 14.6)
    await inngest.send({
      name: 'event/registration.cancelled' as never,
      data: { registrationId: registration.id, clinicId },
      id: `${registration.id}:cancelled`,
    })

    return NextResponse.json({ data: { status: 'cancelled' } })
  } catch (e) {
    await db.$executeRawUnsafe('ROLLBACK')
    throw e
  }
}
