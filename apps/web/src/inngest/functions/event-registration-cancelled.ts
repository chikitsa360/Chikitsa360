import { inngest } from '@/lib/inngest'
import { db } from '@/lib/db'
import { sendTemplateMessage } from '@/lib/meta-whatsapp'
import { sendSms } from '@/lib/sms/msg91'
import { randomUUID } from 'crypto'

/**
 * Handles event/registration.cancelled:
 * 1. Sends cancellation confirmation WA/SMS to the patient
 * 2. Auto-promotes the first waiting list entry (if any)
 * FR-17, FR-18, FR-12, Story 14.6.
 */
export const eventRegistrationCancelled = inngest.createFunction(
  { id: 'event-registration-cancelled', retries: 3 },
  { event: 'event/registration.cancelled' },
  async ({ event, step }) => {
    const { registrationId, clinicId } = event.data as {
      registrationId: string
      clinicId: string
    }
    const schemaName = `clinic_${clinicId}`

    // ── Load registration, event, patient, clinic ──────────────────────────
    const data = await step.run('load-data', async () => {
      const regRows = await db.$queryRawUnsafe<{
        id: string
        status: string
        reference_number: string
        event_id: string
        patient_id: string
      }[]>(
        `SELECT id, status, reference_number, event_id, patient_id
         FROM "${schemaName}".event_registrations WHERE id = $1 LIMIT 1`,
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
        max_seats: number
        seats_registered: number
      }[]>(
        `SELECT id, title, slug, start_time::text, end_time::text, venue, meeting_link, fee_paise, max_seats, seats_registered
         FROM "${schemaName}".events WHERE id = $1 LIMIT 1`,
        registration.event_id
      )
      const eventData = eventRows[0]
      if (!eventData) return null

      const patientRows = await db.$queryRawUnsafe<{ id: string; name: string; phone: string }[]>(
        `SELECT id, name, phone FROM "${schemaName}".patients WHERE id = $1 LIMIT 1`,
        registration.patient_id
      )
      const patient = patientRows[0]
      if (!patient) return null

      const clinic = await db.clinic.findUnique({
        where: { id: clinicId },
        select: { name: true, whatsappPhoneNumberId: true },
      })

      return { registration, event: eventData, patient, clinic }
    })

    if (!data) return { reason: 'not_found' }

    // ── Send cancellation confirmation to patient ──────────────────────────
    await step.run('send-cancellation-confirmation', async () => {
      const firstName = data.patient.name.split(' ')[0] ?? data.patient.name
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
                { type: 'text', text: data.registration.reference_number },
              ],
            },
          ]
          const result = await sendTemplateMessage(
            data.clinic.whatsappPhoneNumberId,
            data.patient.phone,
            'event_registration_cancelled',
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
        const smsText = `${data.clinic?.name ?? 'Clinic'}: Your registration for ${data.event.title} has been cancelled. Ref: ${data.registration.reference_number}.`
        await sendSms(data.patient.phone, smsText)
      }
    })

    // ── Auto-promote first waiting list entry ──────────────────────────────
    const promoted = await step.run('auto-promote-waitlist', async () => {
      // Race-safe: lock the event row then promote atomically
      await db.$executeRawUnsafe('BEGIN')
      try {
        // Lock event row
        const lockedRows = await db.$queryRawUnsafe<{
          id: string
          seats_registered: number
          max_seats: number
          slug: string
          start_time: string
        }[]>(
          `SELECT id, seats_registered, max_seats, slug, start_time::text
           FROM "${schemaName}".events WHERE id = $1 FOR UPDATE`,
          data.event.id
        )
        const lockedEvent = lockedRows[0]
        if (!lockedEvent) {
          await db.$executeRawUnsafe('ROLLBACK')
          return null
        }

        // Check if a seat is actually available
        if (lockedEvent.seats_registered >= lockedEvent.max_seats) {
          await db.$executeRawUnsafe('ROLLBACK')
          return null
        }

        // Find first waiting list entry
        const waitlistRows = await db.$queryRawUnsafe<{
          id: string
          patient_id: string
          position: number
        }[]>(
          `SELECT id, patient_id, position FROM "${schemaName}".event_waiting_list
           WHERE event_id = $1 AND status = 'waiting'
           ORDER BY position ASC
           LIMIT 1
           FOR UPDATE`,
          data.event.id
        )
        const waitlistEntry = waitlistRows[0]
        if (!waitlistEntry) {
          await db.$executeRawUnsafe('ROLLBACK')
          return null
        }

        // Generate reference number for promoted registration
        const countRows = await db.$queryRawUnsafe<{ cnt: string }[]>(
          `SELECT COUNT(*)::text AS cnt FROM "${schemaName}".event_registrations WHERE event_id = $1`,
          data.event.id
        )
        const seq = (parseInt(countRows[0]?.cnt ?? '0', 10) + 1).toString().padStart(3, '0')
        const refPrefix = data.event.id.substring(0, 4).toUpperCase()
        const referenceNumber = `EVT-${refPrefix}-${seq}`

        const cancellationToken = randomUUID()
        const tokenExpiresAt = new Date(lockedEvent.start_time)

        // Create registration for promoted patient
        const newRegRows = await db.$queryRawUnsafe<{ id: string }[]>(
          `INSERT INTO "${schemaName}".event_registrations
             (event_id, patient_id, reference_number, status, cancellation_token, token_expires_at)
           VALUES ($1, $2, $3, 'registered', $4, $5)
           RETURNING id`,
          data.event.id,
          waitlistEntry.patient_id,
          referenceNumber,
          cancellationToken,
          tokenExpiresAt.toISOString()
        )
        const newRegistrationId = newRegRows[0]?.id

        // Increment seats_registered
        await db.$executeRawUnsafe(
          `UPDATE "${schemaName}".events SET seats_registered = seats_registered + 1, updated_at = NOW()
           WHERE id = $1`,
          data.event.id
        )

        // Mark waitlist entry as promoted
        await db.$executeRawUnsafe(
          `UPDATE "${schemaName}".event_waiting_list SET status = 'promoted', updated_at = NOW()
           WHERE id = $1`,
          waitlistEntry.id
        )

        await db.$executeRawUnsafe('COMMIT')

        return { newRegistrationId, patientId: waitlistEntry.patient_id }
      } catch (e) {
        await db.$executeRawUnsafe('ROLLBACK')
        throw e
      }
    })

    // Fire confirmation for the promoted patient (triggers Story 14.1)
    if (promoted?.newRegistrationId) {
      await step.run('fire-promoted-confirmation', async () => {
        await inngest.send({
          name: 'event/registration.confirm' as never,
          data: { registrationId: promoted.newRegistrationId, clinicId },
          id: `${promoted.newRegistrationId}:reg-confirm`,
        })
      })
    }

    return { promoted: !!promoted }
  }
)
