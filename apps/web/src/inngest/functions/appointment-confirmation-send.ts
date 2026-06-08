import { inngest } from '@/lib/inngest'
import { db } from '@/lib/db'
import { redis } from '@/lib/redis'
import { sendText } from '@/lib/whatsapp/message-sender'
import { buildConfirmationMessage } from '@/lib/notifications/build-confirmation-message'
import { waMessageKey } from './whatsapp-status-update'
import type { Lang } from '@/lib/whatsapp/templates'

const MAPPING_TTL = 86400 // 24 hours

/**
 * Sends WhatsApp booking confirmation to the patient (Story 3.4).
 * Idempotency is handled via the event `id: ${appointmentId}:confirmation`.
 * Stores messageId → appointmentId mapping in Redis for delivery status tracking.
 */
export const appointmentConfirmationSend = inngest.createFunction(
  { id: 'appointment-confirmation-send', name: 'Appointment: Send WhatsApp Confirmation' },
  { event: 'appointment/confirmation.send' },
  async ({ event }) => {
    const { appointmentId, clinicId } = event.data
    const schemaName = `clinic_${clinicId}`

    const aptRows = await db.$queryRawUnsafe<{
      token_number: number | null
      appointment_date: string
      is_sample: boolean
      patient_id: string
      doctor_id: string
      slot_id: string | null
    }[]>(
      `SELECT token_number, appointment_date::text, is_sample, patient_id, doctor_id, slot_id
       FROM "${schemaName}".appointments WHERE id = $1::uuid LIMIT 1`,
      appointmentId
    )

    const apt = aptRows[0]
    if (!apt) return { sent: false, reason: 'appointment_not_found' }

    // Skip sample appointments (FR-37)
    if (apt.is_sample) return { sent: false, reason: 'sample_appointment' }

    // Load patient
    const patientRows = await db.$queryRawUnsafe<{
      name: string
      phone: string
      whatsapp_opt_out_at: string | null
    }[]>(
      `SELECT name, phone, whatsapp_opt_out_at FROM "${schemaName}".patients WHERE id = $1::uuid LIMIT 1`,
      apt.patient_id
    )
    const patient = patientRows[0]
    if (!patient) return { sent: false, reason: 'patient_not_found' }

    // Load doctor
    const doctorRows = await db.$queryRawUnsafe<{ name: string }[]>(
      `SELECT name FROM "${schemaName}".doctors WHERE id = $1::uuid LIMIT 1`,
      apt.doctor_id
    )
    const doctor = doctorRows[0]

    // Load slot start time
    let startTime = '00:00'
    if (apt.slot_id) {
      const slotRows = await db.$queryRawUnsafe<{ start_time: string }[]>(
        `SELECT start_time::text FROM "${schemaName}".slots WHERE id = $1::uuid LIMIT 1`,
        apt.slot_id
      )
      startTime = slotRows[0]?.start_time ?? '00:00'
    }

    // Load clinic
    const clinic = await db.clinic.findUnique({
      where: { id: clinicId },
      select: {
        name: true,
        address: true,
        language: true,
        clinicPhone: true,
        whatsappPhoneNumberId: true,
      },
    })
    if (!clinic?.whatsappPhoneNumberId) return { sent: false, reason: 'clinic_not_configured' }

    const lang = (clinic.language ?? 'en') as Lang

    // If patient opted out of WhatsApp, skip WA and try SMS directly
    if (patient.whatsapp_opt_out_at) {
      await inngest.send({
        name: 'appointment/sms-fallback.send',
        data: { appointmentId, clinicId },
      })
      return { sent: false, reason: 'patient_opted_out', smsFallbackScheduled: true }
    }

    const message = buildConfirmationMessage({
      patientFirstName: patient.name.split(' ')[0] ?? patient.name,
      tokenNumber: apt.token_number ?? 0,
      doctorName: doctor?.name ?? 'Doctor',
      date: apt.appointment_date,
      startTime,
      clinicName: clinic.name,
      address: clinic.address,
      language: lang,
    })

    const result = await sendText(clinic.whatsappPhoneNumberId, patient.phone, message)

    if (result.success && result.messageId) {
      // Store messageId → appointmentId mapping for delivery status tracking
      await redis.set(
        waMessageKey(result.messageId),
        { appointmentId, clinicId },
        { ex: MAPPING_TTL }
      )

      // Update delivery status
      await db.$executeRawUnsafe(
        `UPDATE "${schemaName}".appointments
         SET whatsapp_delivery_status = 'sent', updated_at = NOW()
         WHERE id = $1::uuid`,
        appointmentId
      )
    } else {
      // WhatsApp send failed — log and trigger SMS fallback
      await db.$executeRawUnsafe(
        `UPDATE "${schemaName}".appointments
         SET delivery_failures = COALESCE(delivery_failures, '[]'::jsonb) || $1::jsonb,
             updated_at = NOW()
         WHERE id = $2::uuid`,
        JSON.stringify([{ channel: 'whatsapp', failedAt: new Date().toISOString(), reason: result.error }]),
        appointmentId
      )

      await inngest.send({
        name: 'appointment/sms-fallback.send',
        data: { appointmentId, clinicId },
      })
    }

    return { sent: result.success, messageId: result.messageId }
  }
)
