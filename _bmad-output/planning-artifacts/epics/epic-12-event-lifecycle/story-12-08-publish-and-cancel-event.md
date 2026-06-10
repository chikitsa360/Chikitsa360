---
story: 12.8
epic: 12
title: Publish and Cancel Event
status: Not Started
created: 2026-06-10
requirements:
  fr: [FR-4, FR-5]
  nfr: [NFR-7]
---

# Story 12.8: Publish and Cancel Event

## User Story

As a clinic staff member,
I want to publish a draft event (making it open for registration) and cancel a published event (closing it and notifying registrants),
So that I can control the event lifecycle.

## Context

Publish and Cancel are discrete status transitions on the same PATCH endpoint using a discriminated union on `action`. Cancel fires an Inngest stub event — the actual notification function is implemented in Epic 14 Story 14.4. This mirrors the `appointment/cancellation.send` pattern from Epic 05.

## Acceptance Criteria

**Given** event has status=draft
**When** `PATCH /api/v1/events/[eventId]` with `{ action: 'publish' }`
**Then** event status updated to 'published'
**And** HTTP 200 with updated event data
**And** audit_log entry: action=`EVENT_PUBLISHED`

**Given** event has status=published and I click "Cancel Event" then confirm the dialog
**When** `PATCH /api/v1/events/[eventId]` with `{ action: 'cancel' }`
**Then** event status updated to 'cancelled'
**And** Inngest event fired: `inngest.send({ name: 'event/cancel.notify', data: { eventId, clinicId } })`
**And** audit_log entry: action=`EVENT_CANCELLED`
**And** HTTP 200 with updated event data

**Given** `{ action: 'publish' }` on an already-published, cancelled, or completed event
**Then** HTTP 422: `{ error: { code: 'INVALID_STATUS_TRANSITION', message: 'Event is already published/cancelled/completed' } }`

**Given** `{ action: 'cancel' }` on a draft or completed event
**Then** HTTP 422: `{ error: { code: 'INVALID_STATUS_TRANSITION' } }`

**And** UI: after publish, status badge updates to Published (blue) without page reload
**And** UI: after cancel, status badge updates to Cancelled and action buttons disappear

## Technical Notes

### PATCH handler extension
Extend `apps/web/src/app/api/v1/events/[eventId]/route.ts` to handle the `action` discriminated union alongside the existing edit fields:
```ts
if ('action' in body) {
  // handle publish / cancel actions
} else {
  // handle field edit (scope-based update from Story 12.7)
}
```

### Status transition guard
```ts
const validTransitions: Record<string, string[]> = {
  publish: ['draft'],
  cancel: ['published'],
}
if (!validTransitions[action]?.includes(event.status)) {
  return NextResponse.json({ error: { code: 'INVALID_STATUS_TRANSITION' } }, { status: 422 })
}
```

### Inngest stub
```ts
import { inngest } from '@/lib/inngest'
await inngest.send({
  name: 'event/cancel.notify',
  data: { eventId: params.eventId, clinicId },
})
```
No Inngest function needs to exist yet — the event will queue without a consumer and be processed when Epic 14 implements the function.

### Confirmation dialog (UI)
```tsx
// In EventDetailClient.tsx
const [showCancelConfirm, setShowCancelConfirm] = useState(false)
// Show modal: "Cancel event? This will notify all registered patients."
// Confirm → call PATCH
```

### Optimistic UI
After successful API response, update the local event state (status badge, action buttons) without refetching. Use `useState` for the event status in `EventDetailClient`.

## File Locations

```
apps/web/src/app/api/v1/events/[eventId]/route.ts   ← MODIFY: extend PATCH for action discriminator
apps/web/src/components/events/EventDetailClient.tsx ← MODIFY: add publish/cancel buttons + confirmation dialog
```

## Test Coverage Requirements

| Test type | What to cover |
|---|---|
| Integration | publish: draft → published; cancel: published → cancelled + Inngest event fired |
| Integration | Invalid transitions return 422 |
| Unit (RTL) | Publish button visible for draft; Cancel button visible for published; confirmation dialog shown before cancel |
