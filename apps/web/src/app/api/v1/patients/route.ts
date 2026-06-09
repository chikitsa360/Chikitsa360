import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { writeAuditLog } from '@/lib/audit'

// ─── GET /api/v1/patients ─────────────────────────────────────────────────────
// Returns paginated patient list for the clinic (alphabetical order).

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clinicId = session.user.clinicId
  const schemaName = `clinic_${clinicId}`

  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10)
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10)
  const safeLimit = Math.min(Math.max(limit, 1), 100)
  const offset = (Math.max(page, 1) - 1) * safeLimit

  const [countRows, patients] = await Promise.all([
    db.$queryRawUnsafe<{ total: string }[]>(
      `SELECT COUNT(*)::text AS total FROM "${schemaName}".patients`
    ),
    db.$queryRawUnsafe<{
      id: string
      name: string
      phone: string
      dob: string | null
      gender: string | null
      booking_source: string
      created_at: string
      last_visit_date: string | null
      last_doctor_name: string | null
      visit_count: string
    }[]>(
      `SELECT
         p.id, p.name, p.phone, p.dob::text, p.gender,
         p.booking_source, p.created_at::text,
         MAX(a.appointment_date)::text AS last_visit_date,
         (SELECT d.name FROM "${schemaName}".doctors d
          JOIN "${schemaName}".appointments la ON la.doctor_id = d.id
          WHERE la.patient_id = p.id AND la.status = 'completed'
          ORDER BY la.appointment_date DESC LIMIT 1) AS last_doctor_name,
         COUNT(a.id)::text AS visit_count
       FROM "${schemaName}".patients p
       LEFT JOIN "${schemaName}".appointments a
         ON a.patient_id = p.id AND a.status != 'cancelled'
       GROUP BY p.id
       ORDER BY p.name ASC
       LIMIT $1 OFFSET $2`,
      safeLimit,
      offset
    ),
  ])

  const total = parseInt(countRows[0]?.total ?? '0', 10)

  return NextResponse.json({
    patients,
    pagination: {
      total,
      page,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    },
  })
}

// ─── POST /api/v1/patients ────────────────────────────────────────────────────
// Creates a patient, with phone de-duplication (FR-20).
// Returns existing patient if phone already exists (with duplicate_found: true).

const createPatientSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Must be a 10-digit Indian mobile number'),
  dob: z.string().optional().nullable(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional().nullable(),
  first_visit_reason: z.string().max(200).optional().nullable(),
  force_create: z.boolean().optional().default(false),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clinicId = session.user.clinicId
  const schemaName = `clinic_${clinicId}`

  const body: unknown = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = createPatientSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
  }

  const { name, phone, dob, gender, first_visit_reason, force_create } = parsed.data

  // De-duplication check (FR-20)
  const existing = await db.$queryRawUnsafe<{ id: string; name: string; created_at: string }[]>(
    `SELECT id, name, created_at::text FROM "${schemaName}".patients WHERE phone = $1 LIMIT 1`,
    phone
  )

  if (existing.length > 0 && !force_create) {
    return NextResponse.json({
      duplicate_found: true,
      patient: existing[0],
    }, { status: 200 })
  }

  // Create patient
  const newPatients = await db.$queryRawUnsafe<{ id: string; name: string; phone: string; created_at: string }[]>(
    `INSERT INTO "${schemaName}".patients (name, phone, dob, gender, first_visit_reason, booking_source${force_create && existing.length > 0 ? ', duplicate_flag' : ''})
     VALUES ($1, $2, $3::date, $4, $5, 'portal'${force_create && existing.length > 0 ? ', true' : ''})
     RETURNING id, name, phone, created_at::text`,
    name,
    phone,
    dob ?? null,
    gender ?? null,
    first_visit_reason ?? null
  )

  const patient = newPatients[0]

  await writeAuditLog({
    clinicId,
    userId: session.user.id,
    action: 'MODIFY_PATIENT',
    resourceType: 'patient',
    resourceId: patient?.id,
    metadata: { action: 'create', phone },
  })

  return NextResponse.json({ patient, duplicate_found: false }, { status: 201 })
}
