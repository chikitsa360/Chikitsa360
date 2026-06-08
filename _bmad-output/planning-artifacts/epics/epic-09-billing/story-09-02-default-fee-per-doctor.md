---
story: 9.2
epic: 9
title: Default Fee Configuration per Doctor
status: review
baseline_commit: a763e4fd4d106eb32617f91c524684413434945a
created: 2026-06-07
requirements:
  functional: [FR-32]
  nfr: [NFR-10]
---

# Story 9.2: Default Fee Configuration per Doctor

## User Story

As a Clinic Owner,
I want to set a default consultation fee for each doctor in Settings —
So that the fee field auto-populates when appointments are created, saving receptionists from typing the fee every time.

## Context

**FR-32:** Default fee configurable per Doctor in Settings (auto-populates in the appointment billing section). Receptionist can override for any individual appointment. Fee is stored per-appointment — changing the default does not retroactively update existing appointments.

**Where it's set:** Settings → Doctors → Edit Doctor form. The `default_fee` field was provisioned in Story 2.2 (Doctor Setup) but left blank/optional at that stage. This story ensures it's visible, editable, and wired to the appointment billing auto-populate logic.

**Where it's consumed:** Story 9.1 — when the Appointment Detail Panel's Billing section renders, it checks `appointment.consultation_fee`. If NULL (not yet set), it fetches `doctor.default_fee` and pre-fills the input.

## Acceptance Criteria

**Given** a Clinic Owner navigates to Settings → Doctors and opens a doctor's edit form,
**When** the form renders,
**Then** a "Default Consultation Fee" field is shown: "₹" prefix + numeric input, placeholder "e.g. 500", optional.
**And** the field shows the current default fee if one is already set (from Story 2.2 initial setup).
**And** the field is blank if no default has been configured.

**Given** the Owner enters a fee (e.g. 500) and saves the doctor profile,
**When** `PATCH /api/v1/doctors/{doctorId}` runs,
**Then** `doctors.default_fee = 500` is saved (integer INR).
**And** audit log: `{ action: 'doctor-settings-change', field: 'default_fee', oldValue, newValue, actorId }`.
**And** success toast: "Doctor profile updated."

**Given** a doctor's `default_fee` is set to 500,
**When** a new appointment is created for that doctor (any source — manual, walk-in, WhatsApp, web),
**Then** `appointment.consultation_fee` is NOT automatically set at creation time (the fee is populated in the UI only — not pre-written to the DB on appointment creation).
**And** when the Appointment Detail Panel opens for that appointment, the Billing section fetches `doctor.default_fee` and pre-fills the fee input with "500".
**And** `consultation_fee` in the DB remains NULL until the Receptionist explicitly clicks "Save" in the Billing section.

**Given** the Clinic Owner later changes the default fee from 500 to 700,
**When** the change is saved,
**Then** all existing appointments (with `consultation_fee = NULL`) will pre-fill with 700 when their panel next opens.
**And** existing appointments that already have a saved `consultation_fee` (non-NULL) are NOT affected — they retain their recorded amount.

**Given** a doctor has no default fee configured (`default_fee = NULL`),
**When** the Appointment Detail Panel opens for an appointment with that doctor,
**Then** the fee input is empty (no pre-fill).
**And** placeholder text "Enter amount" is shown.

**Given** the Owner sets the default fee to 0,
**When** the doctor's profile is saved,
**Then** `default_fee = 0` is stored (valid — some clinics have free consultations).
**And** the Billing section pre-fills with "0" and shows payment status defaulting to "Unpaid".

**Given** a Receptionist overrides the pre-filled fee for a specific appointment,
**When** they change the fee from 500 to 300 and save,
**Then** `appointment.consultation_fee = 300` is stored.
**And** the doctor's `default_fee` remains 500 — not changed.
**And** future appointments for this doctor still pre-fill with 500.

## UX Design Reference

**DESIGN.md — Default fee field in Doctor Settings:**
- Field label: "Default Consultation Fee (INR)" — 14px Inter medium neutral-700
- Input: 48px height, `--radius-md`, "₹" prefix in neutral-400; `inputmode="numeric"`, pattern `[0-9]*`
- Helper text below field: "Auto-populates when creating appointments for this doctor. Receptionists can override per appointment."
- Optional badge: small "Optional" chip in neutral-300 next to the label

**EXPERIENCE.md — Default fee pre-fill behaviour:**
> Pre-fill is UI-only (client-side). The fee input shows the default value as a starting point. It appears as if the Receptionist typed it — same styling as a user-entered value. The "Save" button in the Billing section is shown (dirty state) because the pre-fill value differs from the NULL stored in the DB. This ensures the Receptionist always consciously saves the fee rather than it being silently committed.

## File Locations

```
apps/web/
  src/
    app/
      api/
        v1/
          doctors/
            [doctorId]/
              route.ts                    ← PATCH: update doctor profile including default_fee
    components/
      settings/
        DoctorEditForm.tsx                ← Extended: add default_fee field
      appointments/
        BillingSection.tsx                ← Extended (Story 9.1): fetch + pre-fill default_fee
    hooks/
      useDoctorDefaultFee.ts              ← React Query: GET doctor.default_fee for pre-fill
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | default_fee = 0 is valid; stored correctly | 100% |
| Unit | Pre-fill: NULL consultation_fee → shows default_fee in input | 100% |
| Unit | Pre-fill: non-NULL consultation_fee → shows saved fee (not default) | 100% |
| Unit | Changing default_fee does NOT update existing non-NULL consultation_fee records | 100% |
| Integration | PATCH /api/v1/doctors/{id}: default_fee saved + audit log written | 100% |
| Integration | Appointment detail panel: fetches correct doctor default_fee | 100% |
| Playwright (E2E) | Settings → Doctors → set default fee → create appointment → fee pre-filled in panel | Core path |
| Playwright | Override pre-filled fee → save → doctor default_fee unchanged | Core path |
| Playwright | Doctor with no default fee → fee input empty in panel | Core path |

## Dev Agent Record

### Completion Notes

- Created `PATCH /api/v1/doctors/[doctorId]/route.ts`: OWNER-only endpoint updating `name`, `speciality`, `default_fee` with full audit log when `default_fee` changes. Does NOT touch existing appointment `consultation_fee` records (confirmed by test asserting single `executeRawUnsafe` call targeting doctors table only).
- Updated `DoctorsSettingsClient.tsx` to use `PATCH /api/v1/doctors/{id}` (new per-ID route) instead of the old `PUT /api/v1/doctors` with id in body.
- Improved default_fee edit UI: proper "Default Consultation Fee (INR)" label, "₹" prefix input, "Optional" chip badge, helper text explaining auto-populate behaviour. Numeric-only input via `inputMode="numeric"`.
- `CalendarClient.Doctor` type and `appointments/page.tsx` doctor query updated to include `default_fee` — passed to `AppointmentDetailPanel` and pre-fills `BillingSection` when `consultation_fee = NULL`.
- 8 new unit/integration tests for doctor PATCH — all pass.

### File List

- `apps/web/src/app/api/v1/doctors/[doctorId]/route.ts` (created)
- `apps/web/src/app/api/v1/doctors/[doctorId]/__tests__/doctor-patch.test.ts` (created)
- `apps/web/src/components/settings/DoctorsSettingsClient.tsx` (modified)
- `apps/web/src/app/(dashboard)/appointments/CalendarClient.tsx` (modified — Doctor.default_fee)
- `apps/web/src/app/(dashboard)/appointments/page.tsx` (modified — doctor query includes default_fee)

### Change Log

- 2026-06-09: Implemented Story 9.2 — PATCH /api/v1/doctors/[doctorId] with audit log, improved default_fee settings UI (label, helper text, Optional badge, ₹ prefix input). 8 tests added.
