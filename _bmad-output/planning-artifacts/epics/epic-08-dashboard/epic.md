---
epic: 8
title: Clinic Dashboard
status: Not Started
created: 2026-06-07
stories: 2
depends_on: [Epic 1, Epic 5, Epic 6, Epic 9]
---

# Epic 8: Clinic Dashboard

## Goal

Clinic Owners and Receptionists open the portal and immediately see a real-time operational picture: today's appointment counts, revenue, patient breakdown, upcoming appointments, and a weekly performance summary — all updating live without a manual refresh.

## User Outcome

After this epic is complete:
- Dashboard answers "what's happening right now" in under 5 seconds of page load
- Stat cards show: total appointments today, completed, remaining, no-shows, new vs returning patients
- Revenue card shows today's collected fees (INR) + pending collection count
- Upcoming appointments feed shows the next 5 appointments with token, patient, doctor, time, source
- All counts update in real time (< 3 seconds) via Pusher on any appointment or payment event
- Weekly summary toggle shows Mon–Sun aggregates without leaving the dashboard

## Requirements Covered

| Category | Items |
|---|---|
| Functional | FR-26 (today's appointment summary), FR-27 (patient breakdown), FR-28 (daily revenue), FR-29 (upcoming feed), FR-30 (weekly summary) |
| UX Design | UX-DR4 (dashboard layout), UX-DR8 (stat cards), UX-DR19 (upcoming feed), UX-DR34 (no-show marking), UX-DR42 (animated counter), UX-DR43 (weekly toggle) |

## Stories

| # | Title | Status |
|---|---|---|
| [8.1](story-08-01-realtime-summary-and-upcoming-feed.md) | Real-Time Today's Summary & Upcoming Feed | Not Started |
| [8.2](story-08-02-revenue-and-weekly-summary.md) | Revenue Tracking & Weekly Summary | Not Started |

## Dependencies

- **Epic 1:** Pusher channels, DB schema, audit_logs
- **Epic 5:** Appointment records, status updates, no-show marking
- **Epic 6:** Patient records — new vs returning classification (first appointment = new)
- **Epic 9:** Payment status (`paid`/`unpaid`) on appointments — revenue card depends on this

## Key Technical Notes

- Dashboard page: RSC fetches today's aggregate counts server-side for fast LCP; real-time updates are client-side via Pusher + React Query invalidation
- "Remaining" count = `confirmed` appointments where `slot_datetime > NOW()` (computed at query time, not stored)
- "New patient" = patient whose first-ever appointment at this clinic is today (`MIN(appointment.created_at)` per patient = today)
- Revenue = `SUM(consultation_fee)` WHERE `payment_status = 'paid'` AND `slot_date = today` AND `clinic_id = {clinicId}`
- All Pusher events from Epics 5, 7, 9 that change appointment state trigger dashboard re-aggregation via `queryClient.invalidateQueries(['dashboard', clinicId])`
- Weekly summary computed on demand (no pre-aggregation at MVP scale)
