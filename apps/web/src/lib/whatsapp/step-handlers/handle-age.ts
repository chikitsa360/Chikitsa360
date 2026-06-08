import { setConversationState } from '../conversation-state'
import { sendQuickReply } from '../message-sender'
import { t, AGE_RANGE_MAP } from '../templates'
import type { ConversationState } from '../conversation-state'
import type { ClinicContext, MessageInput } from './types'

/**
 * Handles the AWAITING_AGE step.
 * Accepts Quick Reply button IDs or matching text.
 */
export async function handleAgeSelection(
  clinic: ClinicContext,
  state: ConversationState,
  input: MessageInput
): Promise<void> {
  const lang = state.language

  const id = input.interactiveId ?? ''
  const ageRange = AGE_RANGE_MAP[id]

  if (!ageRange) {
    // Unrecognised input — re-prompt with age buttons
    await sendQuickReply(
      clinic.phoneNumberId,
      state.patientPhone,
      t.askAge(state.collectedFields.name ?? '', lang),
      t.ageButtons1()
    )
    return
  }

  await setConversationState(clinic.id, state.patientPhone, {
    ...state,
    step: 'AWAITING_GENDER',
    collectedFields: { ...state.collectedFields, ageRange },
  })

  await sendQuickReply(
    clinic.phoneNumberId,
    state.patientPhone,
    t.askGender(lang),
    t.genderButtons()
  )
}
