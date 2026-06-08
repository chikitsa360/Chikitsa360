---
story: 10.2
epic: 10
title: Revenue & Doctor Utilisation Reports
status: review
baseline_commit: a763e4fd4d106eb32617f91c524684413434945a
created: 2026-06-07
requirements:
  functional: [FR-41, FR-42, FR-43]
  nfr: [NFR-Report-1]
  ux: [UX-DR26, UX-DR46]
---

# Story 10.2: Revenue & Doctor Utilisation Reports

## User Story

As a Clinic Owner,
I want to see how much revenue the clinic collected, broken down by doctor and booking source, and understand how efficiently each doctor's slots are being used —
So that I can make informed staffing and scheduling decisions.

## Context

**FR-41:** Revenue report — total collected (paid appointments), by doctor, average fee for the date range.

**FR-42:** Doctor utilisation — slots used (booked) vs slots available (from working hours config), utilisation percentage per doctor.

**FR-43:** Booking source breakdown — appointments split by source (WhatsApp / Web / Walk-in / Manual).

**Dependency on Epic 9:** Revenue data requires `consultation_fee` and `payment_status` fields. If Epic 9 is incomplete, revenue report shows "—" with a tooltip (same graceful degradation as Story 8.2).

**Doctor utilisation computation:** Available slots per day = computed from `working_hours` config (same `computeAvailableSlots()` logic). Used slots = non-cancelled appointments. Utilisation % = used / available × 100.

## Acceptance Criteria

**Given** the Owner views the Reports page with the Revenue section visible,
**When** the Revenue Summary card renders for the selected date range,
**Then** it shows:
  - Total Revenue: sum of `consultation_fee` WHERE `payment_status = 'paid'` for the period, formatted as "₹X,XXX"
  - Total Pending: count of appointments with `payment_status = 'unpaid'` and `consultation_fee IS NOT NULL`
  - Average Fee: `SUM(paid fees) / COUNT(paid appointments)`, formatted as "₹X"
  - Per-doctor revenue table: Doctor Name | Total Collected | Appointments Paid | Avg Fee

**Given** the Revenue section renders with no paid appointments in the range,
**When** the section loads,
**Then** Total Revenue shows "₹0".
**And** Average Fee shows "—" (no division by zero).
**And** a note: "No payments recorded for this period."

**Given** the Owner views the Revenue by Day chart,
**When** the chart renders for the selected date range,
**Then** a line chart shows daily revenue (INR) on the y-axis, dates on the x-axis.
**And** only `paid` appointments contribute to each day's total.
**And** days with ₹0 revenue show a data point at 0 (not a gap in the line).
**And** hovering a data point shows: "{Date}: ₹{amount} ({N} paid appointments)".
**And** for ranges > 30 days, the x-axis groups by week (weekly totals instead of daily) to avoid label crowding.

**Given** the Owner views the Booking Source Breakdown section,
**When** the section renders,
**Then** a horizontal bar chart shows appointment counts by source: WhatsApp | Web | Walk-in | Manual.
**And** each bar is colour-coded (green=WhatsApp, blue=Web, amber=Walk-in, neutral=Manual).
**And** percentage of total shown on each bar: "WhatsApp — 45%".
**And** hovering shows: "{Source}: X appointments ({Y}%)".

**Given** the Owner views the Doctor Utilisation section,
**When** the section renders,
**Then** a table shows per-doctor: Doctor Name | Available Slots | Used Slots | Utilisation %.
**And** utilisation = (non-cancelled appointments / total available slots) × 100, rounded to 1 decimal.
**And** utilisation > 80% shown in green (high utilisation).
**And** utilisation < 40% shown in amber (low utilisation — may indicate scheduling gaps).
**And** a summary line above the table: "Clinic average utilisation: X%".

**Given** the working hours for a doctor changed mid-period (e.g. from 20 slots/day to 15 slots/day on 15 Jun),
**When** utilisation is computed for a range spanning the change,
**Then** available slots use the working hours configuration at the time of each day (historical working_hours snapshots — if snapshots are not stored at MVP, a note is shown: "Utilisation computed from current working hours configuration").

**Given** the date range filter changes,
**When** the new range is selected,
**Then** all three sections (Revenue, Booking Source, Utilisation) refresh simultaneously with the new range.
**And** if the Doctor filter is also active, all sections remain scoped to that doctor.

**Given** the report API is called for a 90-day range,
**When** processing `GET /api/v1/reports/revenue?clinicId={id}&from={date}&to={date}`,
**Then** it responds in under 3 seconds (NFR-Report-1).
**And** sample appointments excluded from all calculations.

## UX Design Reference

**EXPERIENCE.md — Revenue section (UX-DR26):**
> Revenue summary: stat row (same design as dashboard stat cards) + Revenue by Day line chart below. Chart height 240px, responsive width. Line: brand-primary, 2px stroke, dot markers on hover only. Area fill: `--color-primary/10` (subtle gradient below the line).
>
> Booking Source chart: horizontal bars, full width. Each bar: coloured fill, white label inside bar if bar > 80px wide (else label outside). Percentage text right-aligned.

**DESIGN.md — Utilisation table:**
- Utilisation cell: coloured percentage + background tint:
  - ≥ 80%: `text-green-700 bg-green-50`
  - 40–79%: `text-neutral-700` (neutral)
  - < 40%: `text-amber-700 bg-amber-50`
- Clinic average row: bold, `bg-neutral-50`, `border-top: 2px --color-border`

**EXPERIENCE.md — Export UX (UX-DR46):**
> "Export CSV" button in the filter bar header (top-right). Single button exports the currently visible report (whichever section is in view — or all sections to one CSV). Button: ghost style with download icon. On click: if range ≤ 90 days → immediate download. If > 90 days → async job (Story 10.3).

## File Locations

```
apps/web/
  src/
    app/
      api/
        v1/
          reports/
            revenue/
              route.ts                    ← GET: revenue summary + per-doctor + by-day
            utilisation/
              route.ts                    ← GET: doctor utilisation (slots used vs available)
            booking-sources/
              route.ts                    ← GET: appointment count by booking_source
    components/
      reports/
        RevenueSummaryCard.tsx            ← Stat row + per-doctor table
        RevenueByDayChart.tsx             ← Line chart (Recharts)
        BookingSourceChart.tsx            ← Horizontal bar chart (Recharts)
        DoctorUtilisationTable.tsx        ← Utilisation % table with colour coding
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | Revenue: only `paid` appointments included; `unpaid` excluded | 100% |
| Unit | Average fee: ₹0 total → shows "—" (no divide by zero) | 100% |
| Unit | Utilisation %: (used/available) × 100, rounded to 1 decimal | 100% |
| Unit | Utilisation thresholds: ≥80% green, <40% amber | 100% |
| Unit | Weekly grouping: date range > 30 days → x-axis grouped by week | 100% |
| Integration | GET /reports/revenue: correct sums for clinicId + date range | 100% |
| Integration | GET /reports/utilisation: correct computation from working_hours | 100% |
| Integration | GET /reports/booking-sources: correct counts per source | 100% |
| Integration | All report APIs: 403 for Receptionist session | 100% |
| Integration | Revenue query < 3s for 90-day range | Performance |
| Playwright (E2E) | Revenue section: line chart renders with correct data points | Core path |
| Playwright | Booking source chart: all 4 sources shown with percentages | Core path |
| Playwright | Doctor utilisation table: colour coding applied correctly | Core path |
