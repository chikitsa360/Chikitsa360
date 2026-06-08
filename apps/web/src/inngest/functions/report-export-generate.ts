import { inngest } from '@/lib/inngest'
import { db } from '@/lib/db'
import {
  generateCsv,
  appointmentsToCsvRows,
  revenueToCsvRows,
  patientGrowthToCsvRows,
} from '@/lib/reports/csv-export'

/**
 * Async report export job (FR-45b, Story 10.3).
 * Triggered by `report/export.generate` for date ranges > 90 days.
 * Runs the report query, generates CSV (UTF-8 BOM), stores in ExportJob.csvData.
 */
export const reportExportGenerate = inngest.createFunction(
  {
    id: 'report-export-generate',
    name: 'Report: Generate Async Export',
    retries: 2,
  },
  { event: 'report/export.generate' },
  async ({ event }) => {
    const { jobId, clinicId, reportType, from, to, doctorId } = event.data as {
      jobId: string
      clinicId: string
      reportType: 'appointments' | 'revenue' | 'patients'
      from: string
      to: string
      doctorId: string | null
    }

    const schema = `clinic_${clinicId}`
    const doctorFilter = doctorId ? `AND a.doctor_id = $3::uuid` : ''
    const params = doctorId ? [from, to, doctorId] : [from, to]

    let csv = ''

    try {
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
        const fromDate = new Date(from)
        const toDate = new Date(to)
        const days = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
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
      }

      await db.exportJob.update({
        where: { id: jobId },
        data: { status: 'complete', csvData: csv },
      })

      return { success: true, jobId }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      await db.exportJob.update({
        where: { id: jobId },
        data: { status: 'failed', errorMessage: message },
      })
      throw err // Re-throw for Inngest retry
    }
  }
)
