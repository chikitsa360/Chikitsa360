export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { computeSlotCount } from '@/lib/slots'

/**
 * GET /api/v1/reports/utilisation?from=YYYY-MM-DD&to=YYYY-MM-DD&doctorId=optional
 * Owner-only. Returns doctor slot utilisation for the date range.
 * Available slots computed from current working_hours config.
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const doctorId = searchParams.get('doctorId') ?? null

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to date parameters are required' }, { status: 400 })
  }

  const schema = `clinic_${session.user.clinicId}`
  const doctorFilter = doctorId ? `WHERE d.id = $1::uuid` : ''
  const doctorParams = doctorId ? [doctorId] : []

  // Get doctors
  const doctors = await db.$queryRawUnsafe<{ id: string; name: string }[]>(
    `SELECT id, name FROM "${schema}".doctors ${doctorFilter} ORDER BY name ASC`,
    ...doctorParams
  )

  if (doctors.length === 0) {
    return NextResponse.json({ byDoctor: [], clinicAvgPct: '0' })
  }

  // Get working hours for all doctors
  const doctorIds = doctors.map((d) => d.id)
  const whRows = await db.$queryRawUnsafe<{
    doctor_id: string
    day_of_week: number
    start_time: string
    end_time: string
    slot_duration: number
    lunch_start_time: string | null
    lunch_end_time: string | null
    is_active: boolean
  }[]>(
    `SELECT doctor_id, day_of_week, start_time::text, end_time::text,
            slot_duration, lunch_start_time::text, lunch_end_time::text, is_active
     FROM "${schema}".working_hours
     WHERE doctor_id = ANY($1::uuid[])`,
    doctorIds
  )

  // Count days in range per day_of_week (0=Sun...6=Sat)
  const dowCounts: Record<number, number> = {}
  const fromDate = new Date(from + 'T00:00:00Z')
  const toDate = new Date(to + 'T00:00:00Z')
  for (let d = new Date(fromDate); d <= toDate; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay()
    dowCounts[dow] = (dowCounts[dow] ?? 0) + 1
  }

  // Compute available slots per doctor
  const availableByDoctor: Record<string, number> = {}
  for (const wh of whRows) {
    if (!wh.is_active) continue
    const slotsPerDay = computeSlotCount(
      wh.start_time,
      wh.end_time,
      wh.slot_duration,
      wh.lunch_start_time ?? undefined,
      wh.lunch_end_time ?? undefined,
    )
    const daysCount = dowCounts[wh.day_of_week] ?? 0
    availableByDoctor[wh.doctor_id] = (availableByDoctor[wh.doctor_id] ?? 0) + slotsPerDay * daysCount
  }

  // Get used slots (non-cancelled appointments)
  const usedRows = await db.$queryRawUnsafe<{ doctor_id: string; used: string }[]>(
    `SELECT doctor_id, COUNT(*)::text AS used
     FROM "${schema}".appointments
     WHERE appointment_date >= $1::date
       AND appointment_date <= $2::date
       AND status != 'cancelled'
       AND is_sample = false
       AND doctor_id = ANY($3::uuid[])
     GROUP BY doctor_id`,
    from, to, doctorIds
  )
  const usedByDoctor: Record<string, number> = {}
  for (const r of usedRows) {
    usedByDoctor[r.doctor_id] = parseInt(r.used)
  }

  // Build result
  const byDoctor = doctors.map((doc) => {
    const available = availableByDoctor[doc.id] ?? 0
    const used = usedByDoctor[doc.id] ?? 0
    const pct = available > 0 ? ((used / available) * 100).toFixed(1) : null
    return {
      doctorId: doc.id,
      doctorName: doc.name,
      availableSlots: available,
      usedSlots: used,
      utilisationPct: pct,
    }
  })

  // Clinic average
  const totalAvailable = byDoctor.reduce((s, d) => s + d.availableSlots, 0)
  const totalUsed = byDoctor.reduce((s, d) => s + d.usedSlots, 0)
  const clinicAvgPct = totalAvailable > 0 ? ((totalUsed / totalAvailable) * 100).toFixed(1) : '0'

  return NextResponse.json({ byDoctor, clinicAvgPct })
}
