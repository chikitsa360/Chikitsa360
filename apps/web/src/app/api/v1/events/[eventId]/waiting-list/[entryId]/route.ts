import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { inngest } from '@/lib/inngest'
import { writeAuditLog } from '@/lib/audit'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const bodySchema = z.object({
  action: z.enum(['promote', 'remove']),
})

// ─── PATCH /api/v1/events/[eventId]/waiting-list/[entryId] ───────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; entryId: string }> }
) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { clinicId, id: userId } = session.user
  const { eventId, entryId } = await params
  const schemaName = `clinic_${clinicId}`

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_JSON' } }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 })
  }

  const { action } = parsed.data

  // Verify event belongs to this clinic
  const eventRows = await db.$queryRawUnsafe<{
    id: string
    max_seats: number
    seats_registered: number
  }[]>(
    `SELECT id, max_seats, seats_registered
     FROM "${schemaName}".events WHERE id = $1::uuid AND clinic_id = $2::uuid`,
    eventId,
    clinicId
  )
  const event = eventRows[0]
  if (!event) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Load the waiting list entry
  const entryRows = await db.$queryRawUnsafe<{
    id: string
    status: string
    patient_id: string
    position: number
    event_id: string
  }[]>(
    `SELECT id, status, patient_id, position, event_id
     FROM "${schemaName}".event_waiting_list
     WHERE id = $1::uuid AND event_id = $2::uuid LIMIT 1`,
    entryId,
    eventId
  )
  const entry = entryRows[0]
  if (!entry) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (entry.status !== 'waiting') {
    return NextResponse.json(
      { error: { code: 'INVALID_STATUS', message: 'Can only act on waiting entries' } },
      { status: 422 }
    )
  }

  // ── Remove ──────────────────────────────────────────────────────────────
  if (action === 'remove') {
    await db.$executeRawUnsafe(
      `UPDATE "${schemaName}".event_waiting_list
       SET status = 'removed', updated_at = NOW()
       WHERE id = $1::uuid`,
      entryId
    )
    await writeAuditLog({
      clinicId,
      userId,
      action: 'WAITLIST_REMOVED',
      resourceType: 'event_waiting_list',
      resourceId: entryId,
      metadata: { eventId },
    })
    return NextResponse.json({ data: { entry: { id: entryId, status: 'removed' } } })
  }

  // ── Promote (race-safe) ─────────────────────────────────────────────────
  if (action === 'promote') {
    await db.$executeRawUnsafe('BEGIN')
    try {
      // Lock event row
      const lockedRows = await db.$queryRawUnsafe<{
        id: string
        seats_registered: number
        max_seats: number
        slug: string
        start_time: string
      }[]>(
        `SELECT id, seats_registered, max_seats, slug, start_time AT TIME ZONE 'UTC' AS start_time
         FROM "${schemaName}".events WHERE id = $1::uuid FOR UPDATE`,
        eventId
      )
      const locked = lockedRows[0]
      if (!locked || locked.seats_registered >= locked.max_seats) {
        await db.$executeRawUnsafe('ROLLBACK')
        return NextResponse.json(
          { error: { code: 'SEATS_FULL', message: 'No seats available to promote this entry' } },
          { status: 422 }
        )
      }

      // Generate reference number
      const countRows = await db.$queryRawUnsafe<{ cnt: string }[]>(
        `SELECT COUNT(*)::text AS cnt FROM "${schemaName}".event_registrations WHERE event_id = $1::uuid`,
        eventId
      )
      const seq = (parseInt(countRows[0]?.cnt ?? '0', 10) + 1).toString().padStart(3, '0')
      const refPrefix = eventId.substring(0, 4).toUpperCase()
      const referenceNumber = `EVT-${refPrefix}-${seq}`
      const cancellationToken = randomUUID()
      const tokenExpiresAt = new Date(locked.start_time)

      // Create registration
      const newRegRows = await db.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO "${schemaName}".event_registrations
           (event_id, patient_id, reference_number, status, cancellation_token, token_expires_at)
         VALUES ($1::uuid, $2::uuid, $3, 'registered', $4, $5)
         RETURNING id`,
        eventId,
        entry.patient_id,
        referenceNumber,
        cancellationToken,
        tokenExpiresAt.toISOString()
      )
      const newRegistrationId = newRegRows[0]?.id

      // Increment seats_registered
      await db.$executeRawUnsafe(
        `UPDATE "${schemaName}".events SET seats_registered = seats_registered + 1, updated_at = NOW()
         WHERE id = $1::uuid`,
        eventId
      )

      // Mark waitlist entry as promoted
      await db.$executeRawUnsafe(
        `UPDATE "${schemaName}".event_waiting_list SET status = 'promoted', updated_at = NOW()
         WHERE id = $1::uuid`,
        entryId
      )

      await db.$executeRawUnsafe('COMMIT')

      // Fire confirmation for the promoted patient
      if (newRegistrationId) {
        await inngest.send({
          name: 'event/registration.confirm' as never,
          data: { registrationId: newRegistrationId, clinicId },
          id: `${newRegistrationId}:reg-confirm`,
        })
      }

      await writeAuditLog({
        clinicId,
        userId,
        action: 'WAITLIST_PROMOTED',
        resourceType: 'event_waiting_list',
        resourceId: entryId,
        metadata: { eventId, newRegistrationId },
      })

      return NextResponse.json({ data: { entry: { id: entryId, status: 'promoted' }, registrationId: newRegistrationId } })
    } catch (e) {
      await db.$executeRawUnsafe('ROLLBACK')
      throw e
    }
  }

  return NextResponse.json({ error: { code: 'INVALID_ACTION' } }, { status: 400 })
}
