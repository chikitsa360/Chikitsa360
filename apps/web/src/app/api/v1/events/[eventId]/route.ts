import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { writeAuditLog } from '@/lib/audit'
import { inngest } from '@/lib/inngest'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventRow {
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
}

// ─── GET /api/v1/events/[eventId] ────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { clinicId } = session.user
  const { eventId } = await params
  const schemaName = `clinic_${clinicId}`

  const rows = await db.$queryRawUnsafe<(EventRow & {
    registered_count: number
    waiting_count: number
    invited_sent_count: number
    series_recurrence_type: string | null
    series_total_occurrences: number | null
  })[]>(
    `SELECT
       e.*,
       e.start_time AT TIME ZONE 'UTC' AS start_time,
       e.end_time AT TIME ZONE 'UTC' AS end_time,
       e.registration_deadline AT TIME ZONE 'UTC' AS registration_deadline,
       e.created_at AT TIME ZONE 'UTC' AS created_at,
       e.updated_at AT TIME ZONE 'UTC' AS updated_at,
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

  if (!rows[0]) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ data: { event: rows[0] } })
}

// ─── Zod schema for field edits ───────────────────────────────────────────────

const editEventSchema = z.object({
  scope: z.enum(['single', 'this-and-future', 'all']).default('single'),
  title: z.string().min(1).max(120).optional(),
  description: z.string().optional().nullable(),
  startTime: z.string().datetime({ offset: true }).optional(),
  endTime: z.string().datetime({ offset: true }).optional(),
  venue: z.string().optional().nullable(),
  meetingLink: z.string().url().optional().nullable().or(z.literal('')),
  maxSeats: z.number().int().min(1).max(500).optional(),
  registrationDeadline: z.string().datetime({ offset: true }).optional().nullable(),
  feePaise: z.number().int().min(0).optional().nullable(),
})

// ─── PATCH /api/v1/events/[eventId] ──────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { clinicId, id: userId } = session.user
  const { eventId } = await params
  const schemaName = `clinic_${clinicId}`

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_JSON' } }, { status: 400 })
  }

  // Fetch the existing event
  const existing = await db.$queryRawUnsafe<EventRow[]>(
    `SELECT * FROM "${schemaName}".events WHERE id = $1 AND clinic_id = $2`,
    eventId,
    clinicId
  )

  if (!existing[0]) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const event = existing[0]

  // ── Action-based handlers (publish / cancel) ─────────────────────────────
  if ('action' in body) {
    const action = body.action as string

    const validTransitions: Record<string, string[]> = {
      publish: ['draft'],
      cancel: ['published'],
    }

    if (!validTransitions[action]?.includes(event.status)) {
      return NextResponse.json(
        { error: { code: 'INVALID_STATUS_TRANSITION', message: `Cannot ${action} an event with status '${event.status}'` } },
        { status: 422 }
      )
    }

    if (action === 'publish') {
      const updated = await db.$queryRawUnsafe<EventRow[]>(
        `UPDATE "${schemaName}".events SET status = 'published', updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        eventId
      )

      await writeAuditLog({
        clinicId,
        userId,
        action: 'EVENT_PUBLISHED',
        resourceType: 'event',
        resourceId: eventId,
      })

      return NextResponse.json({ data: { event: updated[0] } })
    }

    if (action === 'cancel') {
      const updated = await db.$queryRawUnsafe<EventRow[]>(
        `UPDATE "${schemaName}".events SET status = 'cancelled', updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        eventId
      )

      // Fire Inngest stub event for Epic 14 to implement
      await inngest.send({
        name: 'event/cancel.notify' as never,
        data: { eventId, clinicId },
      })

      await writeAuditLog({
        clinicId,
        userId,
        action: 'EVENT_CANCELLED',
        resourceType: 'event',
        resourceId: eventId,
      })

      return NextResponse.json({ data: { event: updated[0] } })
    }

    return NextResponse.json({ error: { code: 'INVALID_ACTION' } }, { status: 400 })
  }

  // ── Field edit handler ────────────────────────────────────────────────────
  if (event.status === 'cancelled' || event.status === 'completed') {
    return NextResponse.json(
      { error: { code: 'EVENT_NOT_EDITABLE', message: 'Cannot edit a cancelled or completed event' } },
      { status: 422 }
    )
  }

  const parsed = editEventSchema.safeParse(body)
  if (!parsed.success) {
    const details: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      details[issue.path.join('.')] = issue.message
    }
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', details } }, { status: 400 })
  }

  const { scope, ...fields } = parsed.data

  // Validate endTime > startTime if both provided
  if (fields.startTime && fields.endTime) {
    if (new Date(fields.endTime) <= new Date(fields.startTime)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', details: { endTime: 'End time must be after start time' } } },
        { status: 400 }
      )
    }
  }

  // Validate maxSeats not below seats_registered
  if (fields.maxSeats !== undefined && fields.maxSeats < event.seats_registered) {
    return NextResponse.json(
      { error: { code: 'SEATS_BELOW_REGISTERED', message: `Cannot reduce seats below current registrations (${event.seats_registered})` } },
      { status: 422 }
    )
  }

  // Build the SET clause
  const setClauses: string[] = ['updated_at = NOW()']
  const updateArgs: unknown[] = []
  let paramIdx = 1

  const fieldMap: Record<string, string> = {
    title: 'title',
    description: 'description',
    startTime: 'start_time',
    endTime: 'end_time',
    venue: 'venue',
    meetingLink: 'meeting_link',
    maxSeats: 'max_seats',
    registrationDeadline: 'registration_deadline',
    feePaise: 'fee_paise',
  }

  for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
    if (jsKey in fields && fields[jsKey as keyof typeof fields] !== undefined) {
      const val = fields[jsKey as keyof typeof fields]
      setClauses.push(`${dbCol} = $${paramIdx}`)
      updateArgs.push(val ?? null)
      paramIdx++
    }
  }

  if (setClauses.length === 1) {
    // Only updated_at — nothing to update
    return NextResponse.json({ data: { event } })
  }

  const changedFields = Object.keys(fields).filter(k => fields[k as keyof typeof fields] !== undefined)

  // Determine which event IDs to update based on scope
  let eventIdsToUpdate: string[] = [eventId]

  if (scope === 'this-and-future' && event.series_id) {
    // Create new series, move events from this one forward
    const seriesRows = await db.$queryRawUnsafe<{ recurrence_type: string; recurrence_day_of_week: number | null; total_occurrences: number }[]>(
      `SELECT recurrence_type, recurrence_day_of_week, total_occurrences FROM "${schemaName}".event_series WHERE id = $1`,
      event.series_id
    )
    const originalSeries = seriesRows[0]

    // Events from this one onward (ordered by start_time)
    const futureEvents = await db.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "${schemaName}".events
       WHERE series_id = $1 AND start_time >= (SELECT start_time FROM "${schemaName}".events WHERE id = $2)
       ORDER BY start_time ASC`,
      event.series_id,
      eventId
    )
    const splitCount = futureEvents.length
    const originalCount = (originalSeries?.total_occurrences ?? splitCount) - splitCount

    // Create new series
    const newSeriesRows = await db.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO "${schemaName}".event_series (clinic_id, recurrence_type, recurrence_day_of_week, total_occurrences)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      clinicId,
      originalSeries?.recurrence_type ?? 'weekly',
      originalSeries?.recurrence_day_of_week ?? null,
      splitCount
    )
    const newSeriesId = newSeriesRows[0]?.id

    // Update original series occurrence count
    if (originalCount > 0) {
      await db.$executeRawUnsafe(
        `UPDATE "${schemaName}".event_series SET total_occurrences = $1 WHERE id = $2`,
        originalCount,
        event.series_id
      )
    }

    // Move future events to new series
    if (newSeriesId) {
      await db.$executeRawUnsafe(
        `UPDATE "${schemaName}".events SET series_id = $1
         WHERE id = ANY($2::uuid[])`,
        newSeriesId,
        futureEvents.map(e => e.id)
      )
    }

    eventIdsToUpdate = futureEvents.map(e => e.id)
  } else if (scope === 'all' && event.series_id) {
    const allEvents = await db.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "${schemaName}".events WHERE series_id = $1`,
      event.series_id
    )
    eventIdsToUpdate = allEvents.map(e => e.id)
  }

  // Apply update to all affected events
  const setClause = setClauses.join(', ')
  const idxForIds = paramIdx
  await db.$executeRawUnsafe(
    `UPDATE "${schemaName}".events SET ${setClause}
     WHERE id = ANY($${idxForIds}::uuid[])`,
    ...updateArgs,
    eventIdsToUpdate
  )

  // Fetch updated event
  const updated = await db.$queryRawUnsafe<EventRow[]>(
    `SELECT * FROM "${schemaName}".events WHERE id = $1`,
    eventId
  )

  await writeAuditLog({
    clinicId,
    userId,
    action: 'EVENT_UPDATED',
    resourceType: 'event',
    resourceId: eventId,
    metadata: { scope, changedFields },
  })

  // Fire change notification for material field changes on published events (Story 14.3)
  const NOTIFY_FIELDS = new Set(['startTime', 'endTime', 'venue', 'meetingLink'])
  const materialChanges = changedFields.filter(f => NOTIFY_FIELDS.has(f))
  if (materialChanges.length > 0 && event.status === 'published') {
    await inngest.send({
      name: 'event/change.notify' as never,
      data: { eventId, clinicId, changedFields: materialChanges },
    })
  }

  return NextResponse.json({ data: { event: updated[0] } })
}
