---
epic: 9
title: Basic Billing
status: Not Started
created: 2026-06-07
stories: 2
depends_on: [Epic 1, Epic 2, Epic 5, Epic 8]
---

# Epic 9: Basic Billing

## Goal

Receptionists and Clinic Owners record consultation fees and payment status against any appointment. A per-doctor default fee auto-populates to save data entry time. Payment status changes update the dashboard revenue card in real time.

## User Outcome

After this epic is complete:
- Every appointment can have a consultation fee (INR) and payment status (`paid` / `unpaid`) recorded
- Default fee per doctor auto-populates when a new appointment is created; Receptionist can override it
- Payment status is toggleable at any time from the Appointment Detail Panel
- Dashboard revenue card (Epic 8) updates within 3 seconds of any payment status change
- Fee and payment history is visible in the patient's visit history (Story 6.2)
- All fee changes are audit-logged

## Requirements Covered

| Category | Items |
|---|---|
| Functional | FR-31 (record fee + payment status), FR-32 (default fee per doctor) |
| Compliance | CR-12 (audit log on fee changes) |

## Stories

| # | Title | Status |
|---|---|---|
| [9.1](story-09-01-fee-recording-and-payment-status.md) | Consultation Fee Recording & Payment Status | Not Started |
| [9.2](story-09-02-default-fee-per-doctor.md) | Default Fee Configuration per Doctor | Not Started |

## Dependencies

- **Epic 1:** DB schema (`consultation_fee`, `payment_status` fields on appointments table), audit_logs, Pusher
- **Epic 2:** Doctor settings — default_fee field added to doctor config (Story 2.2)
- **Epic 5:** Appointment Detail Panel (Story 5.1) — billing section added to the panel
- **Epic 8:** Dashboard revenue card (Story 8.2) — subscribes to `appointment.payment_updated` Pusher event

## Key Technical Notes

- `consultation_fee` stored as `INTEGER` (paise/rupees? — use INR rupees as integer for simplicity at MVP; no decimal needed for clinic fees)
- `payment_status` is an enum: `unpaid` (default) | `paid` — no partial payment concept at MVP
- Fee stored per-appointment at the time of billing — changing doctor's default_fee does NOT retroactively update existing appointments
- Pusher event `appointment.payment_updated` published on any payment status or fee change
- No invoicing, no GST calculation, no payment gateway at MVP — pure record-keeping only
