import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { inngest } from '@/lib/inngest'
import { writeAuditLog } from '@/lib/audit'
import { z } from 'zod'

const bodySchema = z.object({
  action: z.enum(['mark-attended', 'mark-no-show', 'remove']),
})

// ─── PATCH /api/v1/events/[eventId]/registrations/[registrationId] ────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; registrationId: string }> }
) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { clinicId, id: userId } = session.user
  const { eventId, registrationId } = await params
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

  // Load event (must belong to this clinic)
  const eventRows = await db.$queryRawUnsafe<{
    id: string
    clinic_id: string
    start_time: string
  }[]>(
    `SELECT id, clinic_id, start_time AT TIME ZONE 'UTC' AS start_time FROM "${schemaName}".events WHERE id = $1 AND clinic_id = $2`,
    eventId,
    clinicId
  )
  const event = eventRows[0]
  if (!event) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Load registration
  const regRows = await db.$queryRawUnsafe<{
    id: string
    status: string
    event_id: string
  }[]>(
    `SELECT id, status, event_id FROM "${schemaName}".event_registrations
     WHERE id = $1 AND event_id = $2 LIMIT 1`,
    registrationId,
    eventId
  )
  const registration = regRows[0]
  if (!registration) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // ── Attendance gate: must not apply to 'remove' ──────────────────────────
  if (action !== 'remove') {
    const eventStartMs = new Date(event.start_time).getTime()
    if (eventStartMs > Date.now()) {
      return NextResponse.json(
        { error: { code: 'EVENT_NOT_STARTED', message: 'Attendance marking is only available after the event starts' } },
        { status: 422 }
      )
    }
    if (registration.status !== 'registered') {
      return NextResponse.json(
        { error: { code: 'INVALID_STATUS', message: 'Can only mark attendance for registered participants' } },
        { status: 422 }
      )
    }
  }

  // ── Handle mark-attended ────────────────────────────────────────────────
  if (action === 'mark-attended') {
    const updated = await db.$queryRawUnsafe<{ id: string; status: string }[]>(
      `UPDATE "${schemaName}".event_registrations
       SET status = 'attended', updated_at = NOW()
       WHERE id = $1
       RETURNING id, status`,
      registrationId
    )
    await writeAuditLog({
      clinicId,
      userId,
      action: 'ATTENDANCE_MARKED',
      resourceType: 'event_registration',
      resourceId: registrationId,
      metadata: { action: 'attended', eventId },
    })
    return NextResponse.json({ data: { registration: updated[0] } })
  }

  // ── Handle mark-no-show ─────────────────────────────────────────────────
  if (action === 'mark-no-show') {
    const updated = await db.$queryRawUnsafe<{ id: string; status: string }[]>(
      `UPDATE "${schemaName}".event_registrations
       SET status = 'no_show', updated_at = NOW()
       WHERE id = $1
       RETURNING id, status`,
      registrationId
    )
    await writeAuditLog({
      clinicId,
      userId,
      action: 'ATTENDANCE_MARKED',
      resourceType: 'event_registration',
      resourceId: registrationId,
      metadata: { action: 'no_show', eventId },
    })
    return NextResponse.json({ data: { registration: updated[0] } })
  }

  // ── Handle remove (race-safe) ────────────────────────────────────────────
  if (action === 'remove') {
    if (registration.status === 'cancelled') {
      return NextResponse.json(
        { error: { code: 'ALREADY_CANCELLED' } },
        { status: 422 }
      )
    }

    await db.$executeRawUnsafe('BEGIN')
    try {
      // Lock event row
      await db.$queryRawUnsafe(
        `SELECT id, seats_registered FROM "${schemaName}".events WHERE id = $1 FOR UPDATE`,
        eventId
      )
      // Cancel registration
      await db.$executeRawUnsafe(
        `UPDATE "${schemaName}".event_registrations
         SET status = 'cancelled', cancellation_token = NULL, updated_at = NOW()
         WHERE id = $1`,
        registrationId
      )
      // Decrement seats (guarded)
      await db.$executeRawUnsafe(
        `UPDATE "${schemaName}".events
         SET seats_registered = GREATEST(0, seats_registered - 1), updated_at = NOW()
         WHERE id = $1`,
        eventId
      )
      await db.$executeRawUnsafe('COMMIT')
    } catch (e) {
      await db.$executeRawUnsafe('ROLLBACK')
      throw e
    }

    // Fire Inngest for cancellation confirmation + auto-promotion
    await inngest.send({
      name: 'event/registration.cancelled' as never,
      data: { registrationId, clinicId },
      id: `${registrationId}:cancelled`,
    })

    await writeAuditLog({
      clinicId,
      userId,
      action: 'REGISTRANT_REMOVED',
      resourceType: 'event_registration',
      resourceId: registrationId,
      metadata: { eventId },
    })

    return NextResponse.json({ data: { registration: { id: registrationId, status: 'cancelled' } } })
  }

  return NextResponse.json({ error: { code: 'INVALID_ACTION' } }, { status: 400 })
}
