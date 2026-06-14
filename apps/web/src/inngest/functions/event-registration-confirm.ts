import { inngest } from '@/lib/inngest'
import { db } from '@/lib/db'
import { sendTemplateMessage } from '@/lib/meta-whatsapp'
import { sendSms } from '@/lib/sms/msg91'

// ─── Inngest function ─────────────────────────────────────────────────────────

/**
 * Sends WhatsApp confirmation to a patient immediately after seat allocation.
 * FR-13, Story 14.1. Idempotency key set on inngest.send() call site.
 * Also schedules the 24h reminder (Story 14.2).
 */
export const eventRegistrationConfirm = inngest.createFunction(
  { id: 'event-registration-confirm', retries: 3 },
  { event: 'event/registration.confirm' },
  async ({ event, step }) => {
    const { registrationId, clinicId } = event.data as {
      registrationId: string
      clinicId: string
    }
    const schemaName = `clinic_${clinicId}`

    // ── Load all required data ─────────────────────────────────────────────
    const data = await step.run('load-data', async () => {
      const regRows = await db.$queryRawUnsafe<{
        id: string
        status: string
        reference_number: string
        cancellation_token: string | null
        event_id: string
        patient_id: string
      }[]>(
        `SELECT id, status, reference_number, cancellation_token, event_id, patient_id
         FROM "${schemaName}".event_registrations WHERE id = $1::uuid LIMIT 1`,
        registrationId
      )
      const registration = regRows[0]
      if (!registration) return null

      const eventRows = await db.$queryRawUnsafe<{
        id: string
        title: string
        slug: string
        start_time: string
        end_time: string
        venue: string | null
        meeting_link: string | null
        fee_paise: number | null
      }[]>(
        `SELECT id, title, slug, start_time AT TIME ZONE 'UTC' AS start_time, end_time AT TIME ZONE 'UTC' AS end_time, venue, meeting_link, fee_paise
         FROM "${schemaName}".events WHERE id = $1::uuid LIMIT 1`,
        registration.event_id
      )
      const eventData = eventRows[0]
      if (!eventData) return null

      const patientRows = await db.$queryRawUnsafe<{ id: string; name: string; phone: string }[]>(
        `SELECT id, name, phone FROM "${schemaName}".patients WHERE id = $1::uuid LIMIT 1`,
        registration.patient_id
      )
      const patient = patientRows[0]
      if (!patient) return null

      const clinic = await db.clinic.findUnique({
        where: { id: clinicId },
        select: { name: true, whatsappPhoneNumberId: true },
      })
      if (!clinic) return null

      return { registration, event: eventData, patient, clinic }
    })

    if (!data) return { sent: false, reason: 'not_found' }
    if (data.registration.status === 'cancelled') return { sent: false, reason: 'cancelled' }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.chikitsa360.com'
    const cancellationUrl = data.registration.cancellation_token
      ? `${baseUrl}/event/${data.event.slug}/cancel?token=${data.registration.cancellation_token}`
      : null

    // ── Send confirmation message ──────────────────────────────────────────
    await step.run('send-confirmation', async () => {
      const feeText = data.event.fee_paise
        ? `₹${Math.round(data.event.fee_paise / 100)}`
        : 'Free'
      const venueOrLink = data.event.venue ?? data.event.meeting_link ?? 'Online'
      const firstName = data.patient.name.split(' ')[0] ?? data.patient.name
      const dateStr = new Date(data.event.start_time).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
      const timeStr = new Date(data.event.start_time).toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })

      let waSent = false

      if (data.clinic?.whatsappPhoneNumberId) {
        try {
          const accessToken = process.env.META_SYSTEM_ACCESS_TOKEN ?? ''
          const components = [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: firstName },
                { type: 'text', text: data.event.title },
                { type: 'text', text: `${dateStr}, ${timeStr}` },
                { type: 'text', text: venueOrLink },
                { type: 'text', text: data.registration.reference_number },
                { type: 'text', text: feeText },
                { type: 'text', text: cancellationUrl ?? 'N/A' },
              ],
            },
          ]
          const result = await sendTemplateMessage(
            data.clinic.whatsappPhoneNumberId,
            data.patient.phone,
            'event_confirmation',
            'en',
            components,
            accessToken
          )
          waSent = result.success
        } catch {
          waSent = false
        }
      }

      if (!waSent) {
        const smsText = `${data.clinic?.name ?? 'Clinic'}: Your seat is confirmed for ${data.event.title} on ${dateStr}. Ref: ${data.registration.reference_number}.${cancellationUrl ? ` Cancel: ${cancellationUrl}` : ''}`
        await sendSms(data.patient.phone, smsText)
      }
    })

    // ── Schedule 24h reminder (Story 14.2) ────────────────────────────────
    const reminderTs = new Date(data.event.start_time).getTime() - 86400000
    if (reminderTs > Date.now()) {
      await step.sendEvent('schedule-reminder', {
        name: 'event/reminder.24h' as never,
        data: { registrationId, clinicId },
        ts: reminderTs,
        id: `${registrationId}:reminder-24h`,
      })
    }

    return { sent: true }
  }
)
