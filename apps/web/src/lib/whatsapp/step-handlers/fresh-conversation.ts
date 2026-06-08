import { db } from '@/lib/db'
import { setConversationState, createInitialState } from '../conversation-state'
import { sendQuickReply } from '../message-sender'
import { t } from '../templates'
import type { ClinicContext } from './types'

/**
 * Entry point for every new conversation (no Redis state found).
 * Resolves patient identity: returning → fast-track; new → consent flow.
 */
export async function handleFreshConversation(
  clinic: ClinicContext,
  patientPhone: string
): Promise<void> {
  const schemaName = `clinic_${clinic.id}`
  const lang = clinic.language

  // Check if patient already exists in tenant DB (FR-2)
  const existing = await db.$queryRawUnsafe<
    { id: string; name: string; whatsapp_opt_out_at: string | null }[]
  >(
    `SELECT id, name, whatsapp_opt_out_at FROM "${schemaName}".patients WHERE phone = $1 LIMIT 1`,
    patientPhone
  )

  const patient = existing[0]

  // Opted-out patients → no response (CR-11)
  if (patient?.whatsapp_opt_out_at) {
    return
  }

  if (patient) {
    // Returning patient: greet by first name and offer quick booking
    const firstName = patient.name.split(' ')[0] ?? ''
    const bodyText = firstName
      ? t.welcomeBack(firstName, lang)
      : t.welcomeBackUnnamed(lang)

    await setConversationState(clinic.id, patientPhone, {
      ...createInitialState(clinic.id, patientPhone, lang),
      step: 'AWAITING_SLOT',
      collectedFields: {},
      consentGiven: true,
      // Store existing patientId for reuse
    })

    // Overwrite with returning patient state that carries patientId
    await db.$executeRawUnsafe(
      `UPDATE "${schemaName}".patients SET updated_at = NOW() WHERE id = $1::uuid`,
      patient.id
    )

    await sendQuickReply(clinic.phoneNumberId, patientPhone, bodyText, [
      { id: 'returning_book', title: t.bookNow(lang) },
      { id: 'returning_no', title: t.noThanks(lang) },
    ])

    // Update state with patientId reference (extend state via a re-set)
    const state = createInitialState(clinic.id, patientPhone, lang)
    await setConversationState(clinic.id, patientPhone, {
      ...state,
      step: 'AWAITING_SLOT',
      consentGiven: true,
      collectedFields: { name: patient.name },
    } as Parameters<typeof setConversationState>[2])
  } else {
    // New patient → consent message (CR-1)
    const initialState = createInitialState(clinic.id, patientPhone, lang)
    await setConversationState(clinic.id, patientPhone, initialState)

    await sendQuickReply(
      clinic.phoneNumberId,
      patientPhone,
      t.consent(clinic.name, lang),
      [{ id: 'consent_yes', title: t.consentButton(lang) }]
    )
  }
}
