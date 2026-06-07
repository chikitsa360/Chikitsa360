---
story: 8.1
epic: 8
title: Real-Time Today's Summary & Upcoming Feed
status: Not Started
created: 2026-06-07
requirements:
  functional: [FR-26, FR-27, FR-29]
  nfr: [NFR-2, NFR-5]
  ux: [UX-DR4, UX-DR8, UX-DR19, UX-DR34, UX-DR42]
---

# Story 8.1: Real-Time Today's Summary & Upcoming Feed

## User Story

As a Receptionist or Clinic Owner,
I want to see today's appointment counts, patient breakdown, and the next upcoming appointments the moment I open the portal —
So that I can immediately understand the clinic's current state and act on it without navigating away.

## Context

**FR-26:** Today's appointment summary — total, completed, no-show, remaining. All counts update in real time. "Remaining" = `confirmed` + future start time for today.

**FR-27:** Patient breakdown — today's new vs returning. "New" = patient's first-ever appointment at this clinic. Counts reset daily midnight IST.

**FR-29:** Upcoming appointments feed — next 5 upcoming appointments chronologically. Token, patient name, doctor, time, booking source. Tapping navigates to full appointment detail. Updates in real time.

**Performance:** Dashboard stat aggregates fetched server-side (RSC) for fast initial render. Pusher events from any appointment create/update/cancel trigger `queryClient.invalidateQueries(['dashboard', clinicId])` client-side — all cards refresh together.

## Acceptance Criteria

**Given** a Receptionist or Clinic Owner opens the portal (navigates to `/dashboard`),
**When** the dashboard page loads,
**Then** it renders in under 3 seconds on 4G (NFR-2).
**And** four stat cards are shown in a 2×2 grid on mobile / 4-column row on desktop (UX-DR8):
  1. **Total Today** — total appointment count for today (all statuses except `cancelled`)
  2. **Completed** — count of `completed` appointments today
  3. **Remaining** — count of `confirmed` appointments with `slot_datetime > NOW()` today
  4. **No-Shows** — count of `no-show` appointments today
**And** below the stat cards, a "Patients Today" row with two chips: "X New" (brand-primary) and "Y Returning" (teal).
**And** below that, the "Upcoming Appointments" section showing the next 5 confirmed appointments.

**Given** the stat cards render,
**When** there are no appointments for today,
**Then** all counts show "0" — no error state, no blank.
**And** the Upcoming Appointments section shows an empty state: "No upcoming appointments today." with a "+ New Appointment" CTA.

**Given** a new appointment is created (any source — WhatsApp, Web, Walk-in, Manual),
**When** the Pusher `appointment.created` event arrives on `private-clinic-{clinicId}`,
**Then** `queryClient.invalidateQueries(['dashboard', clinicId])` is called.
**And** all stat cards refresh within 3 seconds (NFR-5 dashboard realtime requirement).
**And** the Total Today count increments with an animated slide-up number transition (UX-DR42 — 200ms ease-out).
**And** the Remaining count increments if the appointment is in the future.
**And** the Upcoming Appointments feed updates to include the new appointment (re-sorted chronologically, showing top 5).
**And** the New/Returning patient chips update if today's patient classification changed.

**Given** a Receptionist marks an appointment as `no-show` (from the calendar detail panel — Story 5.4),
**When** the Pusher `appointment.updated` event arrives,
**Then** the Remaining count decrements.
**And** the No-Shows count increments (UX-DR34 — no-show count is the key metric for clinic performance).
**And** the No-Shows card has a subtle amber tint when count > 0 (UX-DR8 — visual signal without being alarming).

**Given** the Upcoming Appointments feed renders,
**When** appointments are shown,
**Then** each row shows: Token badge (#N in brand-primary pill) | Patient name (15px semibold) | Doctor name (13px neutral-500) | Time (13px neutral-700) | Booking source badge (WhatsApp / Web / Walk-in / Manual — colour coded).
**And** rows are sorted chronologically (earliest first).
**And** appointments that started in the past but are still `confirmed` are shown with an amber "Overdue" label.
**And** clicking any row opens the Appointment Detail Panel (Story 5.1) inline — no full page navigation.

**Given** there are more than 5 upcoming appointments today,
**When** the feed renders,
**Then** only the next 5 are shown.
**And** a "View all appointments" link navigates to the full Day View calendar.

**Given** a Receptionist views the dashboard on a mobile device,
**When** the layout renders on a viewport < 768px,
**Then** stat cards render in a 2×2 grid (2 columns × 2 rows).
**And** Patient Today chips are on one line.
**And** Upcoming Appointments are full-width cards (stacked vertically).
**And** all touch targets are ≥ 44px.

**Given** the dashboard is the first page shown after login,
**When** the portal session starts,
**Then** the sidebar highlights "Dashboard" as the active nav item.
**And** the page title is "Dashboard — {ClinicName}".

## UX Design Reference

**EXPERIENCE.md — Dashboard layout (UX-DR4):**
> Dashboard is the home view. Layout:
> - Page header: "Good morning/afternoon/evening, {FirstName}" (time-aware greeting, IST)
> - Stat cards row (4 cards): Total Today | Completed | Remaining | No-Shows
> - Patient breakdown chips row: X New | Y Returning
> - Upcoming Appointments section: header "Upcoming Today" + list

**DESIGN.md — Stat cards (UX-DR8):**
- Card: white, `--shadow-card`, `--radius-lg`, padding 20px
- Stat number: 36px Plus Jakarta Sans bold, neutral-900
- Stat label: 12px Inter uppercase tracking-wide neutral-400
- Icon: 24px, top-right corner, neutral-200
- Hover: `shadow-md` transition 150ms
- No-shows card accent: `border-left: 3px solid --color-warning` when count > 0
- Total Today card accent: `border-left: 3px solid --color-primary` always

**EXPERIENCE.md — Upcoming feed (UX-DR19):**
> Each upcoming appointment row is a horizontally laid-out card. Token pill left (48px wide, brand-primary/10 bg, brand-primary text, 13px bold). Patient name bold centre. Doctor + time sub-row (13px neutral-500). Source badge right (12px chip). Row hover: bg-neutral-50. Clicking row → detail panel slide-in (no navigation).

**EXPERIENCE.md — Animated counter (UX-DR42):**
> Number increment animation: old number slides up and fades out (100ms); new number slides up and fades in (200ms). Only triggers on live Pusher-driven updates — not on initial page load or manual refresh. Uses CSS transform translateY(-100%) + opacity for performance.

**DESIGN.md — Booking source badges:**
- WhatsApp: `bg-green-100 text-green-700` + WhatsApp icon
- Web: `bg-blue-100 text-blue-700` + globe icon
- Walk-in: `bg-amber-100 text-amber-700` + person icon
- Manual: `bg-neutral-100 text-neutral-600` + pencil icon

## File Locations

```
apps/web/
  src/
    app/
      (portal)/
        dashboard/
          page.tsx                        ← RSC: fetch today's aggregates server-side
          DashboardClient.tsx             ← Client: Pusher subscription + React Query
    components/
      dashboard/
        StatCardGrid.tsx                  ← 4 stat cards in responsive grid
        StatCard.tsx                      ← Individual stat card with animated counter
        PatientBreakdownChips.tsx         ← New / Returning chips
        UpcomingFeed.tsx                  ← Next 5 appointments list
        UpcomingFeedRow.tsx               ← Individual appointment row
    api/
      v1/
        dashboard/
          today/
            route.ts                      ← GET: today's aggregates (counts + upcoming 5)
    hooks/
      useDashboard.ts                     ← React Query: GET /api/v1/dashboard/today
      useAnimatedCounter.ts               ← Hook: slide-up animation on value change
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | "Remaining" count: only confirmed + future slot_datetime | 100% |
| Unit | "New patient" classification: first appointment at clinic = today | 100% |
| Unit | Upcoming feed: sorted chronologically; max 5 shown | 100% |
| Unit | Overdue label: confirmed appointment with past slot_datetime | 100% |
| Integration | GET /api/v1/dashboard/today: correct aggregates for clinicId | 100% |
| Integration | Tenant isolation: aggregates scoped to session clinicId only | 100% |
| Integration | GET responds in < 500ms for clinic with 500 appointments/month | Performance |
| Playwright (E2E) | Dashboard loads → stat cards show → new appointment created → counts update within 3s | Core path |
| Playwright | No-show marked → No-Shows count increments + amber accent appears | Core path |
| Playwright | Upcoming feed row click → detail panel opens inline | Core path |
| Playwright | Mobile (375px): stat cards in 2×2 grid; touch targets ≥ 44px | Mobile UJ |
