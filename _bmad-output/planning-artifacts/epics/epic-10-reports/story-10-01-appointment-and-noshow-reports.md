---
story: 10.1
epic: 10
title: Appointment & No-Show Reports
status: Not Started
created: 2026-06-07
requirements:
  functional: [FR-38, FR-39, FR-40]
  nfr: [NFR-Report-1]
  ux: [UX-DR5, UX-DR26]
---

# Story 10.1: Appointment & No-Show Reports

## User Story

As a Clinic Owner,
I want to see a breakdown of appointments by status and doctor for any date range, with a no-show trend chart —
So that I can identify patterns and take action to reduce no-shows and improve clinic efficiency.

## Context

**FR-38:** Appointment summary report — total, completed, cancelled, no-show count + % for a selected date range.

**FR-39:** No-show trend — 7-day rolling bar chart of no-show counts.

**FR-40:** Doctor breakdown — all report metrics available per-doctor with a doctor filter.

**Access:** Reports are Owner-only. Receptionists see an "Access restricted" page at `/reports`.

**Performance:** Report queries must respond in under 3 seconds for a 90-day date range on a clinic with up to 500 appointments/day (NFR-Report-1).

## Acceptance Criteria

**Given** a Clinic Owner navigates to Reports in the sidebar,
**When** the Reports page loads (`/reports`),
**Then** it shows a date range selector at the top with presets: "Today" | "This Week" | "This Month" | "Last 30 Days" | "Custom Range".
**And** the default selection is "This Month".
**And** a Doctor filter dropdown is shown: "All Doctors" (default) + individual doctor names.
**And** below the filters, report sections render: "Appointments Summary" first.

**Given** a Receptionist navigates to `/reports`,
**When** the page loads,
**Then** the page shows: "Reports are available to Clinic Owners only." with the sidebar item greyed out.
**And** the API endpoint `GET /api/v1/reports/*` returns 403 for Receptionist session tokens.

**Given** the Owner selects a date range and doctor filter,
**When** the Appointment Summary report renders,
**Then** it shows a summary stat row:
  - Total Appointments: count (all non-sample)
  - Completed: count + % of total
  - Cancelled: count + % of total
  - No-Shows: count + % of total (highlighted in amber if > 10%)
**And** a per-doctor breakdown table below: columns = Doctor Name | Total | Completed | Cancelled | No-Show | No-Show %.
**And** table rows sorted by Total descending.
**And** the report responds in under 3 seconds for date ranges up to 90 days.

**Given** the Owner selects a specific doctor from the filter,
**When** the report refreshes,
**Then** all metrics filter to that doctor only.
**And** the per-doctor breakdown table is hidden (filter already scoped to one doctor).
**And** a chip shows: "Filtered: Dr. {Name}" with an × to clear.

**Given** the No-Show Trend section renders,
**When** the chart loads,
**Then** it shows a bar chart of no-show counts for the last 7 calendar days (IST) regardless of the date range filter — the trend chart is always the trailing 7 days.
**And** x-axis: day labels ("Mon", "Tue" etc.); y-axis: count (integer, minimum 0).
**And** bars are amber-coloured.
**And** hovering a bar shows a tooltip: "{Day}: X no-shows".
**And** if no no-shows in the 7-day period, all bars show 0 with an overlay: "No no-shows in the last 7 days."

**Given** the date range is set to "Custom Range",
**When** the custom range picker opens,
**Then** a date range picker appears (start date + end date, calendar UI).
**And** maximum range: 365 days.
**And** if the range exceeds 90 days, an info banner appears: "Large date range — report may take a few seconds to load."
**And** if the range exceeds 365 days, the picker rejects it: "Maximum report range is 365 days."

**Given** the report date range is set to a period with no appointments,
**When** the summary renders,
**Then** all counts show "0" — no error, no blank.
**And** the no-show trend chart shows 0 bars for each day.

**Given** the report API is called,
**When** processing `GET /api/v1/reports/appointments?clinicId={id}&from={date}&to={date}&doctorId={optional}`,
**Then** it executes a single aggregate SQL query with GROUP BY status and GROUP BY doctor_id.
**And** all date comparisons use IST midnight boundaries (`AT TIME ZONE 'Asia/Kolkata'`).
**And** sample appointments (`is_sample = true`) are excluded from all counts.
**And** response time < 3 seconds for 90-day range, 500 appointments/day clinic.

## UX Design Reference

**EXPERIENCE.md — Reports page layout (UX-DR5):**
> Single-column layout within the portal shell. Filter bar sticky at top (date range + doctor filter). Report sections stacked vertically: each section has a card header ("Appointments Summary", "No-Show Trend") + content below. Section cards: white, `--shadow-card`, `--radius-lg`, padding 24px.
>
> Filter bar: `bg-white border-bottom: 1px --color-border`, padding 16px. Date presets as pill chips (single-select). Doctor filter as a Select dropdown (right-aligned). "Export CSV" button far right (Story 10.3).

**EXPERIENCE.md — Charts (UX-DR26):**
> All charts use Recharts. Consistent palette: brand-primary for primary series, teal for secondary, amber for no-show/warning metrics. Chart container: responsive width (100%), fixed height 240px. Tooltip: white card, `--shadow-card`, 13px Inter. Grid lines: neutral-100. Axis labels: 11px Inter neutral-400.

**DESIGN.md — No-show stat highlight:**
- No-show % > 10%: stat value in `--color-warning` (amber-600), card left border 3px amber
- No-show % ≤ 10%: standard neutral-900

**DESIGN.md — Per-doctor breakdown table:**
- Table: no outer border; `border-bottom: 1px --color-border` between rows
- Header row: 11px uppercase Inter neutral-400
- Data rows: 14px Inter neutral-900; no-show % column: amber-600 if > 15%
- Last row (total): bold, `bg-neutral-50`, `border-top: 2px --color-border`

## File Locations

```
apps/web/
  src/
    app/
      (portal)/
        reports/
          page.tsx                        ← Reports page (Owner-only, RBAC gate)
          ReportsClient.tsx               ← Client: filter state + section renders
      api/
        v1/
          reports/
            appointments/
              route.ts                    ← GET: appointment summary + per-doctor breakdown
            noshow-trend/
              route.ts                    ← GET: trailing 7-day no-show counts
    components/
      reports/
        DateRangeFilter.tsx               ← Preset chips + custom range picker
        DoctorFilter.tsx                  ← Doctor dropdown filter
        AppointmentSummaryCard.tsx        ← Stat row + per-doctor table
        NoShowTrendChart.tsx              ← 7-day bar chart (Recharts)
        ReportSection.tsx                 ← Shared card wrapper for report sections
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | RBAC: GET /api/v1/reports/* → 403 for Receptionist | 100% |
| Unit | IST date boundary: midnight IST used for day grouping | 100% |
| Unit | Sample appointments excluded from all counts | 100% |
| Unit | No-show % highlight: > 10% → amber class applied | 100% |
| Integration | GET /reports/appointments: correct counts for clinicId + date range | 100% |
| Integration | GET /reports/appointments: responds < 3s for 90-day range | Performance |
| Integration | Doctor filter: metrics scoped to single doctorId | 100% |
| Playwright (E2E) | Load reports → default "This Month" → summary stats visible | Core path |
| Playwright | Change date range → stats update | Core path |
| Playwright | Doctor filter → per-doctor table hidden; chip shown | Core path |
| Playwright | Receptionist session → "Access restricted" page shown | Core path |
