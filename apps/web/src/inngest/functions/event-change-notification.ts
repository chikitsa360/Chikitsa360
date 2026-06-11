import { inngest } from '@/lib/inngest'
import { db } from '@/lib/db'
import { sendTemplateMessage } from '@/lib/meta-whatsapp'
import { sendSms } from '@/lib/sms/msg91'

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

/**
 * Fans out a change notification to all confirmed registrants when material
 * event fields (start_time, end_time, venue, meeting_link) are updated.
 * FR-15, Story 14.3. Same batch-of-100 + rate cap pattern as invitation blast.
 */
export const eventChangeNotification = inngest.createFunction(
  { id: 'event-change-notification', retries: 2 },
  { event: 'event/change.notify' },
  async ({ event, step }) => {
    const { eventId, clinicId } = event.data as {
      eventId: string
      clinicId: string
      changedFields: string[]
    }
    const schemaName = `clinic_${clinicId}`

    // Load event details
    const eventData = await step.run('load-event', async () => {
      const rows = await db.$queryRawUnsafe<{
        id: string
        title: string
        slug: string
        start_time: string
        end_time: string
        venue: string | null
        meeting_link: string | null
      }[]>(
        `SELECT id, title, slug, start_time::text, end_time::text, venue, meeting_link
         FROM "${schemaName}".events WHERE id = $1 LIMIT 1`,
        eventId
      )
      return rows[0] ?? null
    })

    if (!eventData) return { sent: 0, reason: 'event_not_found' }

    // Load clinic for WA config
    const clinic = await step.run('load-clinic', async () => {
      return db.clinic.findUnique({
        where: { id: clinicId },
        select: { name: true, whatsappPhoneNumberId: true },
      })
    })

    // Load all confirmed registrants
    const registrants = await step.run('load-registrants', async () => {
      return db.$queryRawUnsafe<{ patient_id: string; reference_number: string }[]>(
        `SELECT patient_id, reference_number FROM "${schemaName}".event_registrations
         WHERE event_id = $1 AND status = 'registered'`,
        eventId
      )
    })

    if (registrants.length === 0) return { sent: 0, reason: 'no_registrants' }

    const dateStr = new Date(eventData.start_time).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })
    const timeStr = new Date(eventData.start_time).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true,
    })
    const venueOrLink = eventData.venue ?? eventData.meeting_link ?? 'Online'

    const batches = chunk(registrants, 100)
    let totalSent = 0

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]!

      await step.run(`send-batch-${i}`, async () => {
        for (const reg of batch) {
          try {
            const patientRows = await db.$queryRawUnsafe<{ phone: string; name: string }[]>(
              `SELECT phone, name FROM "${schemaName}".patients WHERE id = $1 LIMIT 1`,
              reg.patient_id
            )
            const patient = patientRows[0]
            if (!patient) continue

            let sent = false

            if (clinic?.whatsappPhoneNumberId) {
              const accessToken = process.env.META_SYSTEM_ACCESS_TOKEN ?? ''
              const firstName = patient.name.split(' ')[0] ?? patient.name
              const components = [
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', text: firstName },
                    { type: 'text', text: eventData.title },
                    { type: 'text', text: `${dateStr}, ${timeStr}` },
                    { type: 'text', text: venueOrLink },
                    { type: 'text', text: reg.reference_number },
                  ],
                },
              ]
              try {
                const result = await sendTemplateMessage(
                  clinic.whatsappPhoneNumberId,
                  patient.phone,
                  'event_change_notification',
                  'en',
                  components,
                  accessToken
                )
                sent = result.success
              } catch {
                sent = false
              }
            }

            if (!sent) {
              const smsText = `Update: ${eventData.title} has been rescheduled to ${dateStr}, ${timeStr} at ${venueOrLink}. Ref: ${reg.reference_number} - ${clinic?.name ?? 'Clinic'}`
              await sendSms(patient.phone, smsText)
              sent = true
            }

            if (sent) totalSent++
          } catch {
            // Per-patient errors do not bubble
          }
        }
      })

      // Rate-limit pause between batches
      if (i < batches.length - 1) {
        await step.sleep('rate-limit-pause', '60s')
      }
    }

    return { sent: totalSent, total: registrants.length }
  }
)
