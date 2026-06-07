---
story: 8.2
epic: 8
title: Revenue Tracking & Weekly Summary
status: Not Started
created: 2026-06-07
requirements:
  functional: [FR-28, FR-30]
  nfr: [NFR-5]
  ux: [UX-DR43]
---

# Story 8.2: Revenue Tracking & Weekly Summary

## User Story

As a Clinic Owner,
I want to see today's collected revenue and pending fees on my dashboard, and switch to a weekly summary to understand the clinic's performance for the week —
So that I have financial visibility without opening a separate reports page.

## Context

**FR-28:** Daily revenue total — sum of `consultation_fee` for appointments with `payment_status = 'paid'` today. Updates in real time within 3 seconds of payment status change. Displayed in INR. Unpaid shown as "pending collection" count.

**FR-30:** Weekly summary — total appointments, completed, no-shows (count + %), total revenue for current week (Mon–Sun IST). Accessible via tab/toggle; does not replace daily default. Revenue aggregates only `paid` appointments.

**Dependency:** Revenue data depends on Epic 9 (Basic Billing) which adds `consultation_fee` and `payment_status` fields to appointments. This story's UI is built in Epic 8 but is partially functional only after Epic 9 is complete. Until Epic 9 is done, revenue card shows "—" with a tooltip "Record payments to see revenue."

**Real-time:** Payment status changes (from Epic 9 billing actions) publish Pusher `appointment.payment_updated` event → dashboard `queryClient.invalidateQueries(['dashboard', clinicId])` → revenue card updates within 3 seconds.

## Acceptance Criteria

**Given** a Clinic Owner views the dashboard,
**When** the revenue section renders,
**Then** a "Revenue Today" stat card shows: total INR amount collected today (sum of `consultation_fee` WHERE `payment_status = 'paid'` AND `slot_date = today`), formatted as "₹X,XXX".
**And** a secondary line shows: "X pending" (count of `confirmed`/`completed` appointments with `payment_status = 'unpaid'` today).
**And** if no payments have been recorded today, the card shows "₹0" with "X pending collection".

**Given** a Receptionist records a payment (marks appointment as `paid` — Epic 9),
**When** the Pusher `appointment.payment_updated` event arrives on the dashboard,
**Then** the Revenue Today amount updates within 3 seconds.
**And** the "pending" count decrements.
**And** the revenue number increments with the same animated slide-up counter transition as Story 8.1 (UX-DR42).

**Given** Epic 9 (Basic Billing) has not been completed yet,
**When** the revenue card renders with no `consultation_fee` data,
**Then** the card shows "₹—" in neutral-300.
**And** a tooltip on hover: "Record consultation fees in appointment details to track revenue."
**And** no error state — graceful degradation.

**Given** a Clinic Owner clicks the "This Week" tab/toggle on the dashboard,
**When** the weekly summary view activates (UX-DR43),
**Then** the stat cards transition to weekly aggregates for the current Mon–Sun IST week:
  - Total Appointments (all non-cancelled)
  - Completed (count)
  - No-Shows (count + percentage: "X (Y%)")
  - Revenue (sum of `paid` fees for the week, INR)
**And** the Patient breakdown chips update to "X New | Y Returning" for the week.
**And** the Upcoming Appointments feed remains unchanged (always shows next 5, regardless of daily/weekly toggle).
**And** the toggle persists for the session (not across sessions — defaults to "Today" on fresh login).

**Given** the weekly summary is active and today is Monday (start of week),
**When** the aggregates compute,
**Then** they reflect only today's data (Mon–Sun window, IST, only Mon so far).

**Given** the weekly summary is active and a new appointment is created today,
**When** the Pusher event arrives,
**Then** the weekly totals update in real time (same invalidation chain as daily view).

**Given** the Clinic Owner clicks "Today" tab to switch back,
**When** the daily view restores,
**Then** today's stat cards resume showing daily aggregates.
**And** the transition is instant (data already in React Query cache for the day view).

**Given** the dashboard is viewed by a Receptionist (not Owner),
**When** the revenue card renders,
**Then** the Revenue Today amount is shown — revenue visibility is not restricted to Owners only.
**And** but the "pending collection" link does NOT navigate to a billing action screen (that's Epic 9) — it navigates to the Appointments day view filtered by `payment_status = 'unpaid'`.

**Given** the weekly no-show percentage renders,
**When** total appointments for the week is 0,
**Then** no-show percentage shows "—" (no division by zero).

## UX Design Reference

**EXPERIENCE.md — Weekly summary toggle (UX-DR43):**
> Toggle sits in the dashboard page header as a pill tab row: "Today | This Week". Active tab has brand-primary underline + text colour. Inactive tab neutral-500. Tab width: auto (fits label). Transition: stat cards animate out (fade 150ms) and new values fade in (150ms) — smooth swap, not a page reload.
>
> Weekly view: same card grid layout as daily. No-show card shows count + percentage in smaller text below: "(Y% of total)". Revenue card shows week total with "week total" sub-label replacing "today" sub-label.

**DESIGN.md — Revenue card:**
- Revenue amount: 36px Plus Jakarta Sans bold neutral-900; "₹" prefix in neutral-400 (smaller, 24px)
- Pending sub-label: 13px Inter neutral-500; count in amber-600 if > 0, neutral-400 if 0
- "₹—" state: 36px neutral-300; tooltip on hover

**DESIGN.md — Weekly toggle:**
- Pill tab container: `bg-neutral-100 rounded-full p-1` inline in page header right
- Each tab: `px-4 py-1.5 rounded-full text-13px` — active: `bg-white shadow-sm text-primary font-medium`; inactive: `text-neutral-500`
- Transition: `transition-all 200ms ease`

## File Locations

```
apps/web/
  src/
    app/
      api/
        v1/
          dashboard/
            today/
              route.ts                    ← Extended: include revenue aggregates
            week/
              route.ts                    ← GET: weekly aggregates (Mon–Sun IST)
    components/
      dashboard/
        RevenueCard.tsx                   ← Revenue today + pending count; graceful ₹— state
        WeeklyToggle.tsx                  ← Today | This Week pill tabs
        WeeklyStatCards.tsx               ← Weekly variant of StatCardGrid
    hooks/
      useDashboardWeekly.ts               ← React Query: GET /api/v1/dashboard/week
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | Revenue sum: only `paid` appointments; `unpaid` excluded | 100% |
| Unit | Weekly window: Mon–Sun IST; correct boundary on Sunday and Monday | 100% |
| Unit | No-show %: X/total * 100; "—" when total = 0 | 100% |
| Unit | Revenue card: ₹— graceful state when no fee data | 100% |
| Integration | GET /api/v1/dashboard/week: correct aggregates for current IST week | 100% |
| Integration | Payment updated → revenue amount changes (Pusher-driven invalidation) | 100% |
| Playwright (E2E) | Toggle "This Week" → stat cards update to weekly values | Core path |
| Playwright | Toggle "Today" → daily values restored (from cache, instant) | Core path |
| Playwright | Revenue card: mark appointment paid (Epic 9) → ₹ amount increments within 3s | Core path (post Epic 9) |
| Playwright | No-show % shows "—" when week has 0 appointments | Edge case |
