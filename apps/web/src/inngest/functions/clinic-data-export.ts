import { inngest } from '@/lib/inngest'
import { db } from '@/lib/db'
import { generateCsv } from '@/lib/reports/csv-export'
import JSZip from 'jszip'

/**
 * Clinic Data Export job (CR-13, Story 11.3).
 * Triggered by `clinic/data-export.generate`.
 * Queries all tenant data, builds a ZIP with 3 CSV files, stores as base64 in ExportJob.
 */
export const clinicDataExport = inngest.createFunction(
  {
    id: 'clinic-data-export',
    name: 'Clinic: Generate Data Export ZIP',
    retries: 2,
  },
  { event: 'clinic/data-export.generate' },
  async ({ event }) => {
    const { jobId, clinicId } = event.data as {
      jobId: string
      clinicId: string
      requestedBy: string
    }

    const schema = `clinic_${clinicId}`

    try {
      // 1. Query all tenant data
      const [patients, appointments, slotBlocks] = await Promise.all([
        db.$queryRawUnsafe<{
          id: string
          name: string
          phone: string | null
          dob: string | null
          gender: string | null
          reason_for_first_visit: string | null
          booking_source: string
          created_at: string
        }[]>(
          `SELECT id, name, phone, dob, gender, reason_for_first_visit, booking_source, created_at::text
           FROM "${schema}".patients
           ORDER BY created_at ASC`
        ),

        db.$queryRawUnsafe<{
          id: string
          patient_id: string
          patient_name: string
          patient_phone: string | null
          doctor_id: string
          doctor_name: string
          appointment_date: string
          appointment_time: string | null
          status: string
          booking_source: string
          token_number: number | null
          consultation_fee: number | null
          payment_status: string
          visit_note: string | null
          created_at: string
          cancelled_at: string | null
        }[]>(
          `SELECT
             a.id, a.patient_id, p.name AS patient_name, p.phone AS patient_phone,
             a.doctor_id, d.name AS doctor_name,
             a.appointment_date::text, a.appointment_time::text,
             a.status, a.booking_source, a.token_number,
             a.consultation_fee, COALESCE(a.payment_status, 'unpaid') AS payment_status,
             vn.note AS visit_note,
             a.created_at::text, a.cancelled_at::text
           FROM "${schema}".appointments a
           JOIN "${schema}".patients p ON p.id = a.patient_id
           JOIN "${schema}".doctors d ON d.id = a.doctor_id
           LEFT JOIN "${schema}".visit_notes vn ON vn.appointment_id = a.id
           ORDER BY a.appointment_date ASC, a.appointment_time ASC NULLS LAST`
        ),

        db.$queryRawUnsafe<{
          id: string
          doctor_id: string
          date: string
          start_time: string
          end_time: string
          recurrence: string
          reason: string | null
          created_at: string
        }[]>(
          `SELECT id, doctor_id, date::text, start_time::text, end_time::text,
                  recurrence, reason, created_at::text
           FROM "${schema}".slot_blocks
           ORDER BY date ASC, start_time ASC`
        ).catch(() => [] as never[]), // gracefully handle if table missing
      ])

      // 2. Generate CSV files (UTF-8 BOM)
      const patientsCsv = generateCsv(
        patients.map((p) => ({
          id: p.id,
          name: p.name,
          phone: p.phone ?? '',
          dob: p.dob ?? '',
          gender: p.gender ?? '',
          reason_for_first_visit: p.reason_for_first_visit ?? '',
          booking_source: p.booking_source,
          created_at: p.created_at,
        }))
      )

      const appointmentsCsv = generateCsv(
        appointments.map((a) => ({
          id: a.id,
          patient_id: a.patient_id,
          patient_name: a.patient_name,
          patient_phone: a.patient_phone ?? '',
          doctor_id: a.doctor_id,
          doctor_name: a.doctor_name,
          appointment_date: a.appointment_date,
          appointment_time: a.appointment_time ?? '',
          status: a.status,
          booking_source: a.booking_source,
          token_number: a.token_number ?? '',
          consultation_fee: a.consultation_fee ?? '',
          payment_status: a.payment_status,
          visit_note: a.visit_note ?? '',
          created_at: a.created_at,
          cancelled_at: a.cancelled_at ?? '',
        }))
      )

      const slotBlocksCsv = generateCsv(
        slotBlocks.map((sb) => ({
          id: sb.id,
          doctor_id: sb.doctor_id,
          date: sb.date,
          start_time: sb.start_time,
          end_time: sb.end_time,
          recurrence: sb.recurrence,
          reason: sb.reason ?? '',
          created_at: sb.created_at,
        }))
      )

      // 3. Build ZIP
      const zip = new JSZip()
      zip.file('patients.csv', patientsCsv)
      zip.file('appointments.csv', appointmentsCsv)
      zip.file('slot_blocks.csv', slotBlocksCsv)

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
      const zipBase64 = zipBuffer.toString('base64')

      // 4. Update export job with ZIP data
      const downloadUrl = `/api/v1/clinics/${clinicId}/export/download?jobId=${jobId}`
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000)

      await db.exportJob.update({
        where: { id: jobId },
        data: { status: 'complete', csvData: zipBase64 },
      })

      // 5. Store download URL on clinic
      await db.clinic.update({
        where: { id: clinicId },
        data: {
          lastExportUrl: downloadUrl,
          lastExportExpiresAt: expiresAt,
        },
      })

      return { success: true, jobId, downloadUrl }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      await db.exportJob.update({
        where: { id: jobId },
        data: { status: 'failed', errorMessage: message },
      }).catch(() => null)
      throw err // Re-throw for Inngest retry
    }
  }
)
