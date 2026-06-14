import { db } from '@/lib/db'
import { sendText } from '../message-sender'
import { inngest } from '@/lib/inngest'

/**
 * Handles CANCEL_EVENT_REG:{registrationId} WhatsApp keyword.
 * Verifies phone ownership, cancels registration, fires event/registration.cancelled.
 * Story 14.6.
 */
export async function handleEventRegistrationCancellation(
  clinicId: string,
  senderPhone: string,
  registrationId: string,
  phoneNumberId: string
): Promise<void> {
  const schemaName = `clinic_${clinicId}`

  // Load registration + verify patient phone matches sender
  const regRows = await db.$queryRawUnsafe<{
    id: string
    status: string
    event_id: string
    reference_number: string
    patient_phone: string
  }[]>(
    `SELECT er.id, er.status, er.event_id, er.reference_number, p.phone AS patient_phone
     FROM "${schemaName}".event_registrations er
     JOIN "${schemaName}".patients p ON p.id = er.patient_id
     WHERE er.id = $1::uuid LIMIT 1`,
    registrationId
  )

  const registration = regRows[0]

  if (!registration || registration.patient_phone !== senderPhone) {
    await sendText(
      phoneNumberId,
      senderPhone,
      "We couldn't find your registration. Please check the reference number or contact the clinic."
    )
    return
  }

  if (registration.status === 'cancelled') {
    await sendText(
      phoneNumberId,
      senderPhone,
      `Your registration (Ref: ${registration.reference_number}) has already been cancelled.`
    )
    return
  }

  if (registration.status !== 'registered') {
    await sendText(
      phoneNumberId,
      senderPhone,
      "We couldn't cancel this registration. Please contact the clinic for assistance."
    )
    return
  }

  // Check event hasn't started
  const eventRows = await db.$queryRawUnsafe<{ start_time: string }[]>(
    `SELECT start_time AT TIME ZONE 'UTC' AS start_time FROM "${schemaName}".events WHERE id = $1::uuid LIMIT 1`,
    registration.event_id
  )
  const eventData = eventRows[0]

  if (!eventData || new Date(eventData.start_time) <= new Date()) {
    await sendText(
      phoneNumberId,
      senderPhone,
      'This event has already started or ended. Cancellation is no longer possible.'
    )
    return
  }

  // Cancel registration + decrement seats
  await db.$executeRawUnsafe('BEGIN')
  try {
    await db.$executeRawUnsafe(
      `UPDATE "${schemaName}".event_registrations
       SET status = 'cancelled', cancellation_token = NULL, updated_at = NOW()
       WHERE id = $1::uuid`,
      registration.id
    )
    await db.$executeRawUnsafe(
      `UPDATE "${schemaName}".events
       SET seats_registered = GREATEST(0, seats_registered - 1), updated_at = NOW()
       WHERE id = $1::uuid`,
      registration.event_id
    )
    await db.$executeRawUnsafe('COMMIT')
  } catch (e) {
    await db.$executeRawUnsafe('ROLLBACK')
    await sendText(
      phoneNumberId,
      senderPhone,
      'Something went wrong while cancelling your registration. Please contact the clinic.'
    )
    return
  }

  // Fire Inngest event for cancellation confirmation + auto-promotion
  await inngest.send({
    name: 'event/registration.cancelled' as never,
    data: { registrationId: registration.id, clinicId },
    id: `${registration.id}:cancelled`,
  })

  await sendText(
    phoneNumberId,
    senderPhone,
    `Your registration (Ref: ${registration.reference_number}) has been cancelled. If you change your mind, you can register again from the event link.`
  )
}
