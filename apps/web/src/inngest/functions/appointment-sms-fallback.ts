import { inngest } from '@/lib/inngest'
import { db } from '@/lib/db'
import { sendSms } from '@/lib/sms/msg91'
import { buildSmsMessage } from '@/lib/notifications/build-confirmation-message'
import type { Lang } from '@/lib/whatsapp/templates'

/**
 * SMS fallback for failed WhatsApp delivery (Story 3.4).
 * Sends via MSG91 and logs result to appointment.delivery_failures.
 */
export const appointmentSmsFallback = inngest.createFunction(
  { id: 'appointment-sms-fallback', name: 'Appointment: SMS Fallback' },
  { event: 'appointment/sms-fallback.send' },
  async ({ event }) => {
    const { appointmentId, clinicId } = event.data
    const schemaName = `clinic_${clinicId}`

    // Load appointment details
    const aptRows = await db.$queryRawUnsafe<{
      token_number: number | null
      appointment_date: string
      patient_id: string
      doctor_id: string
      slot_id: string | null
    }[]>(
      `SELECT token_number, appointment_date::text, patient_id, doctor_id, slot_id
       FROM "${schemaName}".appointments WHERE id = $1::uuid LIMIT 1`,
      appointmentId
    )
    const apt = aptRows[0]
    if (!apt) return { sent: false, reason: 'appointment_not_found' }

    const patientRows = await db.$queryRawUnsafe<{ name: string; phone: string }[]>(
      `SELECT name, phone FROM "${schemaName}".patients WHERE id = $1::uuid LIMIT 1`,
      apt.patient_id
    )
    const patient = patientRows[0]
    if (!patient) return { sent: false, reason: 'patient_not_found' }

    const doctorRows = await db.$queryRawUnsafe<{ name: string }[]>(
      `SELECT name FROM "${schemaName}".doctors WHERE id = $1::uuid LIMIT 1`,
      apt.doctor_id
    )
    const doctor = doctorRows[0]

    let startTime = '00:00'
    if (apt.slot_id) {
      const slotRows = await db.$queryRawUnsafe<{ start_time: string }[]>(
        `SELECT start_time::text FROM "${schemaName}".slots WHERE id = $1::uuid LIMIT 1`,
        apt.slot_id
      )
      startTime = slotRows[0]?.start_time ?? '00:00'
    }

    const clinic = await db.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true, address: true, language: true },
    })

    const lang = (clinic?.language ?? 'en') as Lang

    const smsBody = buildSmsMessage({
      patientFirstName: patient.name.split(' ')[0] ?? patient.name,
      tokenNumber: apt.token_number ?? 0,
      doctorName: doctor?.name ?? 'Doctor',
      date: apt.appointment_date,
      startTime,
      clinicName: clinic?.name ?? '',
      address: clinic?.address ?? null,
      language: lang,
    })

    const result = await sendSms(patient.phone, smsBody)

    if (!result.success) {
      // Log SMS failure to appointment record
      await db.$executeRawUnsafe(
        `UPDATE "${schemaName}".appointments
         SET delivery_failures = COALESCE(delivery_failures, '[]'::jsonb) || $1::jsonb,
             updated_at = NOW()
         WHERE id = $2::uuid`,
        JSON.stringify([{ channel: 'sms', failedAt: new Date().toISOString(), reason: result.error }]),
        appointmentId
      )
    }

    return { sent: result.success, error: result.error }
  }
)
