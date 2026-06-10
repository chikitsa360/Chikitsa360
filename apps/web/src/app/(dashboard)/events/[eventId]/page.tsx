import { auth } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { EventDetailClient } from '@/components/events/EventDetailClient'

export const metadata = { title: 'Event Detail' }

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const session = await auth()
  if (!session?.user?.clinicId) redirect('/login')

  const { clinicId } = session.user
  const { eventId } = await params
  const schemaName = `clinic_${clinicId}`

  type EventDetailRow = {
    id: string
    clinic_id: string
    series_id: string | null
    title: string
    description: string | null
    start_time: string
    end_time: string
    venue: string | null
    meeting_link: string | null
    max_seats: number
    seats_registered: number
    registration_deadline: string | null
    fee_paise: number | null
    status: string
    slug: string
    created_by: string
    created_at: string
    updated_at: string
    registered_count: number
    waiting_count: number
    invited_sent_count: number
    series_recurrence_type: string | null
    series_total_occurrences: number | null
  }

  let event: EventDetailRow | null = null

  try {
    const rows = await db.$queryRawUnsafe<EventDetailRow[]>(
      `SELECT
         e.*,
         e.start_time::text AS start_time,
         e.end_time::text AS end_time,
         e.registration_deadline::text AS registration_deadline,
         e.created_at::text AS created_at,
         e.updated_at::text AS updated_at,
         COALESCE(reg.registered_count, 0)::int AS registered_count,
         COALESCE(wl.waiting_count, 0)::int AS waiting_count,
         COALESCE(inv.invited_sent_count, 0)::int AS invited_sent_count,
         es.recurrence_type AS series_recurrence_type,
         es.total_occurrences AS series_total_occurrences
       FROM "${schemaName}".events e
       LEFT JOIN (
         SELECT event_id, COUNT(*)::int AS registered_count
         FROM "${schemaName}".event_registrations
         WHERE status != 'cancelled'
         GROUP BY event_id
       ) reg ON reg.event_id = e.id
       LEFT JOIN (
         SELECT event_id, COUNT(*)::int AS waiting_count
         FROM "${schemaName}".event_waiting_list
         WHERE status = 'waiting'
         GROUP BY event_id
       ) wl ON wl.event_id = e.id
       LEFT JOIN (
         SELECT event_id, COUNT(*)::int AS invited_sent_count
         FROM "${schemaName}".event_invitations
         WHERE delivery_status = 'sent'
         GROUP BY event_id
       ) inv ON inv.event_id = e.id
       LEFT JOIN "${schemaName}".event_series es ON es.id = e.series_id
       WHERE e.id = $1 AND e.clinic_id = $2`,
      eventId,
      clinicId
    )
    event = rows[0] ?? null
  } catch {
    // Tenant schema not provisioned or event tables don't exist yet
  }

  if (!event) notFound()

  return <EventDetailClient event={event} />
}
