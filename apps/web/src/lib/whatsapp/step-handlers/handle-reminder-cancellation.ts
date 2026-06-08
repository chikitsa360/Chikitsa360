import { db } from '@/lib/db'
import { sendText } from '../message-sender'
import { t } from '../templates'
import { pusherServer } from '@/lib/pusher'
import { formatDayLabel, formatTimeLabel } from '../slot-availability'
import type { ClinicContext } from './types'

/**
 * Handles cancellation triggered by the "Cancel Appointment" Quick Reply button
 * in the 24h reminder WhatsApp message (Story 7.3).
 *
 * This is an appointmentId-scoped cancellation (vs. the generic CANCEL keyword
 * which resolves the appointment from conversation state).
 *
 * Sets cancelled_via = 'whatsapp-reminder' for analytics.
 */
export async function handleReminderCancellation(
  clinic: ClinicContext,
  patientPhone: string,
  appointmentId: string,
  lang: 'en' | 'hi' = 'en'
): Promise<void> {
  const schemaName = `clinic_${clinic.id}`

  // Load the appointment (must belong to this clinic and be confirmed)
  const aptRows = await db.$queryRawUnsafe<{
    id: string
    status: string
    slot_id: string | null
    appointment_date: string
    token_number: number | null
    doctor_name: string
    start_time: string | null
    patient_phone: string
  }[]>(
    `SELECT a.id, a.status, a.slot_id, a.appointment_date::text, a.token_number,
            d.name AS doctor_name,
            s.start_time::text AS start_time,
            p.phone AS patient_phone
     FROM "${schemaName}".appointments a
     JOIN "${schemaName}".doctors d ON d.id = a.doctor_id
     JOIN "${schemaName}".patients p ON p.id = a.patient_id
     LEFT JOIN "${schemaName}".slots s ON s.id = a.slot_id
     WHERE a.id = $1::uuid`,
    appointmentId
  )

  const apt = aptRows[0]

  // Validate: appointment exists + belongs to this patient + is confirmed
  if (!apt || apt.patient_phone !== patientPhone || apt.status !== 'confirmed') {
    await sendText(
      clinic.phoneNumberId,
      patientPhone,
      t.cancelNotFound(lang)
    )
    return
  }

  // Cancel appointment
  await db.$executeRawUnsafe(
    `UPDATE "${schemaName}".appointments
     SET status = 'cancelled', cancelled_via = 'whatsapp-reminder', updated_at = NOW()
     WHERE id = $1::uuid`,
    apt.id
  )

  // Release slot
  if (apt.slot_id) {
    await db.$executeRawUnsafe(
      `UPDATE "${schemaName}".slots SET status = 'available'
       WHERE id = $1::uuid AND status IN ('booked', 'reserved')`,
      apt.slot_id
    )
  }

  // Audit log
  console.info(
    JSON.stringify({
      action: 'APPOINTMENT_CANCELLED_BY_PATIENT',
      source: 'whatsapp-reminder',
      resource_type: 'appointment',
      resource_id: apt.id,
      clinicId: clinic.id,
      timestamp: new Date().toISOString(),
    })
  )

  // Real-time portal update
  await pusherServer.trigger(`clinic-${clinic.id}`, 'appointment.cancelled', {
    appointmentId: apt.id,
  })

  // Build booking URL for the re-book CTA
  const bookingUrl = `https://cliniqly.app/book/${clinic.id}`

  // Send cancellation acknowledgment
  const todayStr = new Date().toISOString().slice(0, 10)
  const dateLabel = formatDayLabel(apt.appointment_date, todayStr)
  const timeLabel = apt.start_time ? formatTimeLabel(apt.start_time) : ''

  const ackMessage =
    lang === 'hi'
      ? t.cancelAckHi(apt.doctor_name, dateLabel, timeLabel, bookingUrl)
      : t.cancelAckEn(apt.doctor_name, dateLabel, timeLabel, bookingUrl)

  await sendText(clinic.phoneNumberId, patientPhone, ackMessage)
}
