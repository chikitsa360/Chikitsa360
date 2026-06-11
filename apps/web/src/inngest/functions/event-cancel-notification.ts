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
 * Notifies registered attendees AND waiting list entries when an event is cancelled.
 * FR-16, Story 14.4. Deduplicates recipients by patient_id.
 */
export const eventCancelNotification = inngest.createFunction(
  { id: 'event-cancel-notification', retries: 2 },
  { event: 'event/cancel.notify' },
  async ({ event, step }) => {
    const { eventId, clinicId } = event.data as { eventId: string; clinicId: string }
    const schemaName = `clinic_${clinicId}`

    // Load event details
    const eventData = await step.run('load-event', async () => {
      const rows = await db.$queryRawUnsafe<{
        title: string
        start_time: string
      }[]>(
        `SELECT title, start_time AT TIME ZONE 'UTC' AS start_time FROM "${schemaName}".events WHERE id = $1 LIMIT 1`,
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

    // Load all registered + waiting list patient IDs (deduplicated)
    const recipients = await step.run('load-recipients', async () => {
      const registrants = await db.$queryRawUnsafe<{ patient_id: string }[]>(
        `SELECT patient_id FROM "${schemaName}".event_registrations
         WHERE event_id = $1 AND status = 'registered'`,
        eventId
      )
      const waitlisted = await db.$queryRawUnsafe<{ patient_id: string }[]>(
        `SELECT patient_id FROM "${schemaName}".event_waiting_list
         WHERE event_id = $1 AND status = 'waiting'`,
        eventId
      )
      // Deduplicate by patient_id
      const seen = new Set<string>()
      const all: string[] = []
      for (const r of [...registrants, ...waitlisted]) {
        if (!seen.has(r.patient_id)) {
          seen.add(r.patient_id)
          all.push(r.patient_id)
        }
      }
      return all
    })

    if (recipients.length === 0) return { sent: 0, reason: 'no_recipients' }

    const dateStr = new Date(eventData.start_time).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })

    const batches = chunk(recipients, 100)
    let totalSent = 0

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]!

      await step.run(`send-batch-${i}`, async () => {
        for (const patientId of batch) {
          try {
            const patientRows = await db.$queryRawUnsafe<{ phone: string; name: string }[]>(
              `SELECT phone, name FROM "${schemaName}".patients WHERE id = $1 LIMIT 1`,
              patientId
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
                    { type: 'text', text: dateStr },
                    { type: 'text', text: clinic.name },
                  ],
                },
              ]
              try {
                const result = await sendTemplateMessage(
                  clinic.whatsappPhoneNumberId,
                  patient.phone,
                  'event_cancellation',
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
              const smsText = `${clinic?.name ?? 'Clinic'}: We're sorry to inform you that ${eventData.title} on ${dateStr} has been cancelled.`
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
        await step.sleep(`rate-limit-pause-${i}`, '60s')
      }
    }

    return { sent: totalSent, total: recipients.length }
  }
)
