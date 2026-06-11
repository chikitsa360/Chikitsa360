---
story: 14.3
epic: 14
title: Event Change Notification
status: review
created: 2026-06-10
requirements:
  fr: [FR-15]
  nfr: [NFR-3, NFR-4]
---

# Story 14.3: Event Change Notification

## User Story

As a registered patient,
I want to receive a WhatsApp notification when the event's date, time, or venue changes after I registered,
So that I'm not caught off guard by an updated schedule or location.

## Context

The PATCH handler (Story 12.7) already tracks `changedFields` in the audit log. This story extends it to fire an Inngest event when meaningful fields change. The Inngest function fans out to all confirmed registrants.

**WhatsApp template needed:** `event_change_notification` — variables: `{{event_name}}`, `{{new_date_time}}`, `{{new_venue_or_link}}`, `{{reference_number}}`.

## Acceptance Criteria

**Given** a published event with at least 1 confirmed registrant is edited
**When** `PATCH /api/v1/events/[eventId]` changes one of: `start_time`, `end_time`, `venue`, `meeting_link`
**Then** Inngest event fired: `{ name: 'event/change.notify', data: { eventId, clinicId, changedFields } }`

**Given** the same edit changes only `description` or `fee_paise`
**When** the PATCH runs
**Then** NO change notification Inngest event is fired (non-material change)

**Given** the `event/change.notify` Inngest event fires
**When** `event-change-notification` function runs
**Then** loads all `event_registrations` with `status='registered'` for this event
**And** for each registrant (batched 100 at a time, same rate cap as invitation blast):
  - Fetches patient phone
  - Sends WA template with new date/time, new venue/link, reference number
  - On failure: SMS fallback
**And** processes without throwing on per-patient errors

## Technical Notes

### Extend PATCH handler (Story 12.7)
After applying the edit, add:
```ts
const NOTIFY_FIELDS = new Set(['start_time', 'end_time', 'venue', 'meeting_link'])
const materialChanges = changedFields.filter(f => NOTIFY_FIELDS.has(f))
if (materialChanges.length > 0 && event.status === 'published') {
  await inngest.send({
    name: 'event/change.notify',
    data: { eventId, clinicId, changedFields: materialChanges },
  })
}
```

### Inngest function
`apps/web/src/inngest/functions/event-change-notification.ts`
Batch pattern same as `event-invitation-blast.ts` (Story 13.3).

### Rate cap
Same batch-of-100 + step.sleep('60s') pattern as invitation blast.

## File Locations

```
apps/web/src/inngest/functions/event-change-notification.ts    ← CREATE
apps/web/src/app/api/v1/events/[eventId]/route.ts              ← MODIFY: fire change notification Inngest event
apps/web/src/inngest/functions/index.ts                        ← MODIFY: export
```

## Test Coverage Requirements

| Test type | What to cover |
|---|---|
| Unit | Inngest event fired when start_time changes; NOT fired when only description changes |
| Unit | Batches 150 registrants into 2 batches |
| Integration | Sends WA to each registrant with correct fields |
