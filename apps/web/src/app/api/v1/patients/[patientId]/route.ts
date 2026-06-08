import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { writeAuditLog } from '@/lib/audit'

// ─── GET /api/v1/patients/[patientId] ─────────────────────────────────────────
// Returns full patient detail. 404 for cross-tenant access (CR-12).

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { patientId } = await params
  const clinicId = session.user.clinicId
  const schemaName = `clinic_${clinicId}`

  const rows = await db.$queryRawUnsafe<{
    id: string
    name: string
    phone: string
    dob: string | null
    gender: string | null
    first_visit_reason: string | null
    booking_source: string
    created_at: string
    visit_count: string
    last_visit_date: string | null
    last_doctor_name: string | null
  }[]>(
    `SELECT
       p.id, p.name, p.phone, p.dob::text, p.gender,
       p.first_visit_reason, p.booking_source, p.created_at::text,
       COUNT(a.id)::text AS visit_count,
       MAX(a.appointment_date)::text AS last_visit_date,
       (SELECT d.name FROM "${schemaName}".doctors d
        JOIN "${schemaName}".appointments la ON la.doctor_id = d.id
        WHERE la.patient_id = p.id AND la.status = 'completed'
        ORDER BY la.appointment_date DESC LIMIT 1) AS last_doctor_name
     FROM "${schemaName}".patients p
     LEFT JOIN "${schemaName}".appointments a
       ON a.patient_id = p.id AND a.status != 'cancelled'
     WHERE p.id = $1::uuid
     GROUP BY p.id`,
    patientId
  )

  const patient = rows[0]
  if (!patient) {
    // Return 404 — never 403, so we don't reveal cross-tenant existence
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
  }

  await writeAuditLog({
    clinicId,
    userId: session.user.id,
    action: 'VIEW_PATIENT',
    resourceType: 'patient',
    resourceId: patientId,
  })

  return NextResponse.json({ patient })
}

// ─── PATCH /api/v1/patients/[patientId] ──────────────────────────────────────
// Updates optional profile fields: dob, gender, first_visit_reason.

const patchSchema = z.object({
  dob: z.string().nullable().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).nullable().optional(),
  first_visit_reason: z.string().max(200).nullable().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { patientId } = await params
  const clinicId = session.user.clinicId
  const schemaName = `clinic_${clinicId}`

  const body: unknown = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
  }

  // Verify patient exists in this tenant
  const existing = await db.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "${schemaName}".patients WHERE id = $1::uuid LIMIT 1`,
    patientId
  )
  if (!existing[0]) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
  }

  const { dob, gender, first_visit_reason } = parsed.data

  // Build dynamic update
  const setClauses: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (dob !== undefined) {
    setClauses.push(`dob = $${idx}::date`)
    values.push(dob)
    idx++
  }
  if (gender !== undefined) {
    setClauses.push(`gender = $${idx}`)
    values.push(gender)
    idx++
  }
  if (first_visit_reason !== undefined) {
    setClauses.push(`first_visit_reason = $${idx}`)
    values.push(first_visit_reason)
    idx++
  }

  if (setClauses.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  setClauses.push(`updated_at = NOW()`)
  values.push(patientId)

  await db.$executeRawUnsafe(
    `UPDATE "${schemaName}".patients SET ${setClauses.join(', ')} WHERE id = $${idx}::uuid`,
    ...values
  )

  await writeAuditLog({
    clinicId,
    userId: session.user.id,
    action: 'MODIFY_PATIENT',
    resourceType: 'patient',
    resourceId: patientId,
    metadata: { changedFields: Object.keys(parsed.data) },
  })

  return NextResponse.json({ ok: true })
}
