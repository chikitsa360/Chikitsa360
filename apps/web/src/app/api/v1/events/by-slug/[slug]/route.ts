import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/v1/events/by-slug/[slug]
 * Public endpoint — no auth required.
 * Returns event data + clinic name for the public registration page.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Look up clinic_id from global slug table
  const slugRows = await db.$queryRawUnsafe<{ clinic_id: string }[]>(
    `SELECT clinic_id FROM event_slugs WHERE slug = $1 LIMIT 1`,
    slug
  )

  if (!slugRows[0]) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const clinicId = slugRows[0].clinic_id
  const schemaName = `clinic_${clinicId}`

  // Fetch event
  const eventRows = await db.$queryRawUnsafe<{
    id: string
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
    series_id: string | null
  }[]>(
    `SELECT id, title, description, start_time AT TIME ZONE 'UTC' AS start_time, end_time AT TIME ZONE 'UTC' AS end_time,
            venue, meeting_link, max_seats, seats_registered,
            registration_deadline AT TIME ZONE 'UTC' AS registration_deadline, fee_paise, status, slug, series_id
     FROM "${schemaName}".events
     WHERE slug = $1 LIMIT 1`,
    slug
  )

  if (!eventRows[0]) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const event = eventRows[0]

  // Get waiting list count
  const waitingRows = await db.$queryRawUnsafe<{ waiting_count: string }[]>(
    `SELECT COUNT(*)::text AS waiting_count
     FROM "${schemaName}".event_waiting_list
     WHERE event_id = $1::uuid AND status = 'waiting'`,
    event.id
  )
  const waitingCount = parseInt(waitingRows[0]?.waiting_count ?? '0', 10)

  // Fetch series label if applicable
  let seriesLabel: string | null = null
  if (event.series_id) {
    const seriesRows = await db.$queryRawUnsafe<{
      recurrence_type: string
      total_occurrences: number
    }[]>(
      `SELECT recurrence_type, total_occurrences
       FROM "${schemaName}".event_series WHERE id = $1::uuid LIMIT 1`,
      event.series_id
    )
    if (seriesRows[0]) {
      seriesLabel = `Part of ${seriesRows[0].recurrence_type} series`
    }
  }

  // Fetch clinic name
  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    select: { name: true, id: true },
  })

  return NextResponse.json({
    data: {
      event: { ...event, waiting_count: waitingCount, series_label: seriesLabel },
      clinic: { id: clinicId, name: clinic?.name ?? 'Clinic' },
    },
  })
}
