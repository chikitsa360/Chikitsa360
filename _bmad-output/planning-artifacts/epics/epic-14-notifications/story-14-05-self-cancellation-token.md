---
story: 14.5
epic: 14
title: Patient Self-Cancellation via Token URL
status: review
created: 2026-06-10
requirements:
  fr: [FR-18]
  nfr: [NFR-2, NFR-8]
---

# Story 14.5: Patient Self-Cancellation via Token URL

## User Story

As a registered patient,
I want to cancel my event registration by clicking the link in my WhatsApp confirmation,
So that I can free up my seat without calling the clinic.

## Context

The cancellation token is already stored in `event_registrations.cancellation_token` (Story 12.1) and included in the confirmation message (Story 14.1). This story creates the public page and API for the token-based cancellation flow. Token is single-use and expires at `event.start_time`.

## Acceptance Criteria

**Given** I open `/events/[slug]/cancel?token=<valid-token>` in a browser
**When** the token is valid (exists, not yet used, event start_time is in the future)
**Then** I see the event details and a "Cancel My Registration" button

**Given** the event start_time has already passed
**When** the page loads
**Then** shows "This cancellation link has expired. The event has already started or ended."

**Given** the token has already been used (registration status=cancelled)
**When** the page loads
**Then** shows "This cancellation link has already been used."

**Given** the token doesn't exist in the DB
**Then** shows "Invalid cancellation link."

**Given** I click "Cancel My Registration" (valid state)
**When** `POST /api/v1/events/[slug]/cancel` with `{ token }` is called
**Then** DB transaction:
  1. SELECT registration FOR UPDATE where cancellation_token = token
  2. Verify event start_time is still in the future (re-check)
  3. SET status = 'cancelled', cancellation_token = NULL (single-use)
  4. UPDATE events SET seats_registered = seats_registered - 1 (with CHECK guard >= 0)
  5. COMMIT
**And** Inngest event fired: `{ name: 'event/registration.cancelled', data: { registrationId, clinicId } }`
**And** page shows: "Your registration has been cancelled successfully."
**And** this endpoint is in `PUBLIC_API_PATHS`

## Technical Notes

### Route
`apps/web/src/app/(event-registration)/events/[slug]/cancel/page.tsx` — public, no auth.

### Cancel API
`apps/web/src/app/api/v1/events/[slug]/cancel/route.ts` — POST only, public.

Token lookup:
```sql
SELECT er.*, e.start_time, e.id as event_id
FROM "clinic_${clinicId}".event_registrations er
JOIN "clinic_${clinicId}".events e ON e.id = er.event_id
WHERE er.cancellation_token = $1
```

Note: need clinic_id to query tenant schema. Since token is globally unique (UUID), look up via `public.event_slugs` to get `clinic_id`, then query the tenant schema.

### Single-use enforcement
Setting `cancellation_token = NULL` on use prevents token reuse. The unique index on `cancellation_token` ensures no duplicate tokens.

### seats_registered decrement (with guard)
```sql
UPDATE "clinic_${clinicId}".events
SET seats_registered = GREATEST(0, seats_registered - 1)
WHERE id = $1
```
`GREATEST(0, ...)` prevents going negative even if there's a race.

### Inngest event (consumer in Story 14.6)
```ts
await inngest.send({
  name: 'event/registration.cancelled',
  data: { registrationId, clinicId },
  id: `${registrationId}:cancelled`,
})
```

## File Locations

```
apps/web/src/app/(event-registration)/events/[slug]/cancel/page.tsx   ← CREATE
apps/web/src/app/api/v1/events/[slug]/cancel/route.ts                 ← CREATE
apps/web/src/middleware.ts                                              ← MODIFY: already covered by /api/v1/events/ path
```

## Test Coverage Requirements

| Test type | What to cover |
|---|---|
| Integration | Valid token: cancellation succeeds, token nulled, seats_registered decremented, Inngest event fired |
| Integration | Expired token (event started): 422 returned; registration unchanged |
| Integration | Reused token (cancellation_token IS NULL): 422 returned |
| Unit (RTL) | Page shows correct state for valid/expired/used/invalid token |
