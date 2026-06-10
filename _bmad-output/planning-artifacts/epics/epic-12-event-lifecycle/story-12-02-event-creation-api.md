---
story: 12.2
epic: 12
title: Event Creation API
status: Not Started
created: 2026-06-10
requirements:
  fr: [FR-1, FR-2]
  nfr: [NFR-5, NFR-7]
  tech: [TECH-1, TECH-6]
---

# Story 12.2: Event Creation API

## User Story

As a clinic staff member (OWNER, DOCTOR, or RECEPTIONIST),
I want a POST /api/v1/events endpoint that creates a single event or generates a recurring series,
So that new events are persisted as drafts with all required fields validated.

## Context

This is the first API story in the Events module. The tenant DB tables from Story 12.1 must be in place. The API follows the existing pattern for authenticated API routes: read `clinicId` from session, use `db.$queryRawUnsafe()` for tenant-schema queries, write audit log, return standard envelope `{ data, error }`.

Recurrence generates N independent Event records (up to 52) linked by a single `event_series` record. Each event is fully independent after generation — no "virtual" events.

## Acceptance Criteria

**Given** an authenticated staff session with any role (OWNER, DOCTOR, RECEPTIONIST)
**When** `POST /api/v1/events` is called with a valid non-recurring payload:
```json
{
  "title": "Weight Management Workshop",
  "description": "...",
  "startTime": "2026-07-01T10:00:00+05:30",
  "endTime": "2026-07-01T12:00:00+05:30",
  "venue": "Clinic Hall A",
  "maxSeats": 30
}
```
**Then** a single `events` row is created with `status='draft'`, `seats_registered=0`, a generated `slug`, and the session user's id in `created_by`
**And** HTTP 201 is returned with `{ data: { event: { id, title, slug, status, ... } } }`

**Given** a valid recurring payload:
```json
{
  "title": "Yoga Class",
  "startTime": "2026-07-02T07:00:00+05:30",
  "endTime": "2026-07-02T08:00:00+05:30",
  "maxSeats": 20,
  "recurrence": { "type": "weekly", "dayOfWeek": 3, "occurrences": 8 }
}
```
**When** `POST /api/v1/events` is called
**Then** one `event_series` row is created and 8 `events` rows are generated, all linked via `series_id`
**And** each event's `start_time` and `end_time` are calculated by adding N weeks to the base date
**And** HTTP 201 is returned with `{ data: { series: {...}, events: [...] } }`

**Given** invalid input (title missing, endTime before startTime, maxSeats > 500, occurrences > 52)
**When** `POST /api/v1/events` is called
**Then** HTTP 400 is returned with `{ error: { code: 'VALIDATION_ERROR', details: { field: message } } }`

**Given** an unauthenticated request
**When** `POST /api/v1/events` is called
**Then** HTTP 403 is returned

**And** every successful creation writes to audit_log with action `EVENT_CREATED`, resourceType `event`, resourceId = new event id (or series id for recurring)

## Technical Notes

### File to create
`apps/web/src/app/api/v1/events/route.ts` — export `POST` handler only (GET is Story 12.5).

### Session & clinic resolution
```ts
const session = await getServerSession(authOptions)
if (!session?.user?.clinicId) return NextResponse.json({ error: ... }, { status: 403 })
const { clinicId, id: userId } = session.user
```

### Slug generation
```ts
import { generateSlug } from '@/lib/slug'
const slug = await generateSlug(title, async (candidate) => {
  // check uniqueness in tenant schema
  const rows = await db.$queryRawUnsafe(`SELECT id FROM "clinic_${clinicId}".events WHERE slug = $1`, candidate)
  return (rows as any[]).length === 0
})
```

### Recurrence calculation (weekly)
```ts
const baseDate = new Date(startTime)
for (let i = 0; i < occurrences; i++) {
  const offset = i * 7 // days
  const eventStart = new Date(baseDate)
  eventStart.setDate(eventStart.getDate() + offset)
  // ...
}
```
For daily: `offset = i * 1 day`. Ensure day-of-week matches the requested `dayOfWeek` for weekly recurrence — the base date provided by the user should already be the correct day of week; validate and return 400 if not.

### Audit log
```ts
import { writeAuditLog } from '@/lib/audit'
await writeAuditLog(clinicId, userId, 'EVENT_CREATED', 'event', newEvent.id, { title, recurrence: !!recurrence })
```

### Reference number generation (for Story 12.2, store counter approach)
Reference numbers (EVT-XXXX-XXX) are generated at registration time (Story 13.5), not event creation. No action needed here.

### Validation
Use Zod schema. Required: `title` (1–120 chars), `startTime` (ISO), `endTime` > `startTime`, `maxSeats` (1–500). Optional: `description`, `venue`, `meetingLink`, `registrationDeadline`, `feePaise` (>= 0), `recurrence`.

## File Locations

```
apps/web/src/app/api/v1/events/route.ts   ← CREATE: POST handler
apps/web/src/lib/events/                  ← CREATE: event helpers (recurrence generation etc.)
  recurrence.ts                           ← generateRecurrenceDates(base, type, dayOfWeek, count)
```

## Test Coverage Requirements

| Test type | What to cover |
|---|---|
| Unit | Zod validation: valid inputs pass; each invalid field returns correct error |
| Unit | `generateRecurrenceDates()`: weekly 8 occurrences returns correct dates; daily 5 occurrences; dayOfWeek mismatch returns error |
| Integration | POST creates single event; POST with recurrence creates series + N events; cross-clinic isolation (clinicId from session, not body) |
| Integration | Audit log entry created for both single and recurring creates |
