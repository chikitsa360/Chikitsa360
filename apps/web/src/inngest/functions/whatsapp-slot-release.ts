import { inngest } from '@/lib/inngest'
import { db } from '@/lib/db'

/**
 * Delayed 5-minute slot hold releaser (Story 3.1).
 * Fires immediately but sleeps 5 min before checking if booking completed.
 * If no appointment was created → releases the reserved slot.
 */
export const whatsappSlotRelease = inngest.createFunction(
  { id: 'whatsapp-slot-release', name: 'WhatsApp: Release Held Slot' },
  { event: 'whatsapp/slot.release' },
  async ({ event, step }) => {
    const { clinicId, slotId } = event.data
    if (!clinicId || !slotId) return

    // Wait 5 minutes before checking
    await step.sleep('hold-reservation', '5m')

    return step.run('check-and-release', async () => {
      const schemaName = `clinic_${clinicId}`

      // Check if an appointment was created for this slot
      const appointments = await db.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM "${schemaName}".appointments WHERE slot_id = $1::uuid LIMIT 1`,
        slotId
      )

      if (appointments.length > 0) {
        return { released: false, reason: 'appointment_exists' }
      }

      // No appointment — release the held slot
      await db.$executeRawUnsafe(
        `UPDATE "${schemaName}".slots SET status = 'available'
         WHERE id = $1::uuid AND status = 'reserved'`,
        slotId
      )

      return { released: true }
    })
  }
)
