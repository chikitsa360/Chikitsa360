import { db } from '@/lib/db'
import { sendQuickReply, sendText } from '../message-sender'
import { t } from '../templates'
import { pusherServer } from '@/lib/pusher'
import { formatDayLabel, formatTimeLabel } from '../slot-availability'
import type { ClinicContext } from './types'

/**
 * Handles "CANCEL" keyword — cancels the patient's next upcoming confirmed appointment.
 * Releases the slot and publishes a Pusher event (FR-6, Story 3.3).
 */
export async function handleCancellation(
  clinic: ClinicContext,
  patientPhone: string,
  lang: 'en' | 'hi' = 'en'
): Promise<void> {
  const schemaName = `clinic_${clinic.id}`

  // Find patient
  const patientRows = await db.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "${schemaName}".patients WHERE phone = $1 LIMIT 1`,
    patientPhone
  )
  const patient = patientRows[0]
  if (!patient) {
    await sendQuickReply(clinic.phoneNumberId, patientPhone, t.cancelNotFound(lang), [
      { id: 'returning_book', title: t.bookNow(lang) },
      { id: 'returning_no', title: t.noThanks(lang) },
    ])
    return
  }

  // Find most recent upcoming confirmed appointment
  const aptRows = await db.$queryRawUnsafe<{
    id: string
    slot_id: string | null
    appointment_date: string
    token_number: number | null
    doctor_name: string
    start_time: string | null
  }[]>(
    `SELECT a.id, a.slot_id, a.appointment_date::text, a.token_number,
            d.name AS doctor_name,
            s.start_time::text AS start_time
     FROM "${schemaName}".appointments a
     JOIN "${schemaName}".doctors d ON d.id = a.doctor_id
     LEFT JOIN "${schemaName}".slots s ON s.id = a.slot_id
     WHERE a.patient_id = $1::uuid
       AND a.status = 'confirmed'
       AND a.appointment_date >= CURRENT_DATE
     ORDER BY a.appointment_date ASC, s.start_time ASC
     LIMIT 1`,
    patient.id
  )

  const apt = aptRows[0]

  if (!apt) {
    await sendQuickReply(clinic.phoneNumberId, patientPhone, t.cancelNotFound(lang), [
      { id: 'returning_book', title: t.bookNow(lang) },
      { id: 'returning_no', title: t.noThanks(lang) },
    ])
    return
  }

  // Cancel appointment
  await db.$executeRawUnsafe(
    `UPDATE "${schemaName}".appointments SET status = 'cancelled', updated_at = NOW()
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

  // Audit log (structured console for system-initiated actions)
  console.info(
    JSON.stringify({
      action: 'APPOINTMENT_CANCELLED_BY_PATIENT',
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

  // Confirmation to patient
  const todayStr = new Date().toISOString().slice(0, 10)
  const dateLabel = formatDayLabel(apt.appointment_date, todayStr)
  const timeLabel = apt.start_time ? formatTimeLabel(apt.start_time) : ''

  await sendText(
    clinic.phoneNumberId,
    patientPhone,
    t.cancelFound(dateLabel, timeLabel, apt.doctor_name, lang)
  )
}
