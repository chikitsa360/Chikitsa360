import { inngest } from '@/lib/inngest'
import { db } from '@/lib/db'

/**
 * Cron function that auto-completes published events 24h after their end_time.
 * Runs every hour. FR-22, Story 15.4.
 * Iterates all clinic schemas via Prisma Clinic.findMany.
 */
export const eventAutoComplete = inngest.createFunction(
  { id: 'event-auto-complete', retries: 1 },
  { cron: '0 * * * *' },
  async ({ step }) => {
    // Get all clinics (most reliable — covers clinics with no events yet)
    const clinics = await step.run('load-clinics', async () => {
      return db.clinic.findMany({ select: { id: true } })
    })

    let totalCompleted = 0

    for (const clinic of clinics) {
      await step.run(`complete-events-${clinic.id}`, async () => {
        const schemaName = `clinic_${clinic.id}`

        // Update all published events where end_time < NOW() - 24h
        const updated = await db.$queryRawUnsafe<{ id: string }[]>(
          `UPDATE "${schemaName}".events
           SET status = 'completed', updated_at = NOW()
           WHERE status = 'published'
           AND end_time < NOW() - INTERVAL '24 hours'
           RETURNING id`
        )

        // Write audit log entry for each completed event
        for (const ev of updated) {
          try {
            await db.$executeRawUnsafe(
              `INSERT INTO audit.audit_logs (clinic_id, user_id, action, resource_type, resource_id, metadata)
               VALUES ($1::uuid, NULL, 'EVENT_AUTO_COMPLETED', 'event', $2, '{"automated":true}'::jsonb)`,
              clinic.id,
              ev.id
            )
          } catch { /* non-fatal — don't block completion */ }

          totalCompleted++
        }
      })
    }

    return { completed: totalCompleted, clinics: clinics.length }
  }
)
