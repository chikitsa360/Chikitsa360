---
story: 12.5
epic: 12
title: Events List API
status: Not Started
created: 2026-06-10
requirements:
  fr: [FR-19]
  nfr: [NFR-5]
---

# Story 12.5: Events List API

## User Story

As a developer,
I want GET /api/v1/events to return a paginated, filterable list of clinic events with series metadata and waiting list counts,
So that the admin events list page can render with all required columns.

## Context

This is the read API for the events list. The POST handler was created in Story 12.2 — this story adds the GET handler to the same route file. Returns events for the session clinic only (tenant isolation). Includes `waiting_count` (computed from event_waiting_list) and `series_position` (ordering within a series) for the UI's series grouping.

## Acceptance Criteria

**Given** an authenticated staff session
**When** `GET /api/v1/events` is called (no filters)
**Then** returns `{ data: { events: Event[], total: number, page: number, limit: number } }` for the session's clinic only
**And** each event object includes: `id`, `title`, `slug`, `start_time`, `end_time`, `status`, `max_seats`, `seats_registered`, `venue`, `meeting_link`, `fee_paise`, `series_id` (nullable), `series_position` (1-based order within series, null if not in series), `waiting_count` (integer, count of `event_waiting_list` rows with status='waiting')
**And** results are ordered by `start_time ASC`
**And** default pagination: `page=1`, `limit=50`

**Given** `?status=published` query param
**When** `GET /api/v1/events?status=published`
**Then** only events with `status='published'` are returned

**Given** `?page=2&limit=20`
**When** called with pagination params
**Then** returns the correct page with correct offset/limit
**And** `total` always reflects the unfiltered count for the current status filter

**Given** an unauthenticated request
**Then** HTTP 403 is returned

**And** cross-clinic isolation: only events with `clinic_id` matching the session's clinicId are returned (never another clinic's events)

## Technical Notes

### File to modify
`apps/web/src/app/api/v1/events/route.ts` — add `GET` export alongside existing `POST`.

### SQL query
```sql
SELECT
  e.*,
  COALESCE(wl.waiting_count, 0) AS waiting_count,
  RANK() OVER (PARTITION BY e.series_id ORDER BY e.start_time ASC) AS series_position
FROM "clinic_${clinicId}".events e
LEFT JOIN (
  SELECT event_id, COUNT(*) AS waiting_count
  FROM "clinic_${clinicId}".event_waiting_list
  WHERE status = 'waiting'
  GROUP BY event_id
) wl ON wl.event_id = e.id
WHERE e.clinic_id = $1
  ${statusFilter ? `AND e.status = $2` : ''}
ORDER BY e.start_time ASC
LIMIT $${limitParam} OFFSET $${offsetParam}
```

Note: `series_position` is NULL for standalone events (no series_id). Use `RANK() OVER (PARTITION BY ...)` — when `series_id IS NULL`, each row gets rank 1 (acceptable; UI checks `series_id !== null` to determine grouping).

### Stat card aggregates
The RSC page (Story 12.4) fetches aggregate counts server-side. Add a separate helper `fetchEventAggregates(clinicId)` in `lib/events/aggregates.ts`:
```ts
export async function fetchEventAggregates(clinicId: string) {
  // total, published, upcoming (start_time > NOW() AT TIME ZONE 'Asia/Kolkata'), this_week
}
```

## File Locations

```
apps/web/src/app/api/v1/events/route.ts   ← MODIFY: add GET handler
apps/web/src/lib/events/aggregates.ts     ← CREATE: fetchEventAggregates()
```

## Test Coverage Requirements

| Test type | What to cover |
|---|---|
| Integration | GET returns only session clinic's events; status filter works; pagination correct |
| Integration | waiting_count is correct (0 when no waitlist, N when N entries) |
| Unit | fetchEventAggregates returns correct counts for total/published/upcoming/this-week |
