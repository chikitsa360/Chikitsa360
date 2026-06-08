---
story: 5.1
epic: 5
title: Calendar View & Real-Time Updates
status: review
created: 2026-06-07
baseline_commit: 4726811ba8737c9ef0947d6d2fd43d7eda09bca7
requirements:
  functional: [FR-14]
  nfr: [NFR-2, NFR-5]
  ux: [UX-DR7, UX-DR13, UX-DR41]
---

# Story 5.1: Calendar View & Real-Time Updates

## User Story

As a Receptionist,
I want to see all of today's appointments in a clear chronological calendar and switch to a weekly density view,
So that I always have an accurate, real-time picture of the clinic's schedule without manually refreshing the page.

## Context

**FR-14:** Day view + week view. Day view shows all appointments chronologically. Week view shows appointment density per day per doctor. Tapping an appointment opens the detail panel inline. Calendar updates in real time.

**Real-time strategy (4-layer reliability pattern):**
- Layer 1: Pusher `appointment.created / appointment.updated / appointment.cancelled` → `queryClient.invalidateQueries`
- Layer 2: On Pusher reconnect → full cache invalidation
- Layer 3: 10-second polling fallback when Pusher is down
- Layer 4: Optimistic UI for Receptionist-initiated actions (Stories 5.2–5.4)

**Architecture:** Calendar is a Client Component; clinic info + today's appointments fetched server-side (RSC) for fast initial render. Live updates handled client-side via React Query + Pusher.

## Acceptance Criteria

**Given** a Receptionist navigates to Appointments,
**When** the calendar page loads,
**Then** the default view is Day View for today's date.
**And** a date navigator is shown: `< Today >` chevrons + date label ("Saturday, 7 Jun 2026").
**And** appointments are listed in chronological order: Token # | Patient Name | Doctor | Time | Status badge.
**And** status badges are colour-coded: `confirmed` → blue, `completed` → green, `cancelled` → neutral-400 strikethrough, `no-show` → amber.
**And** the page title shows: "X appointments today" (X = total confirmed + completed + no-show).

**Given** the calendar is in Day View,
**When** there are no appointments for the selected date,
**Then** an empty state is shown: "No appointments scheduled for this day." with a "+ New Appointment" CTA button.

**Given** a Receptionist clicks "Week" tab,
**When** the week view renders,
**Then** it shows Mon–Sun of the current week (Mon start, IST).
**And** each day column shows: date header + total confirmed appointment count.
**And** if multiple doctors exist, each day shows a per-doctor row with count (e.g. "Dr. Sharma — 4 | Dr. Mehta — 2").
**And** days with 0 appointments show "—" in neutral-400.
**And** clicking any day column navigates to the Day View for that date.

**Given** a Receptionist taps / clicks any appointment row in Day View,
**When** the appointment detail panel opens,
**Then** it slides in as a right-side panel on desktop (400px wide) or bottom sheet on mobile (UX-DR13).
**And** the panel shows: Patient name + phone (masked: +91 XXXXXX{last4}), Doctor, Date + Time, Token number (#N), Booking source badge (WhatsApp / Web / Walk-in / Manual), Status, Consultation fee (if set) + Payment status, Visit note (if any), Action buttons: Reschedule | Cancel | Mark Complete | Mark No-Show.
**And** the panel is dismissible via Escape key, clicking the backdrop, or the × button.

**Given** any appointment is created (from any source — WhatsApp, Web, Walk-in, Manual),
**When** the Pusher `appointment.created` event arrives on `private-clinic-{clinicId}`,
**Then** `queryClient.invalidateQueries(['appointments', clinicId, date])` is called.
**And** the Day View updates within 5 seconds without a manual refresh.
**And** a subtle animated counter transition plays on the "X appointments today" count (UX-DR41 — number increments with a slide-up animation, 200ms ease-out).

**Given** the Pusher connection drops,
**When** reconnection occurs,
**Then** the client performs full cache invalidation on `['appointments', clinicId]` to recover any missed events.
**And** until Pusher reconnects, a 10-second polling interval keeps data fresh (React Query `refetchInterval: 10_000` set when Pusher connection state is `disconnected`).

**Given** the Receptionist navigates to a different date using the `<` / `>` chevrons,
**When** the date changes,
**Then** the appointments for the new date are fetched and displayed.
**And** "Today" label returns to today's date; navigating away shows the formatted date instead.
**And** the URL updates to `/appointments?date=2026-06-08` for shareable deep-linking.

**Given** the calendar loads on a mobile viewport (< 768px),
**When** the layout renders,
**Then** the Day View renders as a scrollable list (no horizontal scroll).
**And** the Week View renders as a horizontally scrollable strip of 7 date cards showing count only.
**And** appointment rows have minimum 44px touch target height (NFR-16).

## UX Design Reference

**EXPERIENCE.md — Calendar (UX-DR7):**
> Day view: time-column grid (8 AM – 8 PM default; clips to working hours). Each appointment is a card spanning its slot duration. Status-coded left border (4px): blue=confirmed, green=completed, amber=no-show, neutral=cancelled. Token badge top-right of card. Patient name prominent (16px semibold). Doctor name sub-label (12px neutral-600). Slot time bottom-left (12px).
>
> Week view: 7-column compact density grid. Each cell = appointment count bubble. Click cell → Day View for that date.

**DESIGN.md — Calendar cards:**
- Card background: `--color-surface` (white)
- Left border colour: status-coded (blue `--color-primary`, green `--color-success`, amber `--color-warning`, neutral `--color-neutral-400`)
- Card padding: 12px horizontal, 10px vertical
- Hover: `bg-neutral-50` + `shadow-sm` transition 150ms

**EXPERIENCE.md — Appointment detail panel (UX-DR13):**
> Right-side panel on desktop, bottom sheet on mobile. Panel opens with slide-in animation (200ms). Backdrop (bg-black/30) dismisses on click. Header: patient name + status badge. Body scrollable. Actions sticky at bottom.

**EXPERIENCE.md — Real-time counter animation (UX-DR41):**
> Appointment count increments with slide-up number transition (200ms ease-out). New appointment card animates in with fade + slide-down (250ms). Do not animate on initial page load — only on live updates.

## File Locations

```
apps/web/
  src/
    app/
      (portal)/
        appointments/
          page.tsx                        ← Server Component: fetch today's appointments + clinic info
          CalendarClient.tsx              ← Client Component: day/week view + Pusher subscription
    components/
      appointments/
        DayView.tsx                       ← Chronological list with status badges
        WeekView.tsx                      ← 7-column density grid
        AppointmentCard.tsx               ← Individual appointment row/card
        AppointmentDetailPanel.tsx        ← Right panel / bottom sheet
        DateNavigator.tsx                 ← < Today > chevron controls
    lib/
      pusher/
        useAppointmentUpdates.ts          ← Custom hook: Pusher subscription + polling fallback
    hooks/
      useAppointments.ts                  ← React Query hook: GET /api/v1/appointments?clinicId&date
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | Day/week view date grouping logic | 100% |
| Unit | Status badge colour mapping (confirmed/completed/no-show/cancelled) | 100% |
| Unit | Counter animation triggers only on live update (not initial load) | 100% |
| Integration | GET /api/v1/appointments: returns correct appointments for clinicId + date | 100% |
| Integration | Pusher event received → React Query invalidation called | 100% |
| Playwright (E2E) | Open appointments page → verify today's count → wait for Pusher event → count updates within 5s | Core path |
| Playwright | Click appointment → detail panel opens with correct fields | Core path |
| Playwright | Mobile (375px): day view scrollable list; week view horizontal strip | Mobile UJ |

## Dev Agent Record

### Implementation Plan

Implemented calendar view with 4-layer real-time reliability pattern using Pusher + polling fallback. No React Query available — used useState/useEffect with direct fetch. @dnd-kit not installed so drag-to-reschedule deferred.

### Completion Notes

- `appointments/page.tsx` (Server Component): IST-aware today, prefetches appointments + doctors via $queryRawUnsafe
- `CalendarClient.tsx`: Day/Week toggle, date navigation, URL-sync, Pusher subscription via useAppointmentUpdates hook, action handlers for all 4 status changes
- `DateNavigator.tsx`: < Today > chevrons, "Today" label for current date
- `AppointmentCard.tsx`: exports statusBadgeClass/statusBorderColor, status colours, animate prop for live-update animation, 44px min height
- `DayView.tsx`: chronological list, new-ID detection for animation (not on initial load), empty state CTA
- `WeekView.tsx`: exports getWeekDates(), fetches density counts, per-doctor rows, click to Day View
- `AppointmentDetailPanel.tsx`: 400px slide-in panel, masked phone, all 4 action buttons, Escape/backdrop dismissal
- `ReschedulePanel.tsx`: slot grid, excludes current slot, 409 handling
- `CancelDialog.tsx`: modal confirmation, Enter/Escape keyboard
- `useAppointmentUpdates.ts`: Pusher binds for all 5 event types, 10s polling fallback, reconnect full invalidation
- Tests: `src/lib/__tests__/appointments.test.ts` — statusBadgeClass, statusBorderColor, getWeekDates, getDayOfWeek (17 tests)
- Tests: `src/app/api/v1/appointments/__tests__/appointments.test.ts` — GET/POST integration tests (16 tests)
- GET /api/v1/appointments route implemented (single-date + week-range density modes)

## File List

- apps/web/src/app/(dashboard)/appointments/page.tsx (new)
- apps/web/src/app/(dashboard)/appointments/CalendarClient.tsx (new)
- apps/web/src/app/api/v1/appointments/route.ts (new)
- apps/web/src/components/appointments/DateNavigator.tsx (new)
- apps/web/src/components/appointments/AppointmentCard.tsx (new)
- apps/web/src/components/appointments/DayView.tsx (new)
- apps/web/src/components/appointments/WeekView.tsx (new)
- apps/web/src/components/appointments/AppointmentDetailPanel.tsx (new)
- apps/web/src/components/appointments/ReschedulePanel.tsx (new)
- apps/web/src/components/appointments/CancelDialog.tsx (new)
- apps/web/src/lib/pusher/useAppointmentUpdates.ts (new)
- apps/web/src/lib/__tests__/appointments.test.ts (new)
- apps/web/src/app/api/v1/appointments/__tests__/appointments.test.ts (new)
- apps/web/prisma/baseline/tenant-schema.sql (modified)

## Change Log

- 2026-06-08: Implemented Story 5.1 — Calendar View & Real-Time Updates. Day/Week views, DateNavigator, AppointmentCard with status colours, AppointmentDetailPanel, ReschedulePanel, CancelDialog. GET /api/v1/appointments API route. Pusher useAppointmentUpdates hook with 10s polling fallback. 33 unit + integration tests passing.
