import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { canEditVisitNote } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { UserRole } from '@prisma/client'

const patchSchema = z.object({
  note: z.string().min(1).max(500),
})

/**
 * PATCH /api/v1/appointments/[id]/note
 * Saves (upserts) a visit note on a completed appointment.
 * Only DOCTOR and OWNER roles may call this (RBAC: visit-notes:write:own).
 * Returns 403 for RECEPTIONIST, 422 for non-completed appointments.
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
  if (!canEditVisitNote(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: appointmentId } = await params
  const clinicId = session.user.clinicId
  const schemaName = `clinic_${clinicId}`

  // Verify appointment belongs to this clinic and is completed
  const apptRows = await db.$queryRawUnsafe<{
    id: string
    patient_id: string
    status: string
  }[]>(
    `SELECT id, patient_id, status
     FROM "${schemaName}".appointments
     WHERE id = $1::uuid LIMIT 1`,
    appointmentId
  )

  const appt = apptRows[0]
  if (!appt) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  }

  if (appt.status !== 'completed') {
    return NextResponse.json(
      { error: 'Visit notes can only be added to completed appointments.' },
      { status: 422 }
    )
  }

  const body: unknown = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
  }

  const { note } = parsed.data
  // Truncate server-side if somehow exceeded
  const safeNote = note.slice(0, 500)

  // Get existing note for audit log
  const existingNotes = await db.$queryRawUnsafe<{ id: string; note: string }[]>(
    `SELECT id, note FROM "${schemaName}".visit_notes
     WHERE appointment_id = $1::uuid LIMIT 1`,
    appointmentId
  )
  const existingNote = existingNotes[0]

  if (existingNote) {
    // Update
    await db.$executeRawUnsafe(
      `UPDATE "${schemaName}".visit_notes
       SET note = $1, updated_at = NOW()
       WHERE appointment_id = $2::uuid`,
      safeNote,
      appointmentId
    )
  } else {
    // Get doctor_id from appointment
    const doctorRows = await db.$queryRawUnsafe<{ doctor_id: string }[]>(
      `SELECT doctor_id FROM "${schemaName}".appointments WHERE id = $1::uuid`,
      appointmentId
    )
    const doctorId = doctorRows[0]?.doctor_id ?? session.user.id

    await db.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".visit_notes (appointment_id, doctor_id, note)
       VALUES ($1::uuid, $2::uuid, $3)`,
      appointmentId,
      doctorId,
      safeNote
    )
  }

  await writeAuditLog({
    clinicId,
    userId: session.user.id,
    action: 'ADD_VISIT_NOTE',
    resourceType: 'appointment',
    resourceId: appointmentId,
    metadata: {
      patientId: appt.patient_id,
      oldNote: existingNote?.note ?? null,
      newNote: safeNote,
      actorRole: role,
    },
  })

  return NextResponse.json({ ok: true, note: safeNote })
}
