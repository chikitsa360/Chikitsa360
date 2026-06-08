---
story: 9.1
epic: 9
title: Consultation Fee Recording & Payment Status
status: review
baseline_commit: a763e4fd4d106eb32617f91c524684413434945a
created: 2026-06-07
requirements:
  functional: [FR-31]
  nfr: [NFR-10]
  compliance: [CR-12]
---

# Story 9.1: Consultation Fee Recording & Payment Status

## User Story

As a Receptionist,
I want to record the consultation fee and mark whether a patient has paid directly from the appointment panel —
So that the clinic can track daily revenue without switching to a separate billing system.

## Context

**FR-31:** Receptionist or Owner records fee (INR) against any appointment, sets payment status `paid`/`unpaid`. No validation against price list. Default fee configurable per Doctor in Settings (auto-populates). Payment status toggleable at any time.

**Integration with Dashboard:** Every payment status change publishes `appointment.payment_updated` Pusher event → Story 8.2 revenue card updates within 3 seconds.

**Integration with Visit History:** `consultation_fee` and `payment_status` are visible in the patient's visit history timeline (Story 6.2 — VisitHistoryCard shows fee + status).

**No price list, no GST, no invoicing at MVP.** Pure record-keeping — fee is a free-form INR integer, status is `paid`/`unpaid`.

## Acceptance Criteria

**Given** a Receptionist opens the Appointment Detail Panel (Story 5.1) for any appointment,
**When** the panel renders,
**Then** a "Billing" section is shown below the appointment details:
  - Fee field: "₹" prefix + numeric input, placeholder "Enter amount"
  - Payment status toggle: "Unpaid" | "Paid" (pill toggle, default = Unpaid)
  - If a default fee exists for this doctor (Story 9.2), the fee field is pre-filled with the default amount
  - A "Save" button (only shown when fee or status has changed from current saved value)

**Given** the fee field is pre-filled with the doctor's default fee,
**When** the panel opens,
**Then** the fee input shows the default amount (e.g. "500") and the cursor is at the end.
**And** the payment status toggle shows "Unpaid" by default (regardless of fee pre-fill).
**And** the Receptionist can edit the fee freely — no validation against the default.

**Given** a Receptionist enters a fee amount and clicks "Paid" toggle,
**When** they click "Save",
**Then** `PATCH /api/v1/appointments/{id}/billing` is called with `{ consultation_fee: 500, payment_status: 'paid' }`.
**And** `appointments.consultation_fee` and `appointments.payment_status` are updated.
**And** `appointments.paid_at` is set to current timestamp (for revenue time-series, Phase 1).
**And** Pusher `appointment.payment_updated` event is published to `private-clinic-{clinicId}`.
**And** the dashboard revenue card (Story 8.2) updates within 3 seconds.
**And** audit log: `{ action: 'billing-update', appointmentId, consultation_fee: 500, payment_status: 'paid', actorId, actorRole, timestamp }`.
**And** success toast: "Payment recorded — ₹500 paid."

**Given** a Receptionist changes payment status from `paid` back to `unpaid`,
**When** they toggle "Unpaid" and click "Save",
**Then** `payment_status` is set back to `unpaid`.
**And** `paid_at` is cleared (set to NULL).
**And** Pusher event published → dashboard revenue decrements.
**And** audit log records the reversal.

**Given** a Receptionist enters a fee but does not change the payment status (leaves it as Unpaid),
**When** they click "Save",
**Then** the fee is saved with `payment_status = 'unpaid'`.
**And** the dashboard "pending collection" count updates (fee now recorded, status still unpaid).

**Given** a Receptionist clears the fee field (empties it),
**When** they click "Save",
**Then** `consultation_fee` is set to NULL.
**And** if `payment_status` was `paid`, it is automatically set back to `unpaid` (cannot be paid with no fee).
**And** Pusher event published.

**Given** the fee input receives non-numeric input (letters, symbols),
**When** validation runs,
**Then** non-numeric characters are rejected at input time (numeric input only — `inputmode="numeric"`, pattern `[0-9]*`).
**And** decimal values are rounded to nearest integer (fee in whole INR).
**And** maximum fee: 99,999 INR (client-side guard to prevent accidental large entries).

**Given** a Receptionist views the Appointment Detail Panel for a `cancelled` appointment,
**When** the Billing section renders,
**Then** fee and payment status are shown as read-only (no edit) — cancelled appointments cannot be billed.

**Given** the Visit History card for a patient (Story 6.2) renders a past appointment,
**When** a fee has been recorded,
**Then** the fee and status are shown in the card: "₹500 — Paid" (green chip) or "₹500 — Unpaid" (amber chip) or "No fee recorded" (neutral-400).

## UX Design Reference

**DESIGN.md — Billing section in Appointment Detail Panel:**
- Section header: "Billing" 13px uppercase tracking-wide neutral-400, `border-top: 1px --color-border`, padding-top 16px
- Fee input: 48px height, `--radius-md`, `--color-border` default, `--color-primary` focused; "₹" prefix in neutral-400 left-padding
- Payment status toggle: pill group — "Unpaid" | "Paid"; active pill: `bg-primary text-white` (Paid) or `bg-amber-100 text-amber-700` (Unpaid)
- Save button: brand-primary small (36px height), right-aligned, only shown when dirty (changed from saved state)
- Success state: fee field border turns green for 1 second, then reverts

**EXPERIENCE.md — Billing UX behaviour:**
> The billing section is always visible in the detail panel — even for future appointments (fee can be pre-recorded). Save is only shown when state is dirty (changed from the last saved value). Optimistic UI: toggle and amount update immediately on Save click; API call happens in background. On API error: revert + error toast.

## File Locations

```
apps/web/
  src/
    app/
      api/
        v1/
          appointments/
            [appointmentId]/
              billing/
                route.ts                  ← PATCH: update fee + payment_status
    components/
      appointments/
        BillingSection.tsx                ← Fee input + payment status toggle + Save
    hooks/
      useUpdateBilling.ts                 ← Mutation: PATCH /api/v1/appointments/{id}/billing
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | Fee input: non-numeric rejected; max 99,999 guard | 100% |
| Unit | Clearing fee → payment_status auto-reverts to unpaid | 100% |
| Unit | Cancelled appointment → billing section read-only | 100% |
| Integration | PATCH /billing: fee + status saved + audit log written | 100% |
| Integration | PATCH /billing: Pusher event published on save | 100% |
| Integration | PATCH /billing: 403 for cross-clinic appointmentId | 100% |
| Playwright (E2E) | Open detail panel → enter fee → toggle Paid → Save → revenue card updates within 3s | Core path |
| Playwright | Toggle Unpaid after Paid → revenue decrements | Core path |
| Playwright | Visit history card: fee + status badge visible for past appointment | Core path |

## Dev Agent Record

### Completion Notes

- Created `PATCH /api/v1/appointments/[id]/billing/route.ts`: saves `consultation_fee` (INTEGER) + `payment_status` ('paid'/'unpaid') + `paid_at` timestamp. Restricted to OWNER/RECEPTIONIST (403 for DOCTOR). Cancelled appointments return 422. Auto-reverts status to 'unpaid' when fee is cleared.
- Created `BillingSection.tsx`: fee input with ₹ prefix, Unpaid/Paid pill toggle, dirty-state Save button, green flash on success, read-only for cancelled appointments. Pre-fills from `doctorDefaultFee` (UI-only, counts as dirty).
- Created `useUpdateBilling.ts`: PATCH mutation hook with loading/error state.
- Updated `Appointment` type (CalendarClient) to include `consultation_fee` and `payment_status`.
- Updated `GET /api/v1/appointments` query to return billing fields.
- Updated `appointments/page.tsx` SSR query and doctor query to include billing + `default_fee`.
- Updated `AppointmentDetailPanel.tsx` to accept `doctorDefaultFee` and `onBillingSaved`, render `BillingSection` in body.
- Updated `CalendarClient.tsx` to pass `doctorDefaultFee` and handle optimistic billing update on panel.
- Updated visit history API to return `consultation_fee` + `payment_status`.
- Updated `useVisitHistory.ts` type and `VisitHistoryCard.tsx` to show fee + Paid/Unpaid chip or "No fee recorded".
- Pusher `appointment.payment_updated` event published on every save → dashboard revenue card reacts.
- 10 new integration tests in billing.test.ts — all pass.
- Added `consultation_fee INTEGER`, `payment_status TEXT DEFAULT 'unpaid'`, `paid_at TIMESTAMP(3)` columns to `tenant-schema.sql`.

### File List

- `apps/web/prisma/baseline/tenant-schema.sql` (modified)
- `apps/web/src/app/api/v1/appointments/[id]/billing/route.ts` (created)
- `apps/web/src/app/api/v1/appointments/[id]/billing/__tests__/billing.test.ts` (created)
- `apps/web/src/app/api/v1/appointments/route.ts` (modified)
- `apps/web/src/app/(dashboard)/appointments/page.tsx` (modified)
- `apps/web/src/app/(dashboard)/appointments/CalendarClient.tsx` (modified)
- `apps/web/src/components/appointments/AppointmentDetailPanel.tsx` (modified)
- `apps/web/src/components/appointments/BillingSection.tsx` (created)
- `apps/web/src/hooks/useUpdateBilling.ts` (created)
- `apps/web/src/app/api/v1/patients/[patientId]/appointments/route.ts` (modified)
- `apps/web/src/hooks/useVisitHistory.ts` (modified)
- `apps/web/src/components/patients/VisitHistoryCard.tsx` (modified)

### Change Log

- 2026-06-09: Implemented Story 9.1 — consultation fee recording, payment status toggle, Pusher event, audit log, visit history billing display. 10 integration tests added.
