import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/v1/reports/patient-growth?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Owner-only. Returns new vs returning patient counts + growth by period.
 *
 * New patient: first ever appointment at this clinic falls within [from, to]
 * Returning: first appointment was before `from` and they have an appointment in [from, to]
 * Grouping: weekly if range ≤ 60 days, monthly if > 60 days
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

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to date parameters are required' }, { status: 400 })
  }

  const schema = `clinic_${session.user.clinicId}`

  // New vs returning summary
  const [summary] = await db.$queryRawUnsafe<{
    new_patients: string
    returning_patients: string
    total_unique: string
  }[]>(
    `WITH patient_stats AS (
       SELECT
         patient_id,
         MIN(appointment_date) AS first_apt,
         bool_or(appointment_date BETWEEN $1::date AND $2::date) AS has_apt_in_range
       FROM "${schema}".appointments
       WHERE is_sample = false
         AND status != 'cancelled'
       GROUP BY patient_id
     )
     SELECT
       COUNT(*) FILTER (WHERE first_apt >= $1::date AND has_apt_in_range)::text AS new_patients,
       COUNT(*) FILTER (WHERE first_apt < $1::date AND has_apt_in_range)::text AS returning_patients,
       COUNT(*) FILTER (WHERE has_apt_in_range)::text AS total_unique
     FROM patient_stats`,
    from, to
  )

  const newPatients = parseInt(summary?.new_patients ?? '0')
  const returningPatients = parseInt(summary?.returning_patients ?? '0')
  const totalUnique = parseInt(summary?.total_unique ?? '0')

  const newPct = totalUnique > 0 ? ((newPatients / totalUnique) * 100).toFixed(1) : '0'
  const returningPct = totalUnique > 0 ? ((returningPatients / totalUnique) * 100).toFixed(1) : '0'

  // Determine grouping
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const rangeDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
  const groupByMonth = rangeDays > 60

  // Growth by period — new patients only (first appointment in period)
  let byPeriod: { period: string; newPatients: number }[] = []

  if (!groupByMonth) {
    const rows = await db.$queryRawUnsafe<{ period: string; count: string }[]>(
      `WITH patient_first AS (
         SELECT patient_id, MIN(appointment_date) AS first_apt
         FROM "${schema}".appointments
         WHERE is_sample = false AND status != 'cancelled'
         GROUP BY patient_id
       )
       SELECT
         DATE_TRUNC('week', first_apt)::date::text AS period,
         COUNT(*)::text AS count
       FROM patient_first
       WHERE first_apt BETWEEN $1::date AND $2::date
       GROUP BY DATE_TRUNC('week', first_apt)
       ORDER BY DATE_TRUNC('week', first_apt) ASC`,
      from, to
    )
    byPeriod = rows.map((r) => ({ period: r.period, newPatients: parseInt(r.count) }))
  } else {
    const rows = await db.$queryRawUnsafe<{ period: string; count: string }[]>(
      `WITH patient_first AS (
         SELECT patient_id, MIN(appointment_date) AS first_apt
         FROM "${schema}".appointments
         WHERE is_sample = false AND status != 'cancelled'
         GROUP BY patient_id
       )
       SELECT
         TO_CHAR(DATE_TRUNC('month', first_apt), 'YYYY-MM-01') AS period,
         COUNT(*)::text AS count
       FROM patient_first
       WHERE first_apt BETWEEN $1::date AND $2::date
       GROUP BY DATE_TRUNC('month', first_apt)
       ORDER BY DATE_TRUNC('month', first_apt) ASC`,
      from, to
    )
    byPeriod = rows.map((r) => ({ period: r.period, newPatients: parseInt(r.count) }))
  }

  return NextResponse.json({
    summary: { newPatients, returningPatients, totalUnique, newPct, returningPct },
    byPeriod,
    groupedByMonth: groupByMonth,
  })
}
