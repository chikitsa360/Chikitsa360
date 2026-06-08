import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { writeAuditLog } from '@/lib/audit'
import { UserRole } from '@prisma/client'

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  speciality: z.string().optional().nullable(),
  default_fee: z.number().int().min(0).max(99999).optional().nullable(),
})

/**
 * PATCH /api/v1/doctors/[doctorId]
 * Updates doctor profile fields (name, speciality, default_fee).
 * OWNER only.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ doctorId: string }> }
) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = session.user.role as UserRole
  if (role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { doctorId } = await params
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

  // Load current doctor for audit diff
  const existing = await db.$queryRawUnsafe<{
    id: string
    name: string
    speciality: string | null
    default_fee: string | null
  }[]>(
    `SELECT id, name, speciality, default_fee::text FROM "${schemaName}".doctors WHERE id = $1::uuid LIMIT 1`,
    doctorId
  )

  const doctor = existing[0]
  if (!doctor) {
    return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
  }

  const newName = parsed.data.name ?? doctor.name
  const newSpeciality = 'speciality' in parsed.data ? parsed.data.speciality : doctor.speciality
  const newDefaultFee = 'default_fee' in parsed.data ? parsed.data.default_fee : (doctor.default_fee !== null ? parseInt(doctor.default_fee, 10) : null)

  await db.$executeRawUnsafe(
    `UPDATE "${schemaName}".doctors
     SET name = $1, speciality = $2, default_fee = $3
     WHERE id = $4::uuid`,
    newName,
    newSpeciality,
    newDefaultFee,
    doctorId
  )

  // Audit log for default_fee changes
  if ('default_fee' in parsed.data) {
    const oldFee = doctor.default_fee !== null ? parseInt(doctor.default_fee, 10) : null
    try {
      await writeAuditLog({
        clinicId,
        userId,
        action: 'SETTINGS_CHANGE',
        resourceType: 'doctor',
        resourceId: doctorId,
        metadata: {
          action: 'doctor-settings-change',
          field: 'default_fee',
          oldValue: oldFee,
          newValue: newDefaultFee,
          actorId: userId,
        },
      })
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({
    id: doctorId,
    name: newName,
    speciality: newSpeciality,
    default_fee: newDefaultFee,
  })
}
