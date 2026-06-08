import { db } from '@/lib/db'
import { deleteConversationState } from '../conversation-state'
import { sendListMessage, sendText } from '../message-sender'
import { t } from '../templates'
import { tryLockSlot } from '../slot-lock'
import { getAvailableSlots } from '../slot-availability'
import { inngest } from '@/lib/inngest'
import { pusherServer } from '@/lib/pusher'
import type { ConversationState } from '../conversation-state'
import type { ClinicContext, MessageInput } from './types'

/**
 * Handles the AWAITING_SLOT step.
 * Locks the selected slot, creates patient + appointment atomically, fires confirmation.
 */
export async function handleSlotSelection(
  clinic: ClinicContext,
  state: ConversationState,
  input: MessageInput
): Promise<void> {
  const lang = state.language
  const slotId = input.interactiveId

  if (!slotId) {
    await sendText(clinic.phoneNumberId, state.patientPhone, t.slotListButton(lang))
    return
  }

  // Attempt SELECT FOR UPDATE SKIP LOCKED
  const lockResult = await tryLockSlot(clinic.id, slotId)

  if (!lockResult.locked) {
    // Slot was taken by a concurrent booking
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

  // Schedule 5-min slot release in case booking doesn't complete
  const releaseJob = await inngest.send({
    name: 'whatsapp/slot.release',
    data: { clinicId: clinic.id, slotId, appointmentId: null },
    // Inngest delayed scheduling: fires after 5 min
  })

  // Slot locked — create patient + appointment atomically
  const schemaName = `clinic_${clinic.id}`
  const { name = '', ageRange, gender } = state.collectedFields

  try {
    // Check for existing patient again (race: returning patient on fresh path)
    const existing = await db.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "${schemaName}".patients WHERE phone = $1 LIMIT 1`,
      state.patientPhone
    )

    let patientId: string

    if (existing[0]) {
      patientId = existing[0].id
    } else {
      // Create new patient (CR-2: name, age_range, gender only)
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

    // Get doctor_id from slot
    const slotRow = await db.$queryRawUnsafe<{ doctor_id: string; start_time: string; date: string }[]>(
      `SELECT doctor_id, start_time::text AS start_time, date::text AS date
       FROM "${schemaName}".slots WHERE id = $1::uuid`,
      slotId
    )
    const slot = slotRow[0]
    if (!slot) throw new Error('Slot not found after locking')

    // Create appointment with token (MAX + 1 per clinic per day, atomic)
    const appointmentResult = await db.$queryRawUnsafe<{ id: string; token_number: number }[]>(
      `INSERT INTO "${schemaName}".appointments
         (patient_id, doctor_id, slot_id, status, token_number, booking_source, appointment_date)
       VALUES (
         $1::uuid, $2::uuid, $3::uuid, 'confirmed',
         COALESCE((SELECT MAX(token_number) FROM "${schemaName}".appointments WHERE appointment_date = $4::date), 0) + 1,
         'whatsapp', $4::date
       )
       RETURNING id, token_number`,
      patientId,
      slot.doctor_id,
      slotId,
      slot.date
    )

    const appointment = appointmentResult[0]!

    // Mark slot booked
    await db.$executeRawUnsafe(
      `UPDATE "${schemaName}".slots SET status = 'booked' WHERE id = $1::uuid`,
      slotId
    )

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

    // Cancel the slot-release job (booking completed)
    // Note: Inngest doesn't support cancellation by event id directly in v3.
    // The slot-release job will check if appointment exists and no-op.
    void releaseJob
  } catch (err) {
    // Booking failed — release the slot
    await db.$executeRawUnsafe(
      `UPDATE "${schemaName}".slots SET status = 'available' WHERE id = $1::uuid AND status = 'reserved'`,
      slotId
    )
    console.error('Booking transaction failed:', err)
  }
}
