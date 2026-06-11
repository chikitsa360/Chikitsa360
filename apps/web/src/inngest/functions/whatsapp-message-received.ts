import { inngest } from '@/lib/inngest'
import { db } from '@/lib/db'
import { getConversationState } from '@/lib/whatsapp/conversation-state'
import { detectKeyword } from '@/lib/whatsapp/keyword-detector'
import { sendText } from '@/lib/whatsapp/message-sender'
import { t } from '@/lib/whatsapp/templates'
import { handleFreshConversation } from '@/lib/whatsapp/step-handlers/fresh-conversation'
import { handleConsentResponse } from '@/lib/whatsapp/step-handlers/handle-consent'
import { handleNameInput } from '@/lib/whatsapp/step-handlers/handle-name'
import { handleAgeSelection } from '@/lib/whatsapp/step-handlers/handle-age'
import { handleGenderSelection } from '@/lib/whatsapp/step-handlers/handle-gender'
import { handleSlotSelection } from '@/lib/whatsapp/step-handlers/handle-slot-selection'
import { handleReturningPatientResponse } from '@/lib/whatsapp/step-handlers/handle-returning-patient'
import { handleCancellation } from '@/lib/whatsapp/step-handlers/handle-cancellation'
import { handleOptOut, handleOptIn } from '@/lib/whatsapp/step-handlers/handle-opt-out'
import { handleReminderCancellation } from '@/lib/whatsapp/step-handlers/handle-reminder-cancellation'
import { handleEventRegistrationCancellation } from '@/lib/whatsapp/step-handlers/handle-event-reg-cancellation'
import type { ClinicContext } from '@/lib/whatsapp/step-handlers/types'

export const whatsappMessageReceived = inngest.createFunction(
  { id: 'whatsapp-message-received', name: 'WhatsApp: Process Inbound Message' },
  { event: 'whatsapp/message.received' },
  async ({ event }) => {
    const {
      phoneNumberId,
      patientPhone,
      messageType,
      messageBody,
      interactiveType,
      interactiveId,
      interactiveTitle,
    } = event.data

    // 1. Look up clinic by WhatsApp phone number ID
    const clinic = await db.clinic.findFirst({
      where: { whatsappPhoneNumberId: phoneNumberId },
      select: {
        id: true,
        name: true,
        language: true,
        clinicPhone: true,
        address: true,
        trialEndsAt: true,
        whatsappConnected: true,
        whatsappPhoneNumberId: true,
      },
    })

    if (!clinic) {
      console.warn(`[whatsapp] No clinic found for phoneNumberId: ${phoneNumberId}`)
      return
    }

    if (!clinic.whatsappConnected) {
      console.info(
        `[whatsapp] Inbound message received but clinic WhatsApp not configured — no response sent. clinicId=${clinic.id}`
      )
      return
    }

    const clinicCtx: ClinicContext = {
      id: clinic.id,
      name: clinic.name,
      phoneNumberId: clinic.whatsappPhoneNumberId ?? phoneNumberId,
      language: clinic.language as 'en' | 'hi',
      clinicPhone: clinic.clinicPhone,
      address: clinic.address,
      trialEndsAt: clinic.trialEndsAt,
      whatsappConnected: clinic.whatsappConnected,
    }

    const lang = clinicCtx.language

    // 2. Soft paywall check (MON-3): trial expired
    if (clinic.trialEndsAt && clinic.trialEndsAt < new Date()) {
      await sendText(
        phoneNumberId,
        patientPhone,
        t.trialExpired(clinic.clinicPhone ?? 'the clinic', lang)
      )
      return
    }

    // 3. Opt-out check: check patient opt-out before any interaction
    const schemaName = `clinic_${clinic.id}`
    const optOutCheck = await db.$queryRawUnsafe<{ whatsapp_opt_out_at: string | null }[]>(
      `SELECT whatsapp_opt_out_at FROM "${schemaName}".patients WHERE phone = $1 LIMIT 1`,
      patientPhone
    )
    if (optOutCheck[0]?.whatsapp_opt_out_at) {
      // Opted-out: silently acknowledge, no reply
      return
    }

    // 4. Handle interactive button replies first (CANCEL_APPOINTMENT: Quick Reply from reminder)
    if (messageType === 'interactive' && interactiveType === 'button_reply' && interactiveId?.startsWith('CANCEL_APPOINTMENT:')) {
      const appointmentId = interactiveId.replace('CANCEL_APPOINTMENT:', '')
      await handleReminderCancellation(clinicCtx, patientPhone, appointmentId, lang)
      return
    }

    // 4b. Handle CANCEL_EVENT_REG:{uuid} keyword (text message) — must be checked BEFORE general keyword detection
    const rawText = messageBody ?? interactiveTitle ?? ''
    const eventCancelMatch = rawText.match(/^CANCEL_EVENT_REG:([a-f0-9-]{36})$/i)
    if (eventCancelMatch) {
      await handleEventRegistrationCancellation(
        clinic.id,
        patientPhone,
        eventCancelMatch[1]!,
        clinicCtx.phoneNumberId
      )
      return
    }

    // 5. Detect global keywords
    const keyword = detectKeyword(rawText)

    if (keyword === 'STOP') {
      await handleOptOut(clinicCtx, patientPhone, lang)
      return
    }

    if (keyword === 'START') {
      await handleOptIn(clinicCtx, patientPhone, lang)
      return
    }

    if (keyword === 'CANCEL') {
      await handleCancellation(clinicCtx, patientPhone, lang)
      return
    }

    // 6. Load conversation state
    const state = await getConversationState(clinic.id, patientPhone)

    const messageInput = { messageType, messageBody, interactiveType, interactiveId, interactiveTitle }

    // 6. Route to step handler
    if (!state) {
      await handleFreshConversation(clinicCtx, patientPhone)
      return
    }

    switch (state.step) {
      case 'AWAITING_CONSENT':
        await handleConsentResponse(clinicCtx, state, messageInput)
        break

      case 'AWAITING_NAME':
        await handleNameInput(clinicCtx, state, messageInput)
        break

      case 'AWAITING_AGE':
        await handleAgeSelection(clinicCtx, state, messageInput)
        break

      case 'AWAITING_GENDER':
        await handleGenderSelection(clinicCtx, state, messageInput)
        break

      case 'AWAITING_SLOT': {
        // Distinguish returning patient confirmation from slot selection
        const isReturningConfirmation =
          interactiveId === 'returning_book' || interactiveId === 'returning_no'

        if (isReturningConfirmation) {
          await handleReturningPatientResponse(clinicCtx, state, messageInput)
        } else {
          await handleSlotSelection(clinicCtx, state, messageInput)
        }
        break
      }
    }
  }
)
