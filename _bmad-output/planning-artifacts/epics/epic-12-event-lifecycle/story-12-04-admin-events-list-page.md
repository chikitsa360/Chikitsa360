---
story: 12.4
epic: 12
title: Admin Events List Page
status: Not Started
created: 2026-06-10
requirements:
  fr: [FR-19]
  ux: [UX-1, UX-2, UX-7, UX-8]
---

# Story 12.4: Admin Events List Page

## User Story

As a clinic staff member,
I want an /events page in the admin portal with stat cards, filter tabs, and a series-grouped events table,
So that I can see all clinic events at a glance with seat availability and status.

## Context

This story creates the events list page shell and wires the sidebar nav entry. The actual data comes from the Events List API (Story 12.5). The page follows the same RSC + Client split pattern used in appointments (`app/(dashboard)/appointments/page.tsx` + `CalendarClient.tsx`) and patients (`app/(dashboard)/patients/page.tsx` + `PatientDirectoryClient.tsx`).

**UX reference:** `_bmad-output/planning-artifacts/ux-designs/ux-Cliniqly-2026-06-07/mockups/events-list.html`

## Acceptance Criteria

**Given** I click "Events" in the sidebar
**When** the /events page loads
**Then** the sidebar has an "Events" entry between "Billing" and "Reports" with a calendar/event icon

**And** the page shows 4 stat cards (using `StatCard` from `@chikitsa360/ui`):
- Total Events (all statuses)
- Published (status=published)
- Upcoming (start_time > NOW() IST)
- This Week (start_time within current IST Mon–Sun week)

**And** a filter tab bar: All | Published | Draft | Completed | Cancelled (default: All)
**And** clicking a tab filters the table to that status

**And** the events table has columns: Event (title + TODAY amber chip if today), Date/Time, Status badge, Seats (progress bar: `seats_registered / max_seats`), Waiting List count, Actions (View, Edit, Cancel)

**And** status badges use correct colors:
- Published → blue (`bg-primary/10 text-primary`)
- Draft → slate (`bg-muted text-muted-foreground`)
- Completed → green (`bg-green-50 text-green-700`)
- Cancelled → muted red (`bg-red-50 text-red-600`)

**And** events in a series are grouped: parent row shows the series label with a chevron (▶/▼); clicking expands/collapses child rows (indented 16px)

**And** TODAY chip: amber `bg-amber-50 text-amber-700` badge next to the date for events where `start_time` date = today IST

**And** the "New Event" button opens the NewEventModal (Story 12.3)

**And** View link → /events/[eventId]; Edit → opens edit modal (Story 12.7); Cancel → confirmation dialog

## Technical Notes

### Route location
`apps/web/src/app/(dashboard)/events/page.tsx` — RSC, fetches initial aggregate counts server-side for fast LCP.
`apps/web/src/components/events/EventsListClient.tsx` — 'use client', handles filter tab state and table rendering.

### Sidebar nav
Modify `apps/web/src/components/layout/Sidebar.tsx` (or wherever the nav items array is defined). Add between Billing and Reports:
```ts
{ href: '/events', label: 'Events', icon: CalendarDaysIcon }
```
Import `CalendarDaysIcon` from `lucide-react` (already installed).

### Series grouping in UI
Events API returns `series_id` and `series_position` per event. Group client-side:
```ts
// Group events by series_id; events without series_id are standalone
const grouped = groupBySeries(events) // returns SeriesGroup[]
```
Use `useState<Record<string, boolean>>` to track expanded/collapsed state per series_id.

### Seats progress bar
```tsx
<div className="w-full bg-muted rounded-full h-1.5">
  <div
    className="bg-primary h-1.5 rounded-full"
    style={{ width: `${Math.min(100, (seats_registered / max_seats) * 100)}%` }}
  />
</div>
```

### IST date comparison (TODAY chip)
```ts
const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
const isToday = eventDate.toDateString() === nowIST.toDateString()
```

### Design system
Use `@chikitsa360/ui` `StatCard`, `Badge`, `Button`. Never hardcode colors. Use `cn()` from `@chikitsa360/core`.

## File Locations

```
apps/web/src/app/(dashboard)/events/page.tsx          ← CREATE: RSC page
apps/web/src/components/events/EventsListClient.tsx   ← CREATE: client component
apps/web/src/components/layout/Sidebar.tsx            ← MODIFY: add Events nav entry
```

## Test Coverage Requirements

| Test type | What to cover |
|---|---|
| Unit (RTL) | Filter tabs change active state; series expand/collapse toggles child rows; TODAY chip shows for today's events |
| Unit | Seats progress bar renders correct width percentage |
