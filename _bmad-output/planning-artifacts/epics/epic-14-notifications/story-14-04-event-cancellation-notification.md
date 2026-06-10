---
story: 14.4
epic: 14
title: Event Cancellation Notification
status: Not Started
created: 2026-06-10
requirements:
  fr: [FR-16]
  nfr: [NFR-3, NFR-4]
---

# Story 14.4: Event Cancellation Notification

## User Story

As a registered patient or waiting list entrant,
I want to receive a WhatsApp notification when the event is cancelled,
So that I know not to plan to attend.

## Context

The `event/cancel.notify` Inngest event is already fired from Story 12.8 (cancel action). This story implements the consumer. Notifies both confirmed registrants AND waiting list entries (they have invested interest).

**WhatsApp template needed:** `event_cancellation` — variables: `{{event_name}}`, `{{original_date_time}}`, `{{clinic_name}}`.

## Acceptance Criteria

**Given** the `event/cancel.notify` Inngest event fires with `{ eventId, clinicId }`
**When** `event-cancel-notification` function runs
**Then** loads all `event_registrations` with `status='registered'` AND all `event_waiting_list` with `status='waiting'` for this event
**And** sends WA cancellation message to each unique patient phone: "Your event [event_name] on [date] has been cancelled by [clinic_name]."
**And** on WA failure: SMS fallback
**And** processes in batches of 100 with 60s sleep between batches
**And** exits cleanly if the event no longer exists

## Technical Notes

### Inngest function
`apps/web/src/inngest/functions/event-cancel-notification.ts`

```ts
// Combine registrants + waitlist into unique phone set
const registrants = await loadRegistrants(eventId, clinicId) // status=registered
const waitlisted = await loadWaitlist(eventId, clinicId) // status=waiting
const recipients = dedupeByPhone([...registrants, ...waitlisted])
```

### Dedup by phone
Some patients may be on both lists (edge case). Deduplicate by `patient_id` before sending.

### Batch pattern
Same as `event-invitation-blast.ts` — chunk into 100s, sleep between batches.

## File Locations

```
apps/web/src/inngest/functions/event-cancel-notification.ts   ← CREATE
apps/web/src/inngest/functions/index.ts                       ← MODIFY: export
```

## Test Coverage Requirements

| Test type | What to cover |
|---|---|
| Unit | Both registrants and waitlist recipients included; deduplication works |
| Unit | Empty registrants + waitlist: function exits cleanly |
| Integration | WA sent to each recipient; SMS fallback on WA failure |
