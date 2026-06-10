import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { generateSlug, suggestSlug } from '@/lib/slug'
import { generateRecurrenceDates, validateWeeklyDayOfWeek } from '@/lib/events/recurrence'
import { writeAuditLog } from '@/lib/audit'

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const recurrenceSchema = z.object({
  type: z.enum(['daily', 'weekly']),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  occurrences: z.number().int().min(2).max(52),
})

const createEventSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().optional(),
  startTime: z.string().datetime({ offset: true }),
  endTime: z.string().datetime({ offset: true }),
  venue: z.string().optional(),
  meetingLink: z.string().url().optional().or(z.literal('')),
  maxSeats: z.number().int().min(1).max(500),
  registrationDeadline: z.string().datetime({ offset: true }).optional(),
  feePaise: z.number().int().min(0).optional(),
  recurrence: recurrenceSchema.optional(),
})

// ─── Slug uniqueness helper ──────────────────────────────────────────────────

async function generateUniqueEventSlug(title: string, clinicId: string): Promise<string> {
  const schemaName = `clinic_${clinicId}`
  const base = generateSlug(title) || 'event'

  // Check base slug
  const check = async (candidate: string): Promise<boolean> => {
    const rows = await db.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "${schemaName}".events WHERE slug = $1`,
      candidate
    )
    return (rows as { id: string }[]).length === 0
  }

  if (await check(base)) return base

  // Try with numeric suffix
  for (let i = 2; i <= 99; i++) {
    const candidate = suggestSlug(base, i)
    if (await check(candidate)) return candidate
  }

  // Fallback with timestamp
  return `${base}-${Date.now()}`
}

// ─── POST /api/v1/events ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { clinicId, id: userId } = session.user
  const schemaName = `clinic_${clinicId}`

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_JSON' } }, { status: 400 })
  }

  const parsed = createEventSchema.safeParse(body)
  if (!parsed.success) {
    const details: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path.join('.')
      details[field] = issue.message
    }
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', details } }, { status: 400 })
  }

  const data = parsed.data
  const startTime = new Date(data.startTime)
  const endTime = new Date(data.endTime)

  if (endTime <= startTime) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', details: { endTime: 'End time must be after start time' } } },
      { status: 400 }
    )
  }

  // ── Single event ──────────────────────────────────────────────────────────
  if (!data.recurrence) {
    const slug = await generateUniqueEventSlug(data.title, clinicId)

    const rows = await db.$queryRawUnsafe<{ id: string; title: string; slug: string; status: string; start_time: string; end_time: string; max_seats: number; seats_registered: number }[]>(
      `INSERT INTO "${schemaName}".events
         (clinic_id, title, description, start_time, end_time, venue, meeting_link,
          max_seats, registration_deadline, fee_paise, slug, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id, title, slug, status, start_time::text, end_time::text, max_seats, seats_registered`,
      clinicId,
      data.title,
      data.description ?? null,
      startTime.toISOString(),
      endTime.toISOString(),
      data.venue ?? null,
      data.meetingLink ?? null,
      data.maxSeats,
      data.registrationDeadline ? new Date(data.registrationDeadline).toISOString() : null,
      data.feePaise ?? null,
      slug,
      userId
    )

    const event = rows[0]

    // Register slug in global lookup table for public /events/[slug] pages
    if (event?.id) {
      await db.$executeRawUnsafe(
        `INSERT INTO event_slugs (slug, clinic_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        slug,
        clinicId
      )
    }

    await writeAuditLog({
      clinicId,
      userId,
      action: 'EVENT_CREATED',
      resourceType: 'event',
      resourceId: event?.id,
      metadata: { title: data.title, recurrence: false },
    })

    return NextResponse.json({ data: { event } }, { status: 201 })
  }

  // ── Recurring event series ────────────────────────────────────────────────
  const { type, dayOfWeek, occurrences } = data.recurrence

  if (type === 'weekly' && dayOfWeek === undefined) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', details: { 'recurrence.dayOfWeek': 'dayOfWeek required for weekly recurrence' } } },
      { status: 400 }
    )
  }

  if (type === 'weekly' && dayOfWeek !== undefined) {
    const err = validateWeeklyDayOfWeek(startTime, dayOfWeek)
    if (err) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', details: { 'recurrence.dayOfWeek': err } } },
        { status: 400 }
      )
    }
  }

  // Create event_series record
  const seriesRows = await db.$queryRawUnsafe<{ id: string }[]>(
    `INSERT INTO "${schemaName}".event_series (clinic_id, recurrence_type, recurrence_day_of_week, total_occurrences)
     VALUES ($1,$2,$3,$4)
     RETURNING id`,
    clinicId,
    type,
    dayOfWeek ?? null,
    occurrences
  )
  const seriesId = seriesRows[0]?.id

  // Generate dates
  const dates = generateRecurrenceDates({
    baseStartTime: startTime,
    baseEndTime: endTime,
    type,
    dayOfWeek,
    occurrences,
  })

  const events: { id: string; title: string; slug: string; status: string; start_time: string; end_time: string }[] = []

  for (let i = 0; i < dates.length; i++) {
    const { startTime: evStart, endTime: evEnd } = dates[i]!
    const titleSuffix = occurrences > 1 ? ` — Session ${i + 1}` : ''
    const eventTitle = `${data.title}${titleSuffix}`
    const slug = await generateUniqueEventSlug(eventTitle, clinicId)

    const rows = await db.$queryRawUnsafe<{ id: string; title: string; slug: string; status: string; start_time: string; end_time: string }[]>(
      `INSERT INTO "${schemaName}".events
         (clinic_id, series_id, title, description, start_time, end_time, venue, meeting_link,
          max_seats, registration_deadline, fee_paise, slug, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id, title, slug, status, start_time::text, end_time::text`,
      clinicId,
      seriesId,
      eventTitle,
      data.description ?? null,
      evStart.toISOString(),
      evEnd.toISOString(),
      data.venue ?? null,
      data.meetingLink ?? null,
      data.maxSeats,
      data.registrationDeadline ? new Date(data.registrationDeadline).toISOString() : null,
      data.feePaise ?? null,
      slug,
      userId
    )
    if (rows[0]) {
      events.push(rows[0])
      // Register each event slug in global lookup table
      const evSlug = rows[0].slug
      await db.$executeRawUnsafe(
        `INSERT INTO event_slugs (slug, clinic_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        evSlug,
        clinicId
      )
    }
  }

  await writeAuditLog({
    clinicId,
    userId,
    action: 'EVENT_CREATED',
    resourceType: 'event',
    resourceId: seriesId,
    metadata: { title: data.title, recurrence: true, type, occurrences },
  })

  return NextResponse.json({
    data: {
      series: { id: seriesId, recurrence_type: type, recurrence_day_of_week: dayOfWeek, total_occurrences: occurrences },
      events,
    },
  }, { status: 201 })
}

// ─── GET /api/v1/events ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { clinicId } = session.user
  const schemaName = `clinic_${clinicId}`

  const url = req.nextUrl
  const statusFilter = url.searchParams.get('status')
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10)))
  const offset = (page - 1) * limit

  const validStatuses = ['draft', 'published', 'cancelled', 'completed']
  if (statusFilter && !validStatuses.includes(statusFilter)) {
    return NextResponse.json({ error: { code: 'INVALID_STATUS' } }, { status: 400 })
  }

  const whereStatus = statusFilter ? `AND e.status = $2` : ''

  const queryArgs: unknown[] = [clinicId]
  if (statusFilter) queryArgs.push(statusFilter)

  // Count query
  const countRows = await db.$queryRawUnsafe<{ total: string }[]>(
    `SELECT COUNT(*)::text AS total
     FROM "${schemaName}".events e
     WHERE e.clinic_id = $1 ${whereStatus}`,
    ...queryArgs
  )
  const total = parseInt(countRows[0]?.total ?? '0', 10)

  // Data query with waiting_count and series_position
  const limitParam = queryArgs.length + 1
  const offsetParam = queryArgs.length + 2

  const events = await db.$queryRawUnsafe(
    `SELECT
       e.id, e.title, e.slug, e.start_time::text, e.end_time::text,
       e.status, e.max_seats, e.seats_registered,
       e.venue, e.meeting_link, e.fee_paise, e.series_id,
       COALESCE(wl.waiting_count, 0)::int AS waiting_count,
       CASE WHEN e.series_id IS NOT NULL
         THEN RANK() OVER (PARTITION BY e.series_id ORDER BY e.start_time ASC)
         ELSE NULL
       END AS series_position
     FROM "${schemaName}".events e
     LEFT JOIN (
       SELECT event_id, COUNT(*)::int AS waiting_count
       FROM "${schemaName}".event_waiting_list
       WHERE status = 'waiting'
       GROUP BY event_id
     ) wl ON wl.event_id = e.id
     WHERE e.clinic_id = $1 ${whereStatus}
     ORDER BY e.start_time ASC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    ...queryArgs,
    limit,
    offset
  )

  return NextResponse.json({
    data: { events, total, page, limit },
  })
}
