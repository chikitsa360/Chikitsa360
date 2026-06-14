import { inngest } from '@/lib/inngest'
import { db } from '@/lib/db'
import { sendTemplateMessage } from '@/lib/meta-whatsapp'
import { sendSms } from '@/lib/sms/msg91'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

// ─── Inngest function ─────────────────────────────────────────────────────────

/**
 * Sends WhatsApp invitation messages to patients in rate-capped batches of 100.
 * Idempotency: already-sent patients (delivery_status=sent) are skipped on re-run.
 * Mirrors the bulk notification pattern from Epic 07.
 */
export const eventInvitationBlast = inngest.createFunction(
  { id: 'event-invitation-blast', retries: 2 },
  { event: 'event/invitation.blast' },
  async ({ event, step }) => {
    const { eventId, clinicId, patientIds } = event.data as {
      eventId: string
      clinicId: string
      patientIds: string[]
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
        fee_paise: number | null
        max_seats: number
        seats_registered: number
      }[]>(
        `SELECT id, title, slug, start_time AT TIME ZONE 'UTC' AS start_time, end_time AT TIME ZONE 'UTC' AS end_time, venue, meeting_link, fee_paise, max_seats, seats_registered
         FROM "${schemaName}".events WHERE id = $1::uuid LIMIT 1`,
        eventId
      )
      return rows[0] ?? null
    })

    if (!eventData) return { sent: 0, reason: 'event_not_found' }

    // Load clinic for WhatsApp config
    const clinic = await step.run('load-clinic', async () => {
      return db.clinic.findUnique({
        where: { id: clinicId },
        select: { name: true, whatsappPhoneNumberId: true },
      })
    })

    // Fetch already-sent patient IDs to skip on re-run
    const alreadySentRows = await step.run('load-already-sent', async () => {
      return db.$queryRawUnsafe<{ patient_id: string }[]>(
        `SELECT patient_id FROM "${schemaName}".event_invitations
         WHERE event_id = $1::uuid AND delivery_status = 'sent'`,
        eventId
      )
    })

    const alreadySentIds = new Set((alreadySentRows as { patient_id: string }[]).map(r => r.patient_id))
    const pendingPatientIds = patientIds.filter(id => !alreadySentIds.has(id))

    if (pendingPatientIds.length === 0) return { sent: 0, reason: 'all_already_sent' }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.chikitsa360.com'
    const registrationUrl = `${appUrl}/event/${eventData.slug}`

    const feeText = eventData.fee_paise
      ? `₹${Math.round(eventData.fee_paise / 100)}`
      : 'Free'
    const seatsLeft = Math.max(0, eventData.max_seats - eventData.seats_registered)

    const batches = chunk(pendingPatientIds, 100)
    let totalSent = 0

    for (let i = 0; i < batches.length; i++) {
      const batchPatientIds = batches[i]!

      await step.run(`send-batch-${i}`, async () => {
        for (const patientId of batchPatientIds) {
          try {
            // Fetch patient phone
            const patientRows = await db.$queryRawUnsafe<{ phone: string; name: string }[]>(
              `SELECT phone, name FROM "${schemaName}".patients WHERE id = $1::uuid LIMIT 1`,
              patientId
            )
            const patient = patientRows[0]
            if (!patient) continue

            let sent = false

            // Try WhatsApp first
            if (clinic?.whatsappPhoneNumberId) {
              const accessToken = process.env.META_SYSTEM_ACCESS_TOKEN ?? ''
              const firstName = patient.name.split(' ')[0] ?? patient.name
              const dateStr = new Date(eventData.start_time).toLocaleDateString('en-IN', {
                timeZone: 'Asia/Kolkata',
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
              // Build template body components with parameter substitutions
              const components = [
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', text: firstName },
                    { type: 'text', text: eventData.title },
                    { type: 'text', text: dateStr },
                    { type: 'text', text: eventData.venue ?? eventData.meeting_link ?? 'Online' },
                    { type: 'text', text: feeText },
                    { type: 'text', text: String(seatsLeft) },
                    { type: 'text', text: registrationUrl },
                  ],
                },
              ]

              const result = await sendTemplateMessage(
                clinic.whatsappPhoneNumberId,
                patient.phone,
                'event_invitation',
                'en',
                components,
                accessToken
              )
              sent = result.success
            }

            if (sent) {
              await db.$executeRawUnsafe(
                `UPDATE "${schemaName}".event_invitations
                 SET delivery_status = 'sent', sent_at = NOW()
                 WHERE event_id = $1::uuid AND patient_id = $2::uuid`,
                eventId,
                patientId
              )
              totalSent++
            } else {
              // SMS fallback
              const patientRows2 = await db.$queryRawUnsafe<{ phone: string }[]>(
                `SELECT phone FROM "${schemaName}".patients WHERE id = $1::uuid LIMIT 1`,
                patientId
              )
              const phone = patientRows2[0]?.phone
              if (phone) {
                const smsMessage = `You're invited to ${eventData.title}. Register: ${registrationUrl} (${feeText})`
                const smsResult = await sendSms(phone, smsMessage)
                if (smsResult.success) {
                  await db.$executeRawUnsafe(
                    `UPDATE "${schemaName}".event_invitations
                     SET delivery_status = 'sent', sent_at = NOW()
                     WHERE event_id = $1::uuid AND patient_id = $2::uuid`,
                    eventId,
                    patientId
                  )
                  totalSent++
                } else {
                  await db.$executeRawUnsafe(
                    `UPDATE "${schemaName}".event_invitations
                     SET delivery_status = 'failed'
                     WHERE event_id = $1::uuid AND patient_id = $2::uuid`,
                    eventId,
                    patientId
                  )
                }
              }
            }
          } catch {
            // Per-patient errors are caught and do not bubble
          }
        }
      })

      // Rate-limit pause between batches (WhatsApp allows ~100/min)
      if (i < batches.length - 1) {
        await step.sleep(`rate-limit-pause-${i}`, '60s')
      }
    }

    return { sent: totalSent, total: pendingPatientIds.length }
  }
)
