---
epic: 11
title: Subscription Enforcement & Data Rights
status: Not Started
created: 2026-06-07
stories: 3
depends_on: [Epic 1, Epic 2, Epic 3, Epic 4, Epic 5, Epic 6, Epic 9, Epic 10]
---

# Epic 11: Subscription Enforcement & Data Rights

## Goal

Clinics on expired or plan-exceeded subscriptions are gracefully blocked from new bookings while retaining portal read access. Patients and Clinic Owners can exercise DPDP Act 2023 data rights (erasure, portability). A Super Admin panel allows platform operators to manage clinic plans.

## User Outcome

After this epic is complete:
- Doctor invitations are blocked when a clinic's plan doctor limit is reached
- Expired plans show a soft paywall on WhatsApp and Web Booking (no new bookings); portal remains read-only
- A 7-day expiry warning banner appears in the portal before plan expires
- Clinic Owners can submit patient data erasure requests (DPDP Act CR-3) — PII anonymised, records retained
- Clinic Owners can export all clinic data as a ZIP of CSVs (DPDP Act data portability — CR-13)
- Super Admin can view all clinics, plan status, and manually extend/change plans

## Requirements Covered

| Category | Items |
|---|---|
| Monetisation | MON-1 (plan tiers), MON-2 (doctor limit enforcement), MON-3 (soft paywall on expiry), MON-4 (expiry warning banner) |
| Compliance | CR-3 (patient data erasure — DPDP Act 2023), CR-13 (data export / portability) |
| UX Design | UX-DR25 (plan expiry states), UX-DR27 (Data Rights section in Settings) |

## Stories

| # | Title | Status |
|---|---|---|
| [11.1](story-11-01-subscription-enforcement-and-soft-paywall.md) | Subscription Plan Enforcement & Soft Paywall | Not Started |
| [11.2](story-11-02-patient-data-erasure.md) | Patient Data Erasure (DPDP Act) | Not Started |
| [11.3](story-11-03-data-export-and-super-admin.md) | Data Export & Super Admin Plan Management | Not Started |

## Dependencies

- **Epic 1:** DB schema (`clinics.plan`, `clinics.plan_expires_at`, `clinics.doctor_limit`), audit_logs, RBAC
- **Epic 2:** Doctor invite flow (Story 1.5) — limit check added here
- **Epic 3:** WhatsApp booking flow (Story 3.2) — soft paywall check already scaffolded
- **Epic 4:** Web Booking page (Story 4.1) — soft paywall check already scaffolded
- **Epic 5–10:** All data these epics generate is included in the data export (Story 11.3)

## Key Technical Notes

- Plan fields on `clinics` table: `plan` (enum: `trial` | `basic` | `pro`), `plan_expires_at` (timestamp), `doctor_limit` (integer)
- Soft paywall check: `clinic.plan_expires_at < NOW()` — a simple timestamp comparison; no external billing API at MVP
- Plan management at MVP: Super Admin manually sets plan via admin panel (no Stripe integration at MVP)
- Data erasure: anonymise-in-place (not delete) — preserves referential integrity and audit trail; irreversible
- Data export: Inngest job generates ZIP (patients.csv + appointments.csv + billing.csv); stored in Vercel Blob with 24h signed URL
- Super Admin role: `users.system_role = 'super_admin'` — checked at middleware level for `/admin` routes; completely separate from clinic RBAC
