import { inngest } from '@/lib/inngest'
import { db } from '@/lib/db'
import { sendSms } from '@/lib/sms/msg91'
import { buildSmsMessage } from '@/lib/notifications/build-confirmation-message'
import { build24hReminderSms, build2hReminderSms } from '@/lib/notifications/build-reminder-message'
import type { Lang } from '@/lib/whatsapp/templates'

type SmsChannel = 'confirmation' | 'reminder-24h' | 'reminder-2h'

/**
 * SMS fallback for failed/skipped WhatsApp delivery (Story 3.4, Story 7.1).
 * Handles confirmation and both reminder channels.
 * Channel discriminator: 'confirmation' (default) | 'reminder-24h' | 'reminder-2h'
 */
export const appointmentSmsFallback = inngest.createFunction(
  { id: 'appointment-sms-fallback', name: 'Appointment: SMS Fallback' },
  { event: 'appointment/sms-fallback.send' },
  async ({ event }) => {
    const { appointmentId, clinicId, channel = 'confirmation' } = event.data as {
      appointmentId: string
      clinicId: string
      channel?: SmsChannel
    }
    const schemaName = `clinic_${clinicId}`

    // Load appointment details
    const aptRows = await db.$queryRawUnsafe<{
      token_number: number | null
      appointment_date: string
      appointment_time: string | null
      patient_id: string
      doctor_id: string
    }[]>(
      `SELECT token_number, appointment_date::text, appointment_time::text,
              patient_id, doctor_id
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

    // Use appointment_time directly (appointments use time column, not legacy slot_id)
    const startTime = apt.appointment_time ? apt.appointment_time.slice(0, 5) : '00:00'

    const clinic = await db.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true, address: true, language: true },
    })

    const lang = (clinic?.language ?? 'en') as Lang
    const baseDetails = {
      patientFirstName: patient.name.split(' ')[0] ?? patient.name,
      tokenNumber: apt.token_number ?? 0,
      doctorName: doctor?.name ?? 'Doctor',
      date: apt.appointment_date,
      startTime,
      clinicName: clinic?.name ?? '',
      address: clinic?.address ?? null,
      language: lang,
    }

    let smsBody: string
    if (channel === 'reminder-24h') {
      smsBody = build24hReminderSms(baseDetails)
    } else if (channel === 'reminder-2h') {
      smsBody = build2hReminderSms(baseDetails)
    } else {
      smsBody = buildSmsMessage(baseDetails)
    }

    const result = await sendSms(patient.phone, smsBody)

    if (!result.success) {
      await db.$executeRawUnsafe(
        `UPDATE "${schemaName}".appointments
         SET delivery_failures = COALESCE(delivery_failures, '[]'::jsonb) || $1::jsonb,
             updated_at = NOW()
         WHERE id = $2::uuid`,
        JSON.stringify([{ channel: `sms-${channel}`, failedAt: new Date().toISOString(), reason: result.error }]),
        appointmentId
      )
    }

    return { sent: result.success, channel, error: result.error }
  }
)
