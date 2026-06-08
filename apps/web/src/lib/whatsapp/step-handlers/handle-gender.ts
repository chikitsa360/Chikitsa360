import { setConversationState } from '../conversation-state'
import { sendQuickReply, sendListMessage } from '../message-sender'
import { t, GENDER_MAP } from '../templates'
import { getAvailableSlots } from '../slot-availability'
import { sendText } from '../message-sender'
import type { ConversationState } from '../conversation-state'
import type { ClinicContext, MessageInput } from './types'

/**
 * Handles the AWAITING_GENDER step.
 * After gender is captured, queries available slots and presents a List Message.
 */
export async function handleGenderSelection(
  clinic: ClinicContext,
  state: ConversationState,
  input: MessageInput
): Promise<void> {
  const lang = state.language

  const id = input.interactiveId ?? ''
  const gender = GENDER_MAP[id]

  if (!gender) {
    await sendQuickReply(
      clinic.phoneNumberId,
      state.patientPhone,
      t.askGender(lang),
      t.genderButtons()
    )
    return
  }

  const updatedState = {
    ...state,
    step: 'AWAITING_SLOT' as const,
    collectedFields: { ...state.collectedFields, gender },
  }

  await setConversationState(clinic.id, state.patientPhone, updatedState)

  // Fetch available slots
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
    t.slotListHeader(lang),
    t.slotListBody(lang),
    t.slotListButton(lang),
    slots.map((s) => ({
      id: s.id,
      title: `${s.dayLabel} ${s.timeLabel}`,
      description: `Dr. ${s.doctorName}`,
    }))
  )
}
