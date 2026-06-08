import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { inngest } from '@/lib/inngest'
import { generateCsv, appointmentsToCsvRows, revenueToCsvRows, patientGrowthToCsvRows } from '@/lib/reports/csv-export'

const MAX_SYNC_DAYS = 90

/**
 * POST /api/v1/reports/export
 * Owner-only. Triggers CSV export:
 * - Range ≤ 90 days: generates CSV server-side and returns inline.
 * - Range > 90 days: enqueues Inngest job and returns jobId.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as {
    reportType: 'appointments' | 'revenue' | 'patients'
    from: string
    to: string
    doctorId?: string
  }
  const { reportType, from, to, doctorId } = body

  if (!reportType || !from || !to) {
    return NextResponse.json({ error: 'reportType, from and to are required' }, { status: 400 })
  }

  const fromDate = new Date(from)
  const toDate = new Date(to)
  const rangeDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))

  if (rangeDays > 365) {
    return NextResponse.json({ error: 'Maximum export range is 365 days' }, { status: 400 })
  }

  const clinicId = session.user.clinicId
  const schema = `clinic_${clinicId}`

  // Async path for ranges > 90 days
  if (rangeDays > MAX_SYNC_DAYS) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
    const job = await db.exportJob.create({
      data: {
        clinicId,
        requestedBy: session.user.id!,
        reportType,
        fromDate: from,
        toDate: to,
        doctorId: doctorId ?? null,
        status: 'pending',
        expiresAt,
      },
    })

    await inngest.send({
      name: 'report/export.generate',
      data: { jobId: job.id, clinicId, reportType, from, to, doctorId: doctorId ?? null },
    })

    return NextResponse.json({ async: true, jobId: job.id })
  }

  // Sync path — generate CSV inline
  const doctorFilter = doctorId ? `AND a.doctor_id = $3::uuid` : ''
  const params = doctorId ? [from, to, doctorId] : [from, to]

  // Get clinic slug for filename
  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    select: { slug: true },
  })
  const clinicSlug = clinic?.slug ?? clinicId

  let csv = ''
  const filename = `${reportType}-${clinicSlug}-${from}-${to}.csv`

  if (reportType === 'appointments') {
    const rows = await db.$queryRawUnsafe<{
      appointment_date: string
      appointment_time: string | null
      patient_name: string
      doctor_name: string
      status: string
      booking_source: string
      consultation_fee: number | null
      payment_status: string
    }[]>(
      `SELECT
         a.appointment_date::text,
         a.appointment_time::text,
         p.name AS patient_name,
         d.name AS doctor_name,
         a.status,
         a.booking_source,
         a.consultation_fee,
         a.payment_status
       FROM "${schema}".appointments a
       JOIN "${schema}".patients p ON p.id = a.patient_id
       JOIN "${schema}".doctors d ON d.id = a.doctor_id
       WHERE a.appointment_date >= $1::date
         AND a.appointment_date <= $2::date
         AND a.is_sample = false
         ${doctorFilter}
       ORDER BY a.appointment_date, a.appointment_time`,
      ...params
    )
    csv = generateCsv(appointmentsToCsvRows(rows.map((r) => ({
      date: r.appointment_date,
      time: r.appointment_time,
      patientName: r.patient_name,
      doctorName: r.doctor_name,
      status: r.status,
      bookingSource: r.booking_source,
      consultationFee: r.consultation_fee,
      paymentStatus: r.payment_status,
    }))))
  } else if (reportType === 'revenue') {
    const rows = await db.$queryRawUnsafe<{
      doctor_name: string
      paid_count: string
      total_revenue: string | null
      avg_fee: string | null
    }[]>(
      `SELECT
         d.name AS doctor_name,
         COUNT(*) FILTER (WHERE a.payment_status = 'paid')::text AS paid_count,
         SUM(a.consultation_fee) FILTER (WHERE a.payment_status = 'paid')::text AS total_revenue,
         AVG(a.consultation_fee) FILTER (WHERE a.payment_status = 'paid')::text AS avg_fee
       FROM "${schema}".appointments a
       JOIN "${schema}".doctors d ON d.id = a.doctor_id
       WHERE a.appointment_date >= $1::date
         AND a.appointment_date <= $2::date
         AND a.is_sample = false
         ${doctorFilter}
       GROUP BY d.name
       ORDER BY SUM(a.consultation_fee) FILTER (WHERE a.payment_status = 'paid') DESC NULLS LAST`,
      ...params
    )
    csv = generateCsv(revenueToCsvRows(rows.map((r) => ({
      doctorName: r.doctor_name,
      paidCount: parseInt(r.paid_count),
      totalRevenue: r.total_revenue != null ? parseInt(r.total_revenue) : 0,
      avgFee: r.avg_fee != null ? Math.round(parseFloat(r.avg_fee)) : null,
    }))))
  } else if (reportType === 'patients') {
    const fromDate2 = new Date(from)
    const toDate2 = new Date(to)
    const days = Math.ceil((toDate2.getTime() - fromDate2.getTime()) / (1000 * 60 * 60 * 24))
    const groupedByMonth = days > 60

    const rows = await db.$queryRawUnsafe<{ period: string; count: string }[]>(
      groupedByMonth
        ? `WITH patient_first AS (
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
           ORDER BY DATE_TRUNC('month', first_apt) ASC`
        : `WITH patient_first AS (
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
    csv = generateCsv(patientGrowthToCsvRows(
      rows.map((r) => ({ period: r.period, newPatients: parseInt(r.count) })),
      groupedByMonth
    ))
  } else {
    return NextResponse.json({ error: 'Invalid reportType' }, { status: 400 })
  }

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
