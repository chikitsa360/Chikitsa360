import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const PLAN_DOCTOR_LIMITS: Record<string, number> = {
  STARTER: 1,
  GROWTH: 3,
  PRO: 10,
}

const doctorSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().regex(/^\d{10}$/),
  speciality: z.string().optional(),
  defaultFee: z.number().positive().optional().nullable(),
})

const doctorsArraySchema = z.array(doctorSchema).min(1)

export async function GET() {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clinicId = session.user.clinicId
  const schemaName = `clinic_${clinicId}`

  const doctors = await db.$queryRawUnsafe<{
    id: string
    user_id: string
    name: string
    speciality: string | null
    default_fee: string | null
    created_at: Date
  }[]>(
    `SELECT * FROM "${schemaName}".doctors ORDER BY name ASC`
  )

  return NextResponse.json(doctors)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = doctorsArraySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  // Check plan limit
  const clinic = await db.clinic.findUnique({
    where: { id: session.user.clinicId },
    select: { plan: true },
  })
  const limit = PLAN_DOCTOR_LIMITS[clinic?.plan ?? 'STARTER'] ?? 1
  if (parsed.data.length > limit) {
    return NextResponse.json(
      { error: `${clinic?.plan} plan supports ${limit} Doctor(s). Upgrade to add more.`, limit },
      { status: 403 }
    )
  }

  const clinicId = session.user.clinicId
  const schemaName = `clinic_${clinicId}`
  const createdDoctors: { id: string; name: string }[] = []

  try {
    for (const doc of parsed.data) {
      // Ensure user exists or create placeholder
      let user = await db.user.findUnique({ where: { phone: doc.phone } })
      if (!user) {
        user = await db.user.create({
          data: {
            phone: doc.phone,
            name: doc.name,
            role: 'DOCTOR',
            clinicId,
          },
        })
      }

      // Create doctor record in tenant schema
      const result = await db.$queryRawUnsafe<{ id: string; name: string }[]>(
        `INSERT INTO "${schemaName}".doctors (user_id, name, speciality, default_fee)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name`,
        user.id,
        doc.name,
        doc.speciality ?? null,
        doc.defaultFee ?? null,
      )
      const created = result[0]
      if (created) createdDoctors.push(created)

      // Create StaffInvite — non-fatal, table may not exist on all deployments
      try {
        const inviteToken = crypto.randomUUID()
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        await db.staffInvite.create({
          data: {
            clinicId,
            phone: doc.phone,
            role: 'DOCTOR',
            token: inviteToken,
            expiresAt,
          },
        })
      } catch (inviteErr) {
        console.error('[doctors] StaffInvite creation failed (non-fatal):', inviteErr)
      }
    }

    // Advance onboarding step
    await db.clinic.update({
      where: { id: clinicId },
      data: { onboardingStep: 3 },
    })

    return NextResponse.json(createdDoctors, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[doctors] POST failed:', message)
    return NextResponse.json({ error: 'Failed to create doctors', detail: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const updateSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(100),
    speciality: z.string().optional(),
    defaultFee: z.number().positive().optional().nullable(),
  })

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  const schemaName = `clinic_${session.user.clinicId}`
  const result = await db.$queryRawUnsafe<{ id: string; name: string }[]>(
    `UPDATE "${schemaName}".doctors SET name = $1, speciality = $2, default_fee = $3 WHERE id = $4::uuid RETURNING id, name`,
    parsed.data.name,
    parsed.data.speciality ?? null,
    parsed.data.defaultFee ?? null,
    parsed.data.id,
  )

  if (result.length === 0) {
    return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
  }

  return NextResponse.json(result[0])
}
