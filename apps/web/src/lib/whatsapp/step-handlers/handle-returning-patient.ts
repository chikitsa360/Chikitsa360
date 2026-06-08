import { setConversationState, deleteConversationState } from '../conversation-state'
import { sendListMessage, sendText } from '../message-sender'
import { t } from '../templates'
import { getAvailableSlots } from '../slot-availability'
import type { ConversationState } from '../conversation-state'
import type { ClinicContext, MessageInput } from './types'

/**
 * Handles the returning patient's "Yes, book now" / "No, thanks" Quick Reply.
 * State step = AWAITING_SLOT but no slot ID yet — this is the confirmation gate.
 */
export async function handleReturningPatientResponse(
  clinic: ClinicContext,
  state: ConversationState,
  input: MessageInput
): Promise<void> {
  const lang = state.language
  const id = input.interactiveId

  if (id === 'returning_no') {
    await deleteConversationState(clinic.id, state.patientPhone)
    await sendText(clinic.phoneNumberId, state.patientPhone, t.bookingDeclined(lang))
    return
  }

  if (id === 'returning_book' || id === 'consent_yes') {
    // Show slot list
    const slots = await getAvailableSlots(clinic.id)

    if (slots.length === 0) {
      await deleteConversationState(clinic.id, state.patientPhone)
      await sendText(
        clinic.phoneNumberId,
        state.patientPhone,
        t.noSlots(clinic.clinicPhone ?? 'the clinic', lang)
      )
      return
    }

    // Update state to expect slot selection
    await setConversationState(clinic.id, state.patientPhone, {
      ...state,
      step: 'AWAITING_SLOT',
    })

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
    return
  }

  // Unknown input — re-offer choice
  const firstName = state.collectedFields.name?.split(' ')[0] ?? ''
  const bodyText = firstName
    ? t.welcomeBack(firstName, lang)
    : t.welcomeBackUnnamed(lang)

  await sendText(clinic.phoneNumberId, state.patientPhone, bodyText)
}
