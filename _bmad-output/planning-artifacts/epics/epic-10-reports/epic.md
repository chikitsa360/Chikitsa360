---
epic: 10
title: Reports & Analytics
status: Not Started
created: 2026-06-07
stories: 3
depends_on: [Epic 1, Epic 5, Epic 6, Epic 9]
---

# Epic 10: Reports & Analytics

## Goal

Clinic Owners can view and export operational reports covering appointment trends, no-show rates, doctor utilisation, revenue, and patient growth — enabling data-driven decisions about clinic operations.

## User Outcome

After this epic is complete:
- Owners access a Reports page with date-range filtering (today / week / month / custom)
- Appointment report: total, completed, cancelled, no-show count + % with per-doctor breakdown
- No-show trend: 7-day bar chart
- Revenue report: total collected, by doctor, by booking source, average fee, day-by-day line chart
- Doctor utilisation: slots used vs available (%)
- Patient growth: new registrations by week/month, new vs returning ratio
- All report tables exportable to CSV; large exports (> 90 days) queued via Inngest

## Requirements Covered

| Category | Items |
|---|---|
| Functional | FR-38 (appointment summary report), FR-39 (no-show report), FR-40 (doctor breakdown), FR-41 (revenue report), FR-42 (doctor utilisation), FR-43 (booking source breakdown), FR-44 (patient growth), FR-45 (export to CSV), FR-45b (async export for large ranges) |
| UX Design | UX-DR5 (reports page layout), UX-DR26 (chart design), UX-DR46 (export UX) |
| NFR | NFR-Report-1 (report query < 3s for 90-day range), NFR-Report-2 (async for > 90 days), NFR-Report-3 (CSV export correct encoding) |

## Stories

| # | Title | Status |
|---|---|---|
| [10.1](story-10-01-appointment-and-noshow-reports.md) | Appointment & No-Show Reports | Not Started |
| [10.2](story-10-02-revenue-and-doctor-utilisation.md) | Revenue & Doctor Utilisation Reports | Not Started |
| [10.3](story-10-03-patient-growth-and-export.md) | Patient Growth & Export | Not Started |

## Dependencies

- **Epic 1:** DB schema, audit_logs, Inngest (async export jobs)
- **Epic 5:** Appointment records with status, booking_source, slot_datetime
- **Epic 6:** Patient records with created_at, booking_source
- **Epic 9:** consultation_fee, payment_status on appointments

## Key Technical Notes

- All report queries use aggregate SQL (COUNT, SUM, GROUP BY) — no pre-computed materialized views at MVP scale
- Queries scoped to `clinic_{clinicId}` schema via search_path middleware (same as all other queries)
- Date ranges use IST midnight as day boundaries (not UTC) — `AT TIME ZONE 'Asia/Kolkata'` in SQL
- Charts: Recharts library (lightweight, React-native, no separate charting server)
- CSV export: `papaparse` npm package for client-side small exports; Inngest async job for > 90 day ranges
- Reports page is Owner-only (Receptionist sees "Access restricted" — RBAC enforced at API + UI level)
- Doctor filter available on all reports (defaults to "All Doctors")
