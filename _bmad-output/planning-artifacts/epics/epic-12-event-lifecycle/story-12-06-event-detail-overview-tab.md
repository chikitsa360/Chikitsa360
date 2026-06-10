---
story: 12.6
epic: 12
title: Event Detail Page — Overview Tab
status: Not Started
created: 2026-06-10
requirements:
  fr: [FR-20]
  ux: [UX-3]
---

# Story 12.6: Event Detail Page — Overview Tab

## User Story

As a clinic staff member,
I want an /events/[eventId] page with an Overview tab showing all event details and edit/cancel actions,
So that I can review a specific event and take management actions.

## Context

This story creates the event detail page with the Overview tab active. The other 3 tabs (Registrants, Waiting List, Invitations) are rendered as empty stubs — they are populated in Stories 13.7 and 15.2. The 5 stat blocks (Total Seats, Registered, Remaining, Waiting, Invitations) require a dedicated detail API endpoint.

**UX reference:** `_bmad-output/planning-artifacts/ux-designs/ux-Cliniqly-2026-06-07/mockups/event-detail.html`

## Acceptance Criteria

**Given** I click "View" on an event row
**When** /events/[eventId] loads
**Then** I see: breadcrumb `Events > [event title]`, event title as H1, status badge, TODAY chip (if today)

**And** 5 stat blocks in a row: Total Seats (`max_seats`), Registered (`seats_registered`), Remaining (`max_seats - seats_registered`), Waiting List (count with status=waiting), Invitations Sent (count with delivery_status=sent)

**And** 4 tabs rendered: Overview (active) | Registrants | Waiting List | Invitations
- Registrants, Waiting List, Invitations tabs are stubs: show "Coming in next sprint" or empty state

**And** the Overview tab body shows:
- Description (or "No description" in muted text)
- Date: formatted "Wednesday, 2 July 2026"
- Time: "10:00 AM – 12:00 PM IST"
- Venue (or meeting link, or "—")
- Registration Deadline (or "—")
- Fee: "₹150" or "Free"
- Series info (if series_id): "Part of [weekly/daily] series · [N] events"

**And** action buttons in the header:
- "Edit" button visible for status=draft or status=published (opens Edit modal, Story 12.7)
- "Publish" button visible for status=draft (Story 12.8)
- "Cancel Event" button visible for status=published (Story 12.8)
- No action buttons for status=cancelled or status=completed

**And** `GET /api/v1/events/[eventId]` provides all event data plus the 5 stat counts

**And** 404 is returned (Next.js `notFound()`) if the eventId doesn't belong to the session's clinic

## Technical Notes

### Route location
`apps/web/src/app/(dashboard)/events/[eventId]/page.tsx` — RSC, calls `GET /api/v1/events/[eventId]` server-side for fast LCP.
`apps/web/src/components/events/EventDetailClient.tsx` — 'use client', handles tab switching.

### Detail API
`apps/web/src/app/api/v1/events/[eventId]/route.ts` — GET handler:
```sql
SELECT
  e.*,
  COALESCE(reg.registered_count, 0) AS registered_count,
  COALESCE(wl.waiting_count, 0) AS waiting_count,
  COALESCE(inv.invited_sent_count, 0) AS invited_sent_count
FROM "clinic_${clinicId}".events e
LEFT JOIN (SELECT event_id, COUNT(*) FROM event_registrations WHERE status != 'cancelled' GROUP BY event_id) reg ON ...
LEFT JOIN (SELECT event_id, COUNT(*) FROM event_waiting_list WHERE status = 'waiting' GROUP BY event_id) wl ON ...
LEFT JOIN (SELECT event_id, COUNT(*) FROM event_invitations WHERE delivery_status = 'sent' GROUP BY event_id) inv ON ...
WHERE e.id = $1 AND e.clinic_id = $2
```

### IST time formatting
```ts
const timeStr = new Date(start_time).toLocaleTimeString('en-IN', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
})
```

### 404 guard
```ts
if (!event) return notFound()
// Also: if (event.clinic_id !== session.user.clinicId) return notFound() — prevent cross-tenant access
```

### Stub tabs
```tsx
{activeTab === 'registrants' && <div className="py-12 text-center text-muted-foreground">Registrant management coming soon</div>}
```
These will be replaced in Stories 13.7 and 15.2.

## File Locations

```
apps/web/src/app/(dashboard)/events/[eventId]/page.tsx       ← CREATE: RSC
apps/web/src/components/events/EventDetailClient.tsx          ← CREATE: client
apps/web/src/app/api/v1/events/[eventId]/route.ts            ← CREATE: GET handler
```

## Test Coverage Requirements

| Test type | What to cover |
|---|---|
| Integration | GET /api/v1/events/[eventId] returns correct event + 5 stat counts; 404 for wrong clinic |
| Unit (RTL) | Overview tab renders all fields; correct action buttons per status (Edit shown for draft, Publish for draft, Cancel for published, none for cancelled) |
