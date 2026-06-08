import { setConversationState, deleteConversationState } from '../conversation-state'
import { sendQuickReply, sendText } from '../message-sender'
import { t } from '../templates'
import type { ConversationState } from '../conversation-state'
import type { ClinicContext, MessageInput } from './types'

const MAX_NAME_ATTEMPTS = 3
const MAX_NAME_LENGTH = 100

/**
 * Validate a patient name input (Story 3.2 AC).
 * Accepts: Unicode text including Devanagari, mixed scripts, accented Latin.
 * Rejects: digits-only, special-chars-only, blank/whitespace.
 */
export function validateName(input: string): boolean {
  const trimmed = input.trim()
  if (trimmed.length === 0) return false
  if (/^\d+$/.test(trimmed)) return false
  // Must contain at least one letter (Latin, Devanagari, or any Unicode letter)
  if (!/\p{L}/u.test(trimmed)) return false
  return true
}

/**
 * Handles the AWAITING_NAME step.
 * Validates free-text name input; re-prompts up to 3 times then exits gracefully.
 */
export async function handleNameInput(
  clinic: ClinicContext,
  state: ConversationState,
  input: MessageInput
): Promise<void> {
  const lang = state.language
  const rawName = (input.messageBody ?? '').trim().slice(0, MAX_NAME_LENGTH)

  if (!validateName(rawName)) {
    const attempts = (state.nameAttempts ?? 0) + 1

    if (attempts >= MAX_NAME_ATTEMPTS) {
      await deleteConversationState(clinic.id, state.patientPhone)
      await sendText(
        clinic.phoneNumberId,
        state.patientPhone,
        t.giveUp(clinic.clinicPhone ?? 'the clinic', lang)
      )
      return
    }

    await setConversationState(clinic.id, state.patientPhone, {
      ...state,
      nameAttempts: attempts,
    })
    await sendText(clinic.phoneNumberId, state.patientPhone, t.invalidName(lang))
    return
  }

  await setConversationState(clinic.id, state.patientPhone, {
    ...state,
    step: 'AWAITING_AGE',
    collectedFields: { ...state.collectedFields, name: rawName },
    nameAttempts: 0,
  })

  await sendQuickReply(
    clinic.phoneNumberId,
    state.patientPhone,
    t.askAge(rawName, lang),
    t.ageButtons1()
  )
}
