export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/v1/reports/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD&doctorId=optional
 * Owner-only. Returns revenue summary, per-doctor breakdown, and daily/weekly revenue.
 * Gracefully returns revenueUnavailable=true if consultation_fee/payment_status columns
 * are absent on older tenant schemas (Epic 9 not yet applied).
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const isOwner = session.user.role === 'OWNER'
  const isDoctor = session.user.role === 'DOCTOR'

  if (!isOwner && !isDoctor) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  let doctorId = searchParams.get('doctorId') ?? null

  // Doctors can only see their own revenue — look up their doctor record
  if (isDoctor) {
    const schema = `clinic_${session.user.clinicId}`
    const doctorRows = await db.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "${schema}".doctors WHERE user_id = $1::uuid LIMIT 1`,
      session.user.id
    )
    const ownDoctorId = doctorRows[0]?.id
    if (!ownDoctorId) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 })
    }
    doctorId = ownDoctorId // force filter — doctors cannot see other doctors' revenue
  }

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to date parameters are required' }, { status: 400 })
  }

  const schema = `clinic_${session.user.clinicId}`
  const doctorFilter = doctorId ? `AND a.doctor_id = $3::uuid` : ''
  const params = doctorId ? [from, to, doctorId] : [from, to]

  // Compute date range grouping outside the try block
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const rangeDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
  const groupByWeek = rangeDays > 30

  let revenueUnavailable = false
  let totalRevenue = 0
  let totalPending = 0
  let paidCount = 0
  let avgFee: number | null = null
  let byDoctor: { doctorId: string; doctorName: string; totalRevenue: number; paidCount: number; avgFee: number | null }[] = []
  let byDay: { period: string; revenue: number; paidCount: number }[] = []

  try {
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

    totalRevenue = parseInt(summary?.total_revenue ?? '0')
    totalPending = parseInt(summary?.total_pending ?? '0')
    paidCount = parseInt(summary?.paid_count ?? '0')
    avgFee = summary?.avg_fee != null ? Math.round(parseFloat(summary.avg_fee)) : null

    // Per-doctor breakdown (skip when doctor filter active)
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

    // Daily/weekly revenue chart data
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
  } catch {
    revenueUnavailable = true
  }

  return NextResponse.json({
    summary: { totalRevenue, totalPending, paidCount, avgFee },
    byDoctor,
    byDay,
    groupedByWeek: groupByWeek,
    revenueUnavailable,
  })
}
