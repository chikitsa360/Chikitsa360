import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export interface DashboardWeekData {
  total: number
  completed: number
  noShows: number
  noShowPct: string
  revenue: number | null
  pending: number
  newPatients: number
  returning: number
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clinicId = session.user.clinicId
  const schema = `clinic_${clinicId}`

  // Week bounds in IST (Monday–Sunday)
  const [agg] = await db.$queryRawUnsafe<{
    total: string
    completed: string
    no_shows: string
    new_patients: string
    returning_patients: string
  }[]>(`
    WITH ist_now AS (
      SELECT (NOW() AT TIME ZONE 'Asia/Kolkata') AS ts
    ),
    week_range AS (
      SELECT
        date_trunc('week', (SELECT ts FROM ist_now))::date                      AS week_start,
        (date_trunc('week', (SELECT ts FROM ist_now)) + interval '6 days')::date AS week_end
    ),
    patient_first AS (
      SELECT patient_id, MIN(appointment_date) AS first_date
      FROM "${schema}".appointments
      WHERE status != 'cancelled' AND is_sample = false
      GROUP BY patient_id
    )
    SELECT
      COUNT(*) FILTER (WHERE a.status != 'cancelled' AND a.is_sample = false)        AS total,
      COUNT(*) FILTER (WHERE a.status = 'completed'  AND a.is_sample = false)        AS completed,
      COUNT(*) FILTER (WHERE a.status = 'no-show'    AND a.is_sample = false)        AS no_shows,
      COUNT(DISTINCT a.patient_id) FILTER (WHERE pf.first_date BETWEEN (SELECT week_start FROM week_range)
                                             AND (SELECT week_end FROM week_range))   AS new_patients,
      COUNT(DISTINCT a.patient_id) FILTER (WHERE pf.first_date < (SELECT week_start FROM week_range))
                                                                                      AS returning_patients
    FROM "${schema}".appointments a
    LEFT JOIN patient_first pf ON pf.patient_id = a.patient_id
    WHERE a.appointment_date BETWEEN (SELECT week_start FROM week_range)
                                 AND (SELECT week_end FROM week_range)
  `)

  const total = parseInt(agg?.total ?? '0')
  const noShows = parseInt(agg?.no_shows ?? '0')
  const noShowPct = total > 0 ? `${Math.round((noShows / total) * 100)}%` : '—'

  // Revenue — graceful fallback for pre-Epic 9
  let revenue: number | null = null
  let pending = 0
  try {
    const revRows = await db.$queryRawUnsafe<{ revenue: string | null; pending: string }[]>(`
      WITH week_range AS (
        SELECT
          date_trunc('week', (NOW() AT TIME ZONE 'Asia/Kolkata'))::date                      AS week_start,
          (date_trunc('week', (NOW() AT TIME ZONE 'Asia/Kolkata')) + interval '6 days')::date AS week_end
      )
      SELECT
        SUM(consultation_fee) FILTER (WHERE payment_status = 'paid' AND is_sample = false)    AS revenue,
        COUNT(*) FILTER (WHERE payment_status = 'unpaid' AND status IN ('confirmed','completed')
                           AND is_sample = false)                                              AS pending
      FROM "${schema}".appointments
      WHERE appointment_date BETWEEN (SELECT week_start FROM week_range)
                                 AND (SELECT week_end FROM week_range)
    `)
    const rev = revRows[0]
    revenue = rev?.revenue != null ? parseFloat(rev.revenue) : null
    pending = rev ? parseInt(rev.pending) : 0
  } catch {
    // Epic 9 columns not yet present
  }

  const data: DashboardWeekData = {
    total,
    completed: parseInt(agg?.completed ?? '0'),
    noShows,
    noShowPct,
    revenue,
    pending,
    newPatients: parseInt(agg?.new_patients ?? '0'),
    returning: parseInt(agg?.returning_patients ?? '0'),
  }

  return NextResponse.json(data)
}
