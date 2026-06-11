---
story: 15.1
epic: 15
title: Attendance Marking API
status: done
created: 2026-06-10
requirements:
  fr: [FR-22]
  nfr: [NFR-7]
---

# Story 15.1: Attendance Marking API

## User Story

As a developer,
I want PATCH /api/v1/events/[eventId]/registrations/[registrationId] to support mark-attended, mark-no-show, and remove actions,
So that staff can record post-event attendance and manage registrations via the UI.

## Context

This is the API layer for attendance. The UI is built in Story 15.2. All roles can mark attendance (OWNER, DOCTOR, RECEPTIONIST). The 422 gate on `event.start_time` prevents pre-event marking. The `remove` action (Story 15.3) fires the same `event/registration.cancelled` Inngest event as self-cancellation (Story 14.6).

## Acceptance Criteria

**Given** an authenticated staff session
**When** `PATCH /api/v1/events/[eventId]/registrations/[registrationId]` with `{ action: 'mark-attended' }`
**Then** if `event.start_time > NOW()`: HTTP 422 `{ error: { code: 'EVENT_NOT_STARTED' } }`
**And** if registration status != 'registered': HTTP 422 `{ error: { code: 'INVALID_STATUS', message: 'Can only mark attendance for registered participants' } }`
**And** on success: updates registration `status = 'attended'`, `updated_at = NOW()`; HTTP 200 with updated registration
**And** audit_log entry: action=`ATTENDANCE_MARKED`, metadata: `{ action: 'attended', registrationId }`

**When** called with `{ action: 'mark-no-show' }`
**Then** same gates; on success: `status = 'no_show'`
**And** audit_log entry: action=`ATTENDANCE_MARKED`, metadata: `{ action: 'no_show' }`

**When** called with `{ action: 'remove' }` (for Story 15.3 — implement both actions in this API story)
**Then** no start_time gate (can remove before event starts)
**And** if status='cancelled': HTTP 422 `{ error: { code: 'ALREADY_CANCELLED' } }`
**And** on success: `status = 'cancelled'`, `cancellation_token = NULL`, `seats_registered -= 1` (with SELECT FOR UPDATE guard)
**And** Inngest event: `{ name: 'event/registration.cancelled', data: { registrationId, clinicId } }`
**And** audit_log: action=`REGISTRANT_REMOVED`

**Given** an unauthenticated request or cross-clinic eventId
**Then** HTTP 403

## Technical Notes

### File to create
`apps/web/src/app/api/v1/events/[eventId]/registrations/[registrationId]/route.ts`

### Discriminated union on action
```ts
const { action } = await req.json()
// action: 'mark-attended' | 'mark-no-show' | 'remove'
```

### start_time gate (IST-aware)
```ts
const eventStartMs = new Date(event.start_time).getTime()
if (action !== 'remove' && eventStartMs > Date.now()) {
  return NextResponse.json({ error: { code: 'EVENT_NOT_STARTED' } }, { status: 422 })
}
```

### Remove with SELECT FOR UPDATE (same as Story 14.5/13.5)
```sql
BEGIN;
SELECT id, seats_registered FROM events WHERE id = $1 FOR UPDATE;
UPDATE event_registrations SET status='cancelled', cancellation_token=NULL, updated_at=NOW() WHERE id=$2;
UPDATE events SET seats_registered = GREATEST(0, seats_registered - 1) WHERE id=$1;
COMMIT;
```

## File Locations

```
apps/web/src/app/api/v1/events/[eventId]/registrations/[registrationId]/route.ts   ← CREATE
```

## Test Coverage Requirements

| Test type | What to cover |
|---|---|
| Integration | mark-attended: 422 before event starts; 422 if status != registered; success sets attended |
| Integration | mark-no-show: same gate; success sets no_show |
| Integration | remove: success decrements seats, fires Inngest event |
| Integration | 403 for unauthenticated or cross-clinic |
