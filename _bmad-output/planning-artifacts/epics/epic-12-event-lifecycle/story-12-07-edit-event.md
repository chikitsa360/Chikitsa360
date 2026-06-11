---
story: 12.7
epic: 12
title: Edit Event
status: done
created: 2026-06-10
requirements:
  fr: [FR-3]
  nfr: [NFR-7]
---

# Story 12.7: Edit Event

## User Story

As a clinic staff member,
I want to edit an event's details via an Edit modal with scope selection for series events,
So that I can correct or update event information with the appropriate reach (this event only, this and future, or all in series).

## Context

Edit reuses `EventDetailsForm.tsx` from Story 12.3. The key new concept is the series scope selector — shown only for events that have a `series_id`. "This and future" creates a series split: a new `event_series` record is created and all events from the selected one forward get the new `series_id`.

## Acceptance Criteria

**Given** I click "Edit" on a draft or published event
**When** the edit modal opens
**Then** all form fields are pre-filled with existing values

**Given** the event has no series_id (standalone)
**When** I save edits
**Then** `PATCH /api/v1/events/[eventId]` is called with `{ ...fields, scope: 'single' }`
**And** only this event is updated

**Given** the event has a series_id
**When** the edit modal opens
**Then** a scope selector appears: "This event only" | "This and future events" | "All events in series"

**Given** scope = "this-and-future"
**When** saved
**Then** a new `event_series` record is created; all events from this event onward (ordered by start_time) have their `series_id` updated to the new series_id; events before this one keep the original series_id
**And** the updated fields are applied to all affected events

**Given** scope = "all"
**When** saved
**Then** all events sharing the current `series_id` are updated with the new field values

**Given** I try to reduce `maxSeats` below `seats_registered` (e.g., 25 registered, trying to set maxSeats to 20)
**When** I click Save
**Then** HTTP 422 is returned: `{ error: { code: 'SEATS_BELOW_REGISTERED', message: 'Cannot reduce seats below current registrations (25)' } }`
**And** the validation runs server-side in the PATCH handler

**Given** the event has status=cancelled or status=completed
**When** `PATCH /api/v1/events/[eventId]` is called
**Then** HTTP 422: `{ error: { code: 'EVENT_NOT_EDITABLE' } }`

**And** every successful edit writes to audit_log with action `EVENT_UPDATED`, metadata includes `{ scope, changedFields: string[] }`

## Technical Notes

### PATCH handler
`apps/web/src/app/api/v1/events/[eventId]/route.ts` — add `PATCH` export:
```ts
export async function PATCH(req: Request, { params }: { params: { eventId: string } }) {
  const { scope, ...fields } = await req.json()
  // validate scope in ['single', 'this-and-future', 'all']
  // check event exists and belongs to clinic
  // check status is draft or published
  // if reducing maxSeats, check against seats_registered
  // apply update based on scope
}
```

### Series split ("this-and-future")
```ts
// 1. Create new event_series record (copy recurrence_type + day_of_week from original series)
// 2. Get all events with series_id = original AND start_time >= this event's start_time, ordered by start_time ASC
// 3. UPDATE events SET series_id = newSeriesId WHERE id IN (...)
// 4. Apply field changes to all those events
// 5. Update original series total_occurrences = N - splitCount
// 6. Update new series total_occurrences = splitCount
```

### Changed fields detection
```ts
const changedFields = Object.keys(fields).filter(k => fields[k] !== existingEvent[k])
```
Store in audit log metadata. Used in Epic 14 (Story 14.3) to trigger change notifications only when meaningful fields (start_time, end_time, venue, meeting_link) change.

### Edit modal component
```
apps/web/src/components/events/EditEventModal.tsx  ← CREATE ('use client')
```
Reuses `EventDetailsForm` (Story 12.3). Adds `scope` radio group when `event.series_id` is set.

## File Locations

```
apps/web/src/app/api/v1/events/[eventId]/route.ts   ← MODIFY: add PATCH handler
apps/web/src/components/events/EditEventModal.tsx    ← CREATE
```

## Test Coverage Requirements

| Test type | What to cover |
|---|---|
| Integration | PATCH single: only one event updated; PATCH all: all series events updated; PATCH this-and-future: correct split |
| Integration | 422 when reducing seats below registered count; 422 when editing cancelled/completed |
| Unit | Scope selector renders only for series events; not for standalone events |
