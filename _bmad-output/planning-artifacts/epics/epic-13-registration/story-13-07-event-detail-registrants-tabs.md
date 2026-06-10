---
story: 13.7
epic: 13
title: Event Detail — Registrants, Waiting List, and Invitations Tabs
status: Not Started
created: 2026-06-10
requirements:
  fr: [FR-20]
  ux: [UX-3]
---

# Story 13.7: Event Detail — Registrants, Waiting List, and Invitations Tabs

## User Story

As a clinic staff member,
I want the Registrants, Waiting List, and Invitations tabs on the event detail page to show live data,
So that I can monitor who has registered and track invitation delivery.

## Context

This story replaces the stub tabs created in Story 12.6 with real data. The Attendance actions (Mark Attended / No-Show) in the Registrants tab are added in Epic 15 Story 15.2 — for now, the tab shows data only. Manual management actions (Remove, Promote) are added in Epic 15 Story 15.3.

**UX reference:** `_bmad-output/planning-artifacts/ux-designs/ux-Cliniqly-2026-06-07/mockups/event-detail.html`

## Acceptance Criteria

**Given** I click the "Registrants" tab
**When** the tab loads
**Then** a table shows all registrations with columns: Name, Phone, Registered At, Reference Number, Status badge
**And** status badges: Registered=blue, Attended=green, No-Show=amber, Cancelled=muted

**Given** I click the "Waiting List" tab
**When** the tab loads
**Then** a table shows: Position (#), Name, Phone, Joined At, Status badge
**And** status badges: Waiting=violet, Promoted=green, Removed=muted

**Given** I click the "Invitations" tab
**When** the tab loads
**Then** a table shows: Name, Phone, Sent At (or "Pending"), Delivery Status badge
**And** status badges: Sent=green, Pending=slate, Failed=red

**And** `GET /api/v1/events/[eventId]/registrants` returns `{ registrations[], waitingList[], invitations[] }` — all for the session's clinic only
**And** 403 for unauthenticated or cross-clinic requests

## Technical Notes

### New API endpoint
`apps/web/src/app/api/v1/events/[eventId]/registrants/route.ts`

```sql
-- registrations: join with patients table for name/phone
SELECT er.*, p.name, p.phone
FROM "clinic_${clinicId}".event_registrations er
JOIN "clinic_${clinicId}".patients p ON p.id = er.patient_id
WHERE er.event_id = $1
ORDER BY er.registered_at ASC

-- waiting list
SELECT ewl.*, p.name, p.phone
FROM "clinic_${clinicId}".event_waiting_list ewl
JOIN "clinic_${clinicId}".patients p ON p.id = ewl.patient_id
WHERE ewl.event_id = $1
ORDER BY ewl.position ASC

-- invitations
SELECT ei.*, p.name, p.phone
FROM "clinic_${clinicId}".event_invitations ei
JOIN "clinic_${clinicId}".patients p ON p.id = ei.patient_id
WHERE ei.event_id = $1
ORDER BY ei.created_at ASC
```

### UI component
`apps/web/src/components/events/EventRegistrantsTab.tsx`
`apps/web/src/components/events/EventWaitingListTab.tsx`
`apps/web/src/components/events/EventInvitationsTab.tsx`

Replace the stub content in `EventDetailClient.tsx` with these components, loaded lazily when the tab is first clicked (use `useState` for `tabDataLoaded`).

### Phone masking
In the admin portal, show full phone (staff can see all patient data). No masking needed here.

## File Locations

```
apps/web/src/app/api/v1/events/[eventId]/registrants/route.ts   ← CREATE
apps/web/src/components/events/EventRegistrantsTab.tsx           ← CREATE
apps/web/src/components/events/EventWaitingListTab.tsx           ← CREATE
apps/web/src/components/events/EventInvitationsTab.tsx           ← CREATE
apps/web/src/components/events/EventDetailClient.tsx             ← MODIFY: replace stubs with real tabs
```

## Test Coverage Requirements

| Test type | What to cover |
|---|---|
| Integration | GET returns correct registrations + waitingList + invitations; 403 for wrong clinic |
| Unit (RTL) | Each tab shows correct columns and status badge colors |
