import { setConversationState } from '../conversation-state'
import { sendText } from '../message-sender'
import { t } from '../templates'
import type { ConversationState } from '../conversation-state'
import type { ClinicContext, MessageInput } from './types'

const AFFIRMATIVES = new Set(['YES', 'HAN', 'HAAN', 'HA', 'Y', 'OK', 'OKAY'])

/**
 * Handles the AWAITING_CONSENT step.
 * Patient must reply YES/affirmative before data collection begins (CR-1).
 */
export async function handleConsentResponse(
  clinic: ClinicContext,
  state: ConversationState,
  input: MessageInput
): Promise<void> {
  const lang = state.language

  // Accept button reply (id: 'consent_yes') or affirmative text
  const isConsent =
    input.interactiveId === 'consent_yes' ||
    AFFIRMATIVES.has((input.messageBody ?? input.interactiveTitle ?? '').trim().toUpperCase())

  if (!isConsent) {
    // Non-affirmative — re-send consent message
    await sendText(clinic.phoneNumberId, state.patientPhone, t.consent(clinic.name, lang))
    return
  }

  await setConversationState(clinic.id, state.patientPhone, {
    ...state,
    step: 'AWAITING_NAME',
    consentGiven: true,
  })

  await sendText(clinic.phoneNumberId, state.patientPhone, t.askName(lang))
}
