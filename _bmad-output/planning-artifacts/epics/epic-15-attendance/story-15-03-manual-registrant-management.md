---
story: 15.3
epic: 15
title: Manual Registrant Management
status: done
created: 2026-06-10
requirements:
  fr: [FR-21]
  nfr: [NFR-7]
---

# Story 15.3: Manual Registrant Management

## User Story

As a clinic staff member,
I want to manually remove a registrant or promote/remove a waiting list entry,
So that I can handle edge cases like patient requests or no-shows before the event.

## Context

The `remove` action on registrations was already added to the API in Story 15.1. This story adds the UI action buttons to the Registrants and Waiting List tabs, and adds the waiting list management API endpoint.

## Acceptance Criteria

**Given** I am on the Registrants tab
**When** I see a row with status='registered'
**Then** a "Remove" button (ghost, destructive color) appears in the Actions column
**And** clicking "Remove" shows a confirmation dialog: "Remove [patient name] from this event? Their seat will be freed and the next person on the waiting list will be notified."
**And** on confirm: calls `PATCH /api/v1/events/[eventId]/registrations/[registrationId]` with `{ action: 'remove' }` (Story 15.1)
**And** the row status updates to Cancelled; the seats remaining count in the stat blocks updates

**Given** I am on the Waiting List tab
**When** I see a row with status='waiting' AND event.seats_remaining > 0
**Then** a "Promote" button appears; clicking it calls `PATCH /api/v1/events/[eventId]/waiting-list/[entryId]` with `{ action: 'promote' }`
**And** on success: the entry moves to Registrants tab (status=promoted in waiting list); `event/registration.confirm` Inngest event fired for the promoted patient
**And** seats remaining in stat blocks decrements by 1

**When** I see a waiting list row with status='waiting'
**Then** a "Remove" button (ghost, destructive) appears; calling `PATCH /api/v1/events/[eventId]/waiting-list/[entryId]` with `{ action: 'remove' }`
**And** on success: entry status=removed; removed from the displayed list

**And** all actions write to audit_log

## Technical Notes

### New API endpoint
`apps/web/src/app/api/v1/events/[eventId]/waiting-list/[entryId]/route.ts`

**Promote action:**
```sql
BEGIN;
SELECT id, seats_registered, max_seats FROM events WHERE id = $1 FOR UPDATE;
-- check seats_registered < max_seats
INSERT INTO event_registrations (...) VALUES (...);
UPDATE events SET seats_registered = seats_registered + 1 WHERE id = $1;
UPDATE event_waiting_list SET status='promoted', updated_at=NOW() WHERE id = $2;
COMMIT;
```
Then fire `event/registration.confirm` Inngest event.

**Remove action:**
```sql
UPDATE event_waiting_list SET status='removed', updated_at=NOW() WHERE id=$1
```

### UI changes
`EventRegistrantsTab.tsx` — add Remove button (confirm dialog before API call).
`EventWaitingListTab.tsx` — add Promote + Remove buttons.
`EventDetailClient.tsx` — refresh stat blocks after management actions (re-fetch or update local state).

### Stat block refresh
After any management action, re-fetch the event detail (`GET /api/v1/events/[eventId]`) to refresh the 5 stat blocks. Or update local state optimistically and re-sync.

## File Locations

```
apps/web/src/app/api/v1/events/[eventId]/waiting-list/[entryId]/route.ts   ← CREATE
apps/web/src/components/events/EventRegistrantsTab.tsx                       ← MODIFY: add Remove button
apps/web/src/components/events/EventWaitingListTab.tsx                       ← MODIFY: add Promote + Remove buttons
```

## Test Coverage Requirements

| Test type | What to cover |
|---|---|
| Integration | Promote: creates registration, increments seats, fires Inngest event, updates waitlist status |
| Integration | Promote fails when seats_remaining = 0 (422) |
| Integration | Remove waiting list entry: status=removed |
| Unit (RTL) | Confirm dialog appears before remove action; cancel aborts |
