import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export interface UpcomingAppointment {
  id: string
  token: number | null
  patientName: string
  doctorName: string
  time: string
  source: string
  isOverdue: boolean
}

export interface DashboardTodayData {
  total: number
  completed: number
  remaining: number
  noShows: number
  newPatients: number
  returning: number
  revenue: number | null
  pending: number
  upcoming: UpcomingAppointment[]
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clinicId = session.user.clinicId
  const schema = `clinic_${clinicId}`

  // Main aggregates for today (IST)
  const [agg] = await db.$queryRawUnsafe<{
    total: string
    completed: string
    remaining: string
    no_shows: string
    new_patients: string
    returning_patients: string
  }[]>(`
    WITH today_date AS (
      SELECT (NOW() AT TIME ZONE 'Asia/Kolkata')::date AS d,
             (NOW() AT TIME ZONE 'Asia/Kolkata')::time AS t
    ),
    patient_first AS (
      SELECT patient_id, MIN(appointment_date) AS first_date
      FROM "${schema}".appointments
      WHERE status != 'cancelled' AND is_sample = false
      GROUP BY patient_id
    )
    SELECT
      COUNT(*) FILTER (WHERE a.status != 'cancelled' AND a.is_sample = false)                          AS total,
      COUNT(*) FILTER (WHERE a.status = 'completed'  AND a.is_sample = false)                          AS completed,
      COUNT(*) FILTER (WHERE a.status = 'confirmed'  AND a.is_sample = false
                         AND a.appointment_time > (SELECT t FROM today_date))                           AS remaining,
      COUNT(*) FILTER (WHERE a.status = 'no-show'    AND a.is_sample = false)                          AS no_shows,
      COUNT(DISTINCT a.patient_id) FILTER (WHERE pf.first_date = (SELECT d FROM today_date))           AS new_patients,
      COUNT(DISTINCT a.patient_id) FILTER (WHERE pf.first_date < (SELECT d FROM today_date))           AS returning_patients
    FROM "${schema}".appointments a
    LEFT JOIN patient_first pf ON pf.patient_id = a.patient_id
    WHERE a.appointment_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
  `)

  // Revenue aggregates — graceful fallback when Epic 9 columns don't exist yet
  let revenue: number | null = null
  let pending = 0
  try {
    const revRows = await db.$queryRawUnsafe<{ revenue: string | null; pending: string }[]>(`
      SELECT
        SUM(consultation_fee) FILTER (WHERE payment_status = 'paid' AND is_sample = false)             AS revenue,
        COUNT(*) FILTER (WHERE payment_status = 'unpaid' AND status IN ('confirmed','completed')
                           AND is_sample = false)                                                       AS pending
      FROM "${schema}".appointments
      WHERE appointment_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
    `)
    const rev = revRows[0]
    revenue = rev?.revenue != null ? parseFloat(rev.revenue) : null
    pending = rev ? parseInt(rev.pending) : 0
  } catch {
    // Epic 9 columns not yet present — graceful degradation
  }

  // Next 5 confirmed appointments today (including overdue)
  const rows = await db.$queryRawUnsafe<{
    id: string
    token_number: number | null
    patient_name: string
    doctor_name: string
    appointment_time: string
    booking_source: string
    is_overdue: boolean
  }[]>(`
    SELECT
      a.id,
      a.token_number,
      p.name AS patient_name,
      d.name AS doctor_name,
      a.appointment_time::text AS appointment_time,
      a.booking_source,
      (a.appointment_time < (NOW() AT TIME ZONE 'Asia/Kolkata')::time) AS is_overdue
    FROM "${schema}".appointments a
    JOIN "${schema}".patients p ON p.id = a.patient_id
    JOIN "${schema}".doctors d ON d.id = a.doctor_id
    WHERE a.appointment_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
      AND a.status = 'confirmed'
      AND a.is_sample = false
    ORDER BY a.appointment_time ASC
    LIMIT 5
  `)

  const data: DashboardTodayData = {
    total: parseInt(agg?.total ?? '0'),
    completed: parseInt(agg?.completed ?? '0'),
    remaining: parseInt(agg?.remaining ?? '0'),
    noShows: parseInt(agg?.no_shows ?? '0'),
    newPatients: parseInt(agg?.new_patients ?? '0'),
    returning: parseInt(agg?.returning_patients ?? '0'),
    revenue,
    pending,
    upcoming: rows.map((r) => ({
      id: r.id,
      token: r.token_number,
      patientName: r.patient_name,
      doctorName: r.doctor_name,
      time: r.appointment_time,
      source: r.booking_source,
      isOverdue: r.is_overdue,
    })),
  }

  return NextResponse.json(data)
}
