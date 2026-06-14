import { inngest } from '@/lib/inngest'

/**
 * Schedules a WhatsApp confirmation message for a newly created appointment.
 * Uses Inngest idempotency key to prevent duplicate notifications (Story 3.4).
 *
 * Called from:
 * - Story 3.2 (WhatsApp flow appointment creation)
 * - Story 4.x (Web Booking Link)
 * - Story 5.x (Manual appointment entry)
 */
export async function scheduleConfirmation(
  appointmentId: string,
  clinicId: string
): Promise<void> {
  await inngest.send({
    id: `${appointmentId}:confirmation`, // Idempotency key — prevents duplicate sends
    name: 'appointment/confirmation.send',
    data: { appointmentId, clinicId },
  }).catch((err: unknown) => {
    // Non-fatal: Inngest not running in dev is expected. Log and continue.
    console.warn('[inngest] scheduleConfirmation failed (Inngest not running?):', err)
  })
}
