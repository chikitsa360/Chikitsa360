import { inngest } from '@/lib/inngest'
import { db } from '@/lib/db'
import { redis } from '@/lib/redis'

/** Redis key: maps whatsapp messageId → appointmentId + clinicId (24h TTL) */
export function waMessageKey(messageId: string): string {
  return `wa:msg:${messageId}`
}

/**
 * Processes WhatsApp delivery status webhooks (Story 3.1, Story 3.4).
 * Correlates messageId → appointmentId via Redis, updates delivery status,
 * and triggers SMS fallback on delivery failure.
 */
export const whatsappStatusUpdate = inngest.createFunction(
  { id: 'whatsapp-status-update', name: 'WhatsApp: Process Delivery Status' },
  { event: 'whatsapp/status.update' },
  async ({ event }) => {
    const { messageId, status } = event.data

    // Look up appointment via Redis mapping stored by confirmation send job
    const mapping = await redis.get<{ appointmentId: string; clinicId: string }>(
      waMessageKey(messageId)
    )

    if (!mapping) {
      // No mapping — status for a non-tracked message (e.g. consent/slot messages)
      return { processed: false, reason: 'no_mapping' }
    }

    const { appointmentId, clinicId } = mapping
    const schemaName = `clinic_${clinicId}`

    // Update appointment delivery status
    await db.$executeRawUnsafe(
      `UPDATE "${schemaName}".appointments
       SET whatsapp_delivery_status = $1, updated_at = NOW()
       WHERE id = $2::uuid`,
      status,
      appointmentId
    )

    if (status === 'failed') {
      // Record failure and trigger SMS fallback
      await db.$executeRawUnsafe(
        `UPDATE "${schemaName}".appointments
         SET delivery_failures = COALESCE(delivery_failures, '[]'::jsonb) || $1::jsonb,
             updated_at = NOW()
         WHERE id = $2::uuid`,
        JSON.stringify([{ channel: 'whatsapp', failedAt: new Date().toISOString(), reason: 'delivery_failed' }]),
        appointmentId
      )

      await inngest.send({
        name: 'appointment/sms-fallback.send',
        data: { appointmentId, clinicId },
      })
    }

    return { processed: true, messageId, status, appointmentId }
  }
)
