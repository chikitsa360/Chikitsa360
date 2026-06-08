import { inngest } from '@/lib/inngest'

/**
 * Schedules 24h and 2h WhatsApp reminder jobs for a confirmed appointment (FR-22, FR-23).
 * Uses Inngest idempotency keys to prevent duplicate sends.
 *
 * Skips jobs whose fire-time is already in the past (appointment booked < 24h / < 2h before slot).
 * Skips sample appointments entirely (FR-37).
 *
 * Called from all appointment creation paths alongside scheduleConfirmation().
 */
export async function scheduleReminders(
  appointmentId: string,
  clinicId: string,
  slotDatetime: Date,
  isSample = false
): Promise<void> {
  if (isSample) return

  const now = new Date()
  const remind24h = new Date(slotDatetime.getTime() - 24 * 60 * 60 * 1000)
  const remind2h = new Date(slotDatetime.getTime() - 2 * 60 * 60 * 1000)

  if (remind24h > now) {
    await inngest.send({
      id: `${appointmentId}:reminder-24h`,
      name: 'appointment/reminder-24h.send',
      data: { appointmentId, clinicId },
      ts: remind24h.getTime(),
    })
  }

  if (remind2h > now) {
    await inngest.send({
      id: `${appointmentId}:reminder-2h`,
      name: 'appointment/reminder-2h.send',
      data: { appointmentId, clinicId },
      ts: remind2h.getTime(),
    })
  }
}
