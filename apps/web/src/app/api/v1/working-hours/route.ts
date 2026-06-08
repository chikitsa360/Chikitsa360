import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const workingHourSchema = z.object({
  doctorId: z.string().uuid(),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotDuration: z.number().int().positive(),
  lunchStartTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  lunchEndTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  isActive: z.boolean().default(true),
})

const workingHoursSchema = z.array(workingHourSchema).min(1)

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const doctorId = req.nextUrl.searchParams.get('doctorId')
  const schemaName = `clinic_${session.user.clinicId}`

  const rows = await db.$queryRawUnsafe<{
    id: string
    doctor_id: string
    day_of_week: number
    start_time: string
    end_time: string
    slot_duration: number
    lunch_start_time: string | null
    lunch_end_time: string | null
    is_active: boolean
  }[]>(
    doctorId
      ? `SELECT * FROM "${schemaName}".working_hours WHERE doctor_id = $1 ORDER BY day_of_week ASC`
      : `SELECT * FROM "${schemaName}".working_hours ORDER BY doctor_id, day_of_week ASC`,
    ...(doctorId ? [doctorId] : [])
  )

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = workingHoursSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  const clinicId = session.user.clinicId
  const schemaName = `clinic_${clinicId}`

  // Validate no end time before start time
  for (const wh of parsed.data) {
    const sp = wh.startTime.split(':').map(Number)
    const ep = wh.endTime.split(':').map(Number)
    const sh = sp[0] ?? 0, sm = sp[1] ?? 0
    const eh = ep[0] ?? 0, em = ep[1] ?? 0
    if (eh * 60 + em <= sh * 60 + sm) {
      return NextResponse.json({ error: 'End time must be after start time.' }, { status: 400 })
    }
  }

  // Delete existing entries for these doctors (replace strategy)
  const doctorIds = [...new Set(parsed.data.map((wh) => wh.doctorId))]
  for (const doctorId of doctorIds) {
    await db.$executeRawUnsafe(
      `DELETE FROM "${schemaName}".working_hours WHERE doctor_id = $1`,
      doctorId
    )
  }

  // Insert new entries
  for (const wh of parsed.data) {
    await db.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".working_hours
         (doctor_id, day_of_week, start_time, end_time, slot_duration, lunch_start_time, lunch_end_time, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      wh.doctorId,
      wh.dayOfWeek,
      wh.startTime,
      wh.endTime,
      wh.slotDuration,
      wh.lunchStartTime ?? null,
      wh.lunchEndTime ?? null,
      wh.isActive,
    )
  }

  // Ensure notification_settings defaults exist for this clinic
  await db.$executeRawUnsafe(
    `INSERT INTO "${schemaName}".notification_settings (clinic_id, reminder_24h_enabled, reminder_2h_enabled)
     VALUES ($1, true, true)
     ON CONFLICT DO NOTHING`,
    clinicId,
  )

  // Advance onboarding step
  await db.clinic.update({
    where: { id: clinicId },
    data: { onboardingStep: 4 },
  })

  return NextResponse.json({ ok: true })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = workingHoursSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  const clinicId = session.user.clinicId
  const schemaName = `clinic_${clinicId}`

  for (const wh of parsed.data) {
    const sp = wh.startTime.split(':').map(Number)
    const ep = wh.endTime.split(':').map(Number)
    const sh = sp[0] ?? 0, sm = sp[1] ?? 0
    const eh = ep[0] ?? 0, em = ep[1] ?? 0
    if (eh * 60 + em <= sh * 60 + sm) {
      return NextResponse.json({ error: 'End time must be after start time.' }, { status: 400 })
    }
  }

  const doctorIds = [...new Set(parsed.data.map((wh) => wh.doctorId))]
  for (const doctorId of doctorIds) {
    await db.$executeRawUnsafe(
      `DELETE FROM "${schemaName}".working_hours WHERE doctor_id = $1`,
      doctorId
    )
  }

  for (const wh of parsed.data) {
    await db.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".working_hours
         (doctor_id, day_of_week, start_time, end_time, slot_duration, lunch_start_time, lunch_end_time, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      wh.doctorId,
      wh.dayOfWeek,
      wh.startTime,
      wh.endTime,
      wh.slotDuration,
      wh.lunchStartTime ?? null,
      wh.lunchEndTime ?? null,
      wh.isActive,
    )
  }

  return NextResponse.json({ ok: true, message: 'Working hours updated. Changes take effect from tomorrow.' })
}
