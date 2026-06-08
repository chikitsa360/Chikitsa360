---
story: 10.3
epic: 10
title: Patient Growth & Export
status: review
baseline_commit: a763e4fd4d106eb32617f91c524684413434945a
created: 2026-06-07
requirements:
  functional: [FR-44, FR-45, FR-45b]
  nfr: [NFR-Report-2, NFR-Report-3]
  ux: [UX-DR46]
---

# Story 10.3: Patient Growth & Export

## User Story

As a Clinic Owner,
I want to see how my patient base is growing over time and export any report to CSV —
So that I can track acquisition trends and share data with my accountant or clinic management team.

## Context

**FR-44:** Patient growth report — new patient registrations over time (weekly/monthly), new vs returning ratio.

**FR-45:** Export to CSV — any report table exportable. For date ranges ≤ 90 days, immediate client-side download. For > 90 days (FR-45b), an async Inngest job generates the CSV and sends a download link to the Owner.

**NFR-Report-2:** Async export for ranges > 90 days must complete within 5 minutes.

**NFR-Report-3:** CSV must use UTF-8 encoding with BOM for correct Excel rendering of Indian names (Devanagari characters).

**Patient growth definition:**
- "New patient" in a period = patient whose first appointment at this clinic falls within the period
- "Returning patient" in a period = patient who had a prior appointment before the period start and has an appointment in the period
- These counts are per-period (not cumulative)

## Acceptance Criteria

**Given** the Owner views the Patient Growth section on the Reports page,
**When** the section renders for the selected date range,
**Then** a bar chart shows new patient registrations grouped by:
  - Week (if range ≤ 60 days)
  - Month (if range > 60 days)
**And** x-axis: week/month labels; y-axis: count of new patients.
**And** bars are brand-primary coloured.
**And** hovering shows: "{Week/Month}: X new patients".

**Given** the Owner views the New vs Returning ratio for the period,
**When** the ratio section renders,
**Then** a donut chart shows: new patients (brand-primary segment) vs returning patients (teal segment).
**And** centre of donut shows: total unique patients seen in the period.
**And** legend below: "X New (Y%) | Z Returning (W%)".
**And** if the clinic has no patients yet: full-circle donut in neutral-200 with "No patient data yet."

**Given** the date range filter changes,
**When** the Patient Growth section refreshes,
**Then** both the bar chart and donut chart update to reflect the new range.
**And** the grouping (weekly vs monthly) switches automatically based on the range length.

**Given** the Owner clicks "Export CSV" in the filter bar,
**When** the date range is ≤ 90 days,
**Then** a CSV file is generated client-side using `papaparse`.
**And** the file contains all data for the currently selected report view (all visible tables/sections).
**And** the file is downloaded immediately to the browser.
**And** the filename is: `{report-type}-{clinic-slug}-{from-date}-{to-date}.csv` (e.g. `appointments-drkumar-clinic-2026-05-01-2026-05-31.csv`).
**And** the CSV uses UTF-8 encoding with BOM (`\uFEFF` prefix) for correct Excel rendering of Devanagari characters in patient names (NFR-Report-3).
**And** headers in the CSV are in English regardless of clinic language setting.

**Given** the Owner clicks "Export CSV" with a date range > 90 days,
**When** the export is triggered,
**Then** a modal appears: "Your export is being prepared. We'll notify you when it's ready to download." with an "OK" button.
**And** an Inngest job `report/export.generate` is enqueued with: `{ clinicId, reportType, from, to, doctorId, requestedBy: userId }`.
**And** the Inngest job runs the report query and generates the CSV server-side.
**And** the CSV file is stored in Vercel Blob (or S3 bucket) with a signed URL (24-hour expiry).
**And** within 5 minutes (NFR-Report-2), the Owner receives a notification in the portal: a persistent toast or in-app notification: "Your export is ready. [Download]" (link to signed URL).
**And** the download link expires after 24 hours; after expiry, the Owner must re-trigger the export.

**Given** the async export job is running,
**When** the Owner navigates away from the Reports page,
**Then** the export continues in the background (Inngest job persists independently of the browser session).
**And** the portal notification appears when the Owner next views the portal (even if they log out and back in within the 24h window — notification stored in DB).

**Given** the async export fails (query timeout, storage error),
**When** the Inngest job fails after retries,
**Then** the Owner receives an in-app notification: "Your export failed. Please try again or contact support."
**And** the failure is logged in the audit log.

**Given** the CSV is opened in Microsoft Excel or Google Sheets,
**When** the file is imported,
**Then** patient names with Devanagari characters display correctly (not as garbled ASCII) — ensured by UTF-8 BOM.
**And** date columns use ISO 8601 format (`YYYY-MM-DD`) for universal spreadsheet compatibility.
**And** monetary amounts are plain numbers (no "₹" symbol in the CSV — symbol in column header only).

**Given** the report API is called for the patient growth data,
**When** processing `GET /api/v1/reports/patient-growth?clinicId={id}&from={date}&to={date}`,
**Then** it computes new vs returning using: new = `MIN(appointment.slot_date) >= from` for patient; returning = `MIN(appointment.slot_date) < from` AND has appointment in range.
**And** sample appointments excluded.
**And** response < 3 seconds for 90-day range.

## UX Design Reference

**EXPERIENCE.md — Patient growth charts (UX-DR26):**
> Bar chart: same Recharts config as no-show trend (consistent visual language). Grouping label above chart: "Showing weekly / monthly data" — auto-switches with range length.
>
> Donut chart: Recharts PieChart with innerRadius 60%, outerRadius 80%. Brand-primary + teal segments. Centre label: 24px bold neutral-900 (total count) with "patients seen" sub-label 12px neutral-400.

**EXPERIENCE.md — Export UX (UX-DR46):**
> Export button: top-right of filter bar, ghost style, download icon + "Export CSV" label. On click for ≤ 90 days: spinner briefly (100ms), then browser download dialog. On click for > 90 days: modal with clear message + OK. No spinner on the button for async — the modal is the feedback.
>
> In-app notification for async export: persistent amber banner at top of Reports page (and visible on any portal page as a subtle bottom-right toast). Clicking "Download" opens the signed URL in a new tab.

**DESIGN.md — Export modal:**
- Modal: white card, `--shadow-xl`, `--radius-lg`, max-width 400px, centred
- Title: "Preparing your export" 18px semibold
- Body: 14px neutral-600, 2 lines
- OK button: brand-primary fill, full-width, 44px

## File Locations

```
apps/web/
  src/
    app/
      api/
        v1/
          reports/
            patient-growth/
              route.ts                    ← GET: new registrations by week/month + new vs returning
            export/
              route.ts                    ← POST: trigger export job (sync or async)
    components/
      reports/
        PatientGrowthChart.tsx            ← Bar chart: new registrations by period
        NewReturningDonut.tsx             ← Donut chart: new vs returning ratio
        ExportButton.tsx                  ← Export trigger + async modal
        ExportNotification.tsx            ← In-app notification for async export ready
    inngest/
      functions/
        report-export-generate.ts         ← Async: query → CSV → upload → notify
    lib/
      reports/
        csv-export.ts                     ← papaparse wrapper with UTF-8 BOM
        report-queries.ts                 ← Shared SQL query builders for all report types
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | New patient definition: first appointment in range | 100% |
| Unit | Returning patient definition: prior appointment before range start | 100% |
| Unit | Weekly vs monthly grouping: ≤ 60 days → weekly; > 60 days → monthly | 100% |
| Unit | CSV UTF-8 BOM: file starts with \uFEFF | 100% |
| Unit | CSV filename format: correct slug + date range | 100% |
| Unit | Monetary columns: plain number, no ₹ symbol in data cells | 100% |
| Integration | GET /reports/patient-growth: correct new vs returning for date range | 100% |
| Integration | POST /reports/export (≤ 90 days): CSV returned inline, correct encoding | 100% |
| Integration | POST /reports/export (> 90 days): Inngest job enqueued; notification created on complete | 100% |
| Integration | Async export: completes within 5 minutes for 365-day range | NFR-Report-2 |
| Playwright (E2E) | Patient growth section: bar chart + donut render with correct labels | Core path |
| Playwright | Export CSV (≤ 90 days): file downloaded with correct filename | Core path |
| Playwright | Export CSV (> 90 days): async modal shown; notification appears when ready | Core path |
| Playwright | CSV file: open in sheets → Devanagari names render correctly | NFR-Report-3 |
