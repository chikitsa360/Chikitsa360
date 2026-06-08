import { db } from '@/lib/db'
import { deleteConversationState } from '../conversation-state'
import { sendText } from '../message-sender'
import { t } from '../templates'
import type { ClinicContext } from './types'

/**
 * Handles "STOP" keyword — opts patient out of all WhatsApp messages (CR-11).
 * Acknowledgment message is required by Meta WhatsApp Business Policy.
 */
export async function handleOptOut(
  clinic: ClinicContext,
  patientPhone: string,
  lang: 'en' | 'hi' = 'en'
): Promise<void> {
  const schemaName = `clinic_${clinic.id}`

  // Record opt-out timestamp on patient record
  await db.$executeRawUnsafe(
    `UPDATE "${schemaName}".patients
     SET whatsapp_opt_out_at = NOW(), updated_at = NOW()
     WHERE phone = $1`,
    patientPhone
  )

  // Clear any in-progress conversation
  await deleteConversationState(clinic.id, patientPhone)

  // Required acknowledgment (last message ever sent to this patient from this clinic)
  await sendText(clinic.phoneNumberId, patientPhone, t.optOutWithClinic(clinic.name, lang))
}

/**
 * Handles "START" keyword — re-enables WhatsApp messages for opted-out patients.
 */
export async function handleOptIn(
  clinic: ClinicContext,
  patientPhone: string,
  lang: 'en' | 'hi' = 'en'
): Promise<void> {
  const schemaName = `clinic_${clinic.id}`

  await db.$executeRawUnsafe(
    `UPDATE "${schemaName}".patients
     SET whatsapp_opt_out_at = NULL, updated_at = NOW()
     WHERE phone = $1`,
    patientPhone
  )

  await sendText(
    clinic.phoneNumberId,
    patientPhone,
    lang === 'hi'
      ? 'Aapko dobara subscribe kar diya gaya hai. Ab aap appointment book kar sakte hain.'
      : "You've been re-subscribed to appointment messages. You can now book appointments again."
  )
}
