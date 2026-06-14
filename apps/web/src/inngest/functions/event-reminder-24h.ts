import { inngest } from '@/lib/inngest'
import { db } from '@/lib/db'
import { sendTemplateMessage } from '@/lib/meta-whatsapp'
import { sendSms } from '@/lib/sms/msg91'

/**
 * Sends a 24h reminder to registered event attendees.
 * FR-14, Story 14.2. Mirrors appointment-reminder-24h.ts pattern.
 * Checks: registration status=registered + clinic toggle + patient opt-out.
 */
export const eventReminder24h = inngest.createFunction(
  { id: 'event-reminder-24h', retries: 3 },
  { event: 'event/reminder.24h' },
  async ({ event }) => {
    const { registrationId, clinicId } = event.data as {
      registrationId: string
      clinicId: string
    }
    const schemaName = `clinic_${clinicId}`

    // Load clinic (includes toggle + WA config)
    const clinic = await db.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true, whatsappPhoneNumberId: true, eventReminder24hEnabled: true },
    })

    if (!clinic) return { sent: false, reason: 'clinic_not_found' }
    if (!clinic.eventReminder24hEnabled) return { sent: false, reason: 'toggle_disabled' }

    // Load registration + event + patient in one step
    const regRows = await db.$queryRawUnsafe<{
      status: string
      reference_number: string
      patient_id: string
      event_id: string
    }[]>(
      `SELECT status, reference_number, patient_id, event_id
       FROM "${schemaName}".event_registrations WHERE id = $1::uuid LIMIT 1`,
      registrationId
    )
    const registration = regRows[0]
    if (!registration) return { sent: false, reason: 'registration_not_found' }
    if (registration.status !== 'registered') return { sent: false, reason: 'not_registered' }

    const eventRows = await db.$queryRawUnsafe<{
      title: string
      start_time: string
      end_time: string
      venue: string | null
      meeting_link: string | null
    }[]>(
      `SELECT title, start_time AT TIME ZONE 'UTC' AS start_time, end_time AT TIME ZONE 'UTC' AS end_time, venue, meeting_link
       FROM "${schemaName}".events WHERE id = $1::uuid LIMIT 1`,
      registration.event_id
    )
    const eventData = eventRows[0]
    if (!eventData) return { sent: false, reason: 'event_not_found' }

    const patientRows = await db.$queryRawUnsafe<{
      name: string
      phone: string
      whatsapp_opt_out_at: string | null
    }[]>(
      `SELECT name, phone, whatsapp_opt_out_at FROM "${schemaName}".patients WHERE id = $1::uuid LIMIT 1`,
      registration.patient_id
    )
    const patient = patientRows[0]
    if (!patient) return { sent: false, reason: 'patient_not_found' }

    if (patient.whatsapp_opt_out_at) {
      // Patient opted out — SMS fallback
      const dateStr = new Date(eventData.start_time).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short',
      })
      const smsText = `Reminder: ${eventData.title} is tomorrow (${dateStr}). Ref: ${registration.reference_number} - ${clinic.name}`
      await sendSms(patient.phone, smsText)
      return { sent: false, reason: 'patient_opted_out', smsFallback: true }
    }

    const firstName = patient.name.split(' ')[0] ?? patient.name
    const dateStr = new Date(eventData.start_time).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })
    const timeStr = new Date(eventData.start_time).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true,
    })
    const venueOrLink = eventData.venue ?? eventData.meeting_link ?? 'Online'

    let waSent = false

    if (clinic.whatsappPhoneNumberId) {
      try {
        const accessToken = process.env.META_SYSTEM_ACCESS_TOKEN ?? ''
        const components = [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: firstName },
              { type: 'text', text: eventData.title },
              { type: 'text', text: `${dateStr}, ${timeStr}` },
              { type: 'text', text: venueOrLink },
              { type: 'text', text: registration.reference_number },
            ],
          },
        ]
        const result = await sendTemplateMessage(
          clinic.whatsappPhoneNumberId,
          patient.phone,
          'event_reminder_24h',
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
      const smsText = `Reminder: ${eventData.title} is tomorrow. Venue: ${venueOrLink}. Ref: ${registration.reference_number} - ${clinic.name}`
      await sendSms(patient.phone, smsText)
    }

    return { sent: waSent }
  }
)
