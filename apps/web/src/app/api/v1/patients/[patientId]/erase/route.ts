import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { UserRole } from '@prisma/client'

/**
 * POST /api/v1/patients/[patientId]/erase
 * Owner-only. Anonymises patient PII in compliance with DPDP Act 2023.
 * Appointment records are retained for audit purposes (referential integrity).
 * Erasure is irreversible.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if ((session.user.role as UserRole) !== 'OWNER') {
    return NextResponse.json(
      { error: 'Only clinic owners can erase patient data.' },
      { status: 403 }
    )
  }

  const { patientId } = await params
  const clinicId = session.user.clinicId
  const schemaName = `clinic_${clinicId}`

  // Verify patient exists in this clinic
  const patientRows = await db.$queryRawUnsafe<{ id: string; name: string; phone: string | null }[]>(
    `SELECT id, name, phone FROM "${schemaName}".patients WHERE id = $1::uuid LIMIT 1`,
    patientId
  )

  const patient = patientRows[0]
  if (!patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
  }

  // Execute erasure transaction atomically
  await db.$transaction(async (tx) => {
    // 1. Anonymise patient PII
    await tx.$executeRawUnsafe(
      `UPDATE "${schemaName}".patients
       SET name = 'Deleted Patient',
           phone = NULL,
           dob = NULL,
           gender = NULL,
           reason_for_first_visit = NULL
       WHERE id = $1::uuid`,
      patientId
    )

    // 2. Redact all visit notes for this patient's appointments
    await tx.$executeRawUnsafe(
      `UPDATE "${schemaName}".visit_notes
       SET note = '[deleted per erasure request]', updated_at = NOW()
       WHERE appointment_id IN (
         SELECT id FROM "${schemaName}".appointments
         WHERE patient_id = $1::uuid
       )`,
      patientId
    )

    // 3. Write immutable audit log (inside transaction — rolls back on failure)
    await tx.$executeRaw`
      INSERT INTO audit.audit_logs (clinic_id, user_id, action, resource_type, resource_id, metadata)
      VALUES (
        ${clinicId}::uuid,
        ${session.user.id}::uuid,
        'ERASE_PATIENT',
        'patient',
        ${patientId},
        ${JSON.stringify({ reason: 'DPDP Act erasure request', actorRole: session.user.role })}::jsonb
      )
    `
  })

  return NextResponse.json({ erased: true, patientId })
}
