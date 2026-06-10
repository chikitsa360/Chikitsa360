import { db } from '@/lib/db'

export interface EventAggregates {
  total: number
  published: number
  upcoming: number
  thisWeek: number
}

/**
 * Fetches event aggregate counts for the stat cards on the events list page.
 * - total: all events for this clinic
 * - published: status='published'
 * - upcoming: start_time > NOW() IST
 * - thisWeek: start_time within current IST Mon–Sun week
 */
export async function fetchEventAggregates(clinicId: string): Promise<EventAggregates> {
  const schemaName = `clinic_${clinicId}`

  try {
    const rows = await db.$queryRawUnsafe<{
      total: string
      published: string
      upcoming: string
      this_week: string
    }[]>(
      `SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE status = 'published')::text AS published,
        COUNT(*) FILTER (
          WHERE start_time > (NOW() AT TIME ZONE 'Asia/Kolkata')
        )::text AS upcoming,
        COUNT(*) FILTER (
          WHERE start_time AT TIME ZONE 'Asia/Kolkata' >= DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Kolkata')
            AND start_time AT TIME ZONE 'Asia/Kolkata' < DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Kolkata') + INTERVAL '7 days'
        )::text AS this_week
      FROM "${schemaName}".events
      WHERE clinic_id = $1`,
      clinicId
    )

    const row = rows[0]
    return {
      total: parseInt(row?.total ?? '0', 10),
      published: parseInt(row?.published ?? '0', 10),
      upcoming: parseInt(row?.upcoming ?? '0', 10),
      thisWeek: parseInt(row?.this_week ?? '0', 10),
    }
  } catch {
    return { total: 0, published: 0, upcoming: 0, thisWeek: 0 }
  }
}
