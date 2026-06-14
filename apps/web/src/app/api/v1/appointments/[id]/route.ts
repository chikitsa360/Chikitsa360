import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { scheduleConfirmation } from '@/lib/notifications/send-confirmation'
import { scheduleReminders } from '@/lib/notifications/schedule-reminders'
import { pusherServer, clinicChannel } from '@/lib/pusher'
import { inngest } from '@/lib/inngest'
import { writeAuditLog } from '@/lib/audit'

// ─── DELETE /api/v1/appointments/[id] ─────────────────────────────────────────
// Deletes sample appointments only (used in onboarding).

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const schemaName = `clinic_${session.user.clinicId}`

  const rows = await db.$queryRawUnsafe<{ id: string; is_sample: boolean }[]>(
    `SELECT id, is_sample FROM "${schemaName}".appointments WHERE id = $1::uuid`,
    id
  )

  const appt = rows[0]
  if (!appt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!appt.is_sample) {
    return NextResponse.json(
      { error: 'Only sample appointments can be deleted via this endpoint' },
      { status: 403 }
    )
  }

  await db.$executeRawUnsafe(
    `DELETE FROM "${schemaName}".appointments WHERE id = $1::uuid AND is_sample = true`,
    id
  )

  return NextResponse.json({ ok: true })
}

// ─── PATCH /api/v1/appointments/[id] ─────────────────────────────────────────
// Reschedule / cancel / mark complete / mark no-show.

const patchSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('reschedule'),
    newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    newTime: z.string().regex(/^\d{2}:\d{2}$/),
  }),
  z.object({
    action: z.literal('cancel'),
  }),
  z.object({
    action: z.literal('mark-complete'),
  }),
  z.object({
    action: z.literal('mark-no-show'),
  }),
])

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const clinicId = session.user.clinicId
  const userId = session.user.id
  const schemaName = `clinic_${clinicId}`

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  // Load existing appointment
  const rows = await db.$queryRawUnsafe<{
    id: string
    status: string
    appointment_date: string
    appointment_time: string | null
    doctor_id: string
    patient_id: string
    is_sample: boolean
  }[]>(
    `SELECT id, status, appointment_date::text, appointment_time::text, doctor_id, patient_id, is_sample
     FROM "${schemaName}".appointments WHERE id = $1::uuid LIMIT 1`,
    id
  )
  const appt = rows[0]
  if (!appt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = parsed.data

  // ── Reschedule ──────────────────────────────────────────────────────────────
  if (data.action === 'reschedule') {
    const { newDate, newTime } = data

    // Prevent re-selecting same slot
    const normalizedOldTime = appt.appointment_time?.slice(0, 5)
    if (appt.appointment_date === newDate && normalizedOldTime === newTime) {
      return NextResponse.json(
        { error: 'New slot must be different from current slot' },
        { status: 400 }
      )
    }

    try {
      await db.$executeRawUnsafe(
        `UPDATE "${schemaName}".appointments
         SET appointment_date = $1::date,
             appointment_time = $2::time,
             updated_at = NOW(),
             updated_by = $3::uuid
         WHERE id = $4::uuid`,
        newDate,
        newTime,
        userId,
        id
      )
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes('unique') || (err as { code?: string }).code === '23505')
      ) {
        return NextResponse.json(
          { error: 'SLOT_TAKEN', message: 'That slot was just taken. Please choose another time.' },
          { status: 409 }
        )
      }
      throw err
    }

    // Re-send confirmation + reschedule reminders with new time
    await scheduleConfirmation(id, clinicId)
    const slotDatetime = new Date(`${newDate}T${newTime}:00+05:30`)
    await scheduleReminders(id, clinicId, slotDatetime)

    // Audit log
    try {
      await writeAuditLog({
        clinicId,
        userId,
        action: 'MODIFY_APPOINTMENT',
        resourceType: 'appointment',
        resourceId: id,
        metadata: {
          action: 'reschedule',
          oldDate: appt.appointment_date,
          oldTime: appt.appointment_time,
          newDate,
          newTime,
          actorRole: session.user.role,
        },
      })
    } catch { /* non-fatal */ }

    // Tenant-level audit log
    try {
      await db.$executeRawUnsafe(
        `INSERT INTO "${schemaName}".audit_log
           (action, actor_id, actor_role, resource_type, resource_id, metadata)
         VALUES ('reschedule', $1::uuid, $2, 'appointment', $3::uuid, $4::jsonb)`,
        userId,
        session.user.role,
        id,
        JSON.stringify({
          oldSlot: { date: appt.appointment_date, time: appt.appointment_time },
          newSlot: { date: newDate, time: newTime },
        })
      )
    } catch { /* non-fatal — table may not exist in dev */ }

    // Pusher event
    try {
      await pusherServer.trigger(clinicChannel(clinicId), 'appointment.updated', {
        appointmentId: id,
        clinicId,
        newDate,
        newTime,
      })
    } catch { /* non-fatal */ }

    return NextResponse.json({ ok: true, newDate, newTime })
  }

  // ── Cancel ──────────────────────────────────────────────────────────────────
  if (data.action === 'cancel') {
    await db.$executeRawUnsafe(
      `UPDATE "${schemaName}".appointments
       SET status = 'cancelled',
           cancelled_at = NOW(),
           cancelled_by = $1::uuid,
           updated_at = NOW()
       WHERE id = $2::uuid`,
      userId,
      id
    )

    // Enqueue cancellation WhatsApp message
    await inngest.send({
      id: `${id}:cancellation`,
      name: 'appointment/cancellation.send',
      data: { appointmentId: id, clinicId },
    }).catch((err: unknown) => {
      console.warn('[inngest] cancellation.send failed (Inngest not running?):', err)
    })

    // Audit
    try {
      await writeAuditLog({
        clinicId,
        userId,
        action: 'CANCEL_APPOINTMENT',
        resourceType: 'appointment',
        resourceId: id,
        metadata: { actorRole: session.user.role },
      })
    } catch { /* non-fatal */ }

    try {
      await db.$executeRawUnsafe(
        `INSERT INTO "${schemaName}".audit_log
           (action, actor_id, actor_role, resource_type, resource_id, metadata)
         VALUES ('cancel', $1::uuid, $2, 'appointment', $3::uuid, $4::jsonb)`,
        userId,
        session.user.role,
        id,
        JSON.stringify({ appointmentDate: appt.appointment_date, appointmentTime: appt.appointment_time })
      )
    } catch { /* non-fatal */ }

    try {
      await pusherServer.trigger(clinicChannel(clinicId), 'appointment.cancelled', {
        appointmentId: id,
        clinicId,
      })
    } catch { /* non-fatal */ }

    return NextResponse.json({ ok: true })
  }

  // ── Mark Complete ──────────────────────────────────────────────────────────
  if (data.action === 'mark-complete') {
    await db.$executeRawUnsafe(
      `UPDATE "${schemaName}".appointments
       SET status = 'completed', updated_at = NOW(), updated_by = $1::uuid
       WHERE id = $2::uuid`,
      userId,
      id
    )

    try {
      await db.$executeRawUnsafe(
        `INSERT INTO "${schemaName}".audit_log
           (action, actor_id, actor_role, resource_type, resource_id, metadata)
         VALUES ('mark-complete', $1::uuid, $2, 'appointment', $3::uuid, null)`,
        userId,
        session.user.role,
        id
      )
    } catch { /* non-fatal */ }

    try {
      await pusherServer.trigger(clinicChannel(clinicId), 'appointment.updated', {
        appointmentId: id,
        clinicId,
        status: 'completed',
      })
    } catch { /* non-fatal */ }

    return NextResponse.json({ ok: true })
  }

  // ── Mark No-Show ────────────────────────────────────────────────────────────
  if (data.action === 'mark-no-show') {
    await db.$executeRawUnsafe(
      `UPDATE "${schemaName}".appointments
       SET status = 'no-show', updated_at = NOW(), updated_by = $1::uuid
       WHERE id = $2::uuid`,
      userId,
      id
    )

    try {
      await db.$executeRawUnsafe(
        `INSERT INTO "${schemaName}".audit_log
           (action, actor_id, actor_role, resource_type, resource_id, metadata)
         VALUES ('mark-no-show', $1::uuid, $2, 'appointment', $3::uuid, null)`,
        userId,
        session.user.role,
        id
      )
    } catch { /* non-fatal */ }

    try {
      await pusherServer.trigger(clinicChannel(clinicId), 'appointment.updated', {
        appointmentId: id,
        clinicId,
        status: 'no-show',
      })
    } catch { /* non-fatal */ }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
