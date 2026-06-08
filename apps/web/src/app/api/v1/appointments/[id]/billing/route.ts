import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { pusherServer, clinicChannel } from '@/lib/pusher'
import { writeAuditLog } from '@/lib/audit'
import { UserRole } from '@prisma/client'

const patchSchema = z.object({
  consultation_fee: z.number().int().min(0).max(99999).nullable(),
  payment_status: z.enum(['paid', 'unpaid']),
})

/**
 * PATCH /api/v1/appointments/[id]/billing
 * Records/updates consultation fee and payment status.
 * Allowed roles: OWNER, RECEPTIONIST (not DOCTOR — billing is front-desk work).
 * Cancelled appointments are read-only → 422.
 * On fee cleared (null) with paid status → auto-reverts status to unpaid.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = session.user.role as UserRole
  if (role !== 'OWNER' && role !== 'RECEPTIONIST') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: appointmentId } = await params
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

  // Load existing appointment — verify tenant ownership and status
  const rows = await db.$queryRawUnsafe<{
    id: string
    status: string
    consultation_fee: string | null
    payment_status: string
  }[]>(
    `SELECT id, status, consultation_fee::text, payment_status
     FROM "${schemaName}".appointments WHERE id = $1::uuid LIMIT 1`,
    appointmentId
  )

  const appt = rows[0]
  if (!appt) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  }

  // Cancelled appointments cannot be billed
  if (appt.status === 'cancelled') {
    return NextResponse.json(
      { error: 'Cannot bill a cancelled appointment.' },
      { status: 422 }
    )
  }

  let { consultation_fee, payment_status } = parsed.data

  // Business rule: cannot be paid with no fee
  if (consultation_fee === null && payment_status === 'paid') {
    payment_status = 'unpaid'
  }

  const setPaidAt =
    payment_status === 'paid' && appt.payment_status !== 'paid'
      ? 'NOW()'
      : payment_status === 'unpaid'
      ? 'NULL'
      : null // no change to paid_at

  const setPaidAtSql =
    setPaidAt === 'NOW()'
      ? ', paid_at = NOW()'
      : setPaidAt === 'NULL'
      ? ', paid_at = NULL'
      : ''

  await db.$executeRawUnsafe(
    `UPDATE "${schemaName}".appointments
     SET consultation_fee = $1,
         payment_status = $2,
         updated_at = NOW(),
         updated_by = $3::uuid
         ${setPaidAtSql}
     WHERE id = $4::uuid`,
    consultation_fee,
    payment_status,
    userId,
    appointmentId
  )

  // Audit log
  const oldFee = appt.consultation_fee ? parseInt(appt.consultation_fee) : null
  try {
    await writeAuditLog({
      clinicId,
      userId,
      action: 'CREATE_BILLING',
      resourceType: 'appointment',
      resourceId: appointmentId,
      metadata: {
        action: 'billing-update',
        appointmentId,
        consultation_fee,
        payment_status,
        oldFee,
        oldStatus: appt.payment_status,
        actorRole: role,
      },
    })
  } catch { /* non-fatal */ }

  // Tenant audit log
  try {
    await db.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".audit_log
         (action, actor_id, actor_role, resource_type, resource_id, metadata)
       VALUES ('billing-update', $1::uuid, $2, 'appointment', $3::uuid, $4::jsonb)`,
      userId,
      role,
      appointmentId,
      JSON.stringify({ consultation_fee, payment_status, oldFee, oldStatus: appt.payment_status })
    )
  } catch { /* non-fatal */ }

  // Pusher — dashboard revenue card listens to this event
  try {
    await pusherServer.trigger(clinicChannel(clinicId), 'appointment.payment_updated', {
      appointmentId,
      clinicId,
      consultation_fee,
      payment_status,
    })
  } catch { /* non-fatal */ }

  const toastFee = consultation_fee !== null ? `₹${consultation_fee}` : 'fee cleared'
  const toastMsg =
    payment_status === 'paid'
      ? `Payment recorded — ${toastFee} paid.`
      : `Billing saved — ${toastFee}, Unpaid.`

  return NextResponse.json({ ok: true, consultation_fee, payment_status, toast: toastMsg })
}
