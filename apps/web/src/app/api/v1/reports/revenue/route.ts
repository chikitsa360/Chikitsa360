import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/v1/reports/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD&doctorId=optional
 * Owner-only. Returns revenue summary, per-doctor breakdown, and daily/weekly revenue.
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
  const doctorFilter = doctorId ? `AND a.doctor_id = $3::uuid` : ''
  const params = doctorId ? [from, to, doctorId] : [from, to]

  // Revenue summary
  const [summary] = await db.$queryRawUnsafe<{
    total_revenue: string
    total_pending: string
    paid_count: string
    avg_fee: string | null
  }[]>(
    `SELECT
       COALESCE(SUM(a.consultation_fee) FILTER (WHERE a.payment_status = 'paid'), 0)::text AS total_revenue,
       COUNT(*) FILTER (WHERE a.payment_status = 'unpaid' AND a.consultation_fee IS NOT NULL)::text AS total_pending,
       COUNT(*) FILTER (WHERE a.payment_status = 'paid')::text AS paid_count,
       AVG(a.consultation_fee) FILTER (WHERE a.payment_status = 'paid')::text AS avg_fee
     FROM "${schema}".appointments a
     WHERE a.appointment_date >= $1::date
       AND a.appointment_date <= $2::date
       AND a.is_sample = false
       ${doctorFilter}`,
    ...params
  )

  const totalRevenue = parseInt(summary?.total_revenue ?? '0')
  const totalPending = parseInt(summary?.total_pending ?? '0')
  const paidCount = parseInt(summary?.paid_count ?? '0')
  const avgFee = summary?.avg_fee != null ? Math.round(parseFloat(summary.avg_fee)) : null

  // Per-doctor breakdown (skip when doctor filter active)
  let byDoctor: {
    doctorId: string
    doctorName: string
    totalRevenue: number
    paidCount: number
    avgFee: number | null
  }[] = []

  if (!doctorId) {
    const rows = await db.$queryRawUnsafe<{
      doctor_id: string
      doctor_name: string
      total_revenue: string | null
      paid_count: string
      avg_fee: string | null
    }[]>(
      `SELECT
         a.doctor_id,
         d.name AS doctor_name,
         SUM(a.consultation_fee) FILTER (WHERE a.payment_status = 'paid')::text AS total_revenue,
         COUNT(*) FILTER (WHERE a.payment_status = 'paid')::text AS paid_count,
         AVG(a.consultation_fee) FILTER (WHERE a.payment_status = 'paid')::text AS avg_fee
       FROM "${schema}".appointments a
       JOIN "${schema}".doctors d ON d.id = a.doctor_id
       WHERE a.appointment_date >= $1::date
         AND a.appointment_date <= $2::date
         AND a.is_sample = false
       GROUP BY a.doctor_id, d.name
       ORDER BY SUM(a.consultation_fee) FILTER (WHERE a.payment_status = 'paid') DESC NULLS LAST`,
      from, to
    )

    byDoctor = rows.map((r) => ({
      doctorId: r.doctor_id,
      doctorName: r.doctor_name,
      totalRevenue: r.total_revenue != null ? parseInt(r.total_revenue) : 0,
      paidCount: parseInt(r.paid_count),
      avgFee: r.avg_fee != null ? Math.round(parseFloat(r.avg_fee)) : null,
    }))
  }

  // Daily revenue (group by week if range > 30 days)
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const rangeDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
  const groupByWeek = rangeDays > 30

  let byDay: { period: string; revenue: number; paidCount: number }[] = []

  if (!groupByWeek) {
    const dayRows = await db.$queryRawUnsafe<{
      period: string
      revenue: string
      paid_count: string
    }[]>(
      `SELECT
         a.appointment_date::text AS period,
         COALESCE(SUM(a.consultation_fee) FILTER (WHERE a.payment_status = 'paid'), 0)::text AS revenue,
         COUNT(*) FILTER (WHERE a.payment_status = 'paid')::text AS paid_count
       FROM "${schema}".appointments a
       WHERE a.appointment_date >= $1::date
         AND a.appointment_date <= $2::date
         AND a.is_sample = false
         ${doctorFilter}
       GROUP BY a.appointment_date
       ORDER BY a.appointment_date ASC`,
      ...params
    )
    byDay = dayRows.map((r) => ({
      period: r.period,
      revenue: parseInt(r.revenue),
      paidCount: parseInt(r.paid_count),
    }))
  } else {
    const weekRows = await db.$queryRawUnsafe<{
      period: string
      revenue: string
      paid_count: string
    }[]>(
      `SELECT
         DATE_TRUNC('week', a.appointment_date)::date::text AS period,
         COALESCE(SUM(a.consultation_fee) FILTER (WHERE a.payment_status = 'paid'), 0)::text AS revenue,
         COUNT(*) FILTER (WHERE a.payment_status = 'paid')::text AS paid_count
       FROM "${schema}".appointments a
       WHERE a.appointment_date >= $1::date
         AND a.appointment_date <= $2::date
         AND a.is_sample = false
         ${doctorFilter}
       GROUP BY DATE_TRUNC('week', a.appointment_date)
       ORDER BY DATE_TRUNC('week', a.appointment_date) ASC`,
      ...params
    )
    byDay = weekRows.map((r) => ({
      period: r.period,
      revenue: parseInt(r.revenue),
      paidCount: parseInt(r.paid_count),
    }))
  }

  return NextResponse.json({
    summary: { totalRevenue, totalPending, paidCount, avgFee },
    byDoctor,
    byDay,
    groupedByWeek: groupByWeek,
  })
}
