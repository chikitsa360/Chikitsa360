import { db } from '@/lib/db'
import { deleteConversationState } from '../conversation-state'
import { sendListMessage, sendText } from '../message-sender'
import { t } from '../templates'
import { getAvailableSlots, decodeSlotId } from '../slot-availability'
import { inngest } from '@/lib/inngest'
import { pusherServer } from '@/lib/pusher'
import type { ConversationState } from '../conversation-state'
import type { ClinicContext, MessageInput } from './types'

/**
 * Handles the AWAITING_SLOT step.
 * Decodes the selected virtual slot ID, creates patient + appointment atomically.
 * Uses the UNIQUE INDEX on (doctor_id, appointment_date, appointment_time)
 * for race-condition protection instead of a physical slots table.
 */
export async function handleSlotSelection(
  clinic: ClinicContext,
  state: ConversationState,
  input: MessageInput
): Promise<void> {
  const lang = state.language
  const rawSlotId = input.interactiveId

  if (!rawSlotId) {
    await sendText(clinic.phoneNumberId, state.patientPhone, t.slotListButton(lang))
    return
  }

  // Decode the virtual slot ID → doctorId, date, startTime
  const decoded = decodeSlotId(rawSlotId)
  if (!decoded) {
    await sendText(clinic.phoneNumberId, state.patientPhone, t.slotListButton(lang))
    return
  }

  const { doctorId, date, startTime } = decoded
  const schemaName = `clinic_${clinic.id}`
  const { name = '', ageRange, gender } = state.collectedFields

  try {
    // Check for existing patient (returning patient on fresh path)
    const existing = await db.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "${schemaName}".patients WHERE phone = $1 LIMIT 1`,
      state.patientPhone
    )

    let patientId: string

    if (existing[0]) {
      patientId = existing[0].id
    } else {
      const created = await db.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO "${schemaName}".patients (phone, name, age_range, gender, booking_source)
         VALUES ($1, $2, $3, $4, 'whatsapp')
         RETURNING id`,
        state.patientPhone,
        name,
        ageRange ?? null,
        gender ?? null
      )
      patientId = created[0]!.id
    }

    // Create appointment — UNIQUE INDEX on (doctor_id, appointment_date, appointment_time)
    // handles race conditions: duplicate insert → unique_violation (23505)
    const appointmentResult = await db.$queryRawUnsafe<{ id: string; token_number: number }[]>(
      `INSERT INTO "${schemaName}".appointments
         (patient_id, doctor_id, status, token_number, booking_source,
          appointment_date, appointment_time)
       VALUES (
         $1::uuid, $2::uuid, 'confirmed',
         COALESCE((SELECT MAX(token_number) FROM "${schemaName}".appointments WHERE appointment_date = $3::date), 0) + 1,
         'whatsapp', $3::date, $4::time
       )
       RETURNING id, token_number`,
      patientId,
      doctorId,
      date,
      startTime
    )

    const appointment = appointmentResult[0]!

    // Delete conversation state (flow complete)
    await deleteConversationState(clinic.id, state.patientPhone)

    // Real-time update to portal calendar
    await pusherServer.trigger(`clinic-${clinic.id}`, 'appointment.created', {
      appointmentId: appointment.id,
    })

    // Schedule confirmation notification (Story 3.4)
    await inngest.send({
      id: `${appointment.id}:confirmation`,
      name: 'appointment/confirmation.send',
      data: { appointmentId: appointment.id, clinicId: clinic.id },
    })
  } catch (err) {
    // Check for unique_violation (slot already taken by concurrent booking)
    const pgErr = err as { code?: string }
    if (pgErr.code === '23505') {
      // Re-fetch available slots and show the user
      const slots = await getAvailableSlots(clinic.id)
      if (slots.length === 0) {
        await sendText(
          clinic.phoneNumberId,
          state.patientPhone,
          t.noSlots(clinic.clinicPhone ?? 'the clinic', lang)
        )
        return
      }
      await sendListMessage(
        clinic.phoneNumberId,
        state.patientPhone,
        t.slotTaken(lang),
        t.slotListBody(lang),
        t.slotListButton(lang),
        slots.map((s) => ({
          id: s.id,
          title: `${s.dayLabel} ${s.timeLabel}`,
          description: `Dr. ${s.doctorName}`,
        }))
      )
      return
    }

    console.error('[WhatsApp] Booking failed:', err)
    await sendText(
      clinic.phoneNumberId,
      state.patientPhone,
      t.noSlots(clinic.clinicPhone ?? 'the clinic', lang)
    )
  }
}
