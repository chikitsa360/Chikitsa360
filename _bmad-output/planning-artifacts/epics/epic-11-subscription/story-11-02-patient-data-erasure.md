---
story: 11.2
epic: 11
title: Patient Data Erasure (DPDP Act)
status: Not Started
created: 2026-06-07
requirements:
  compliance: [CR-3]
  ux: [UX-DR27]
---

# Story 11.2: Patient Data Erasure (DPDP Act)

## User Story

As a Clinic Owner,
I want to be able to erase a patient's personal information when they request it under the DPDP Act —
So that the clinic can comply with India's Digital Personal Data Protection Act 2023 right to erasure.

## Context

**CR-3:** Patient data erasure — PII anonymised on request. Appointment records retained for audit purposes (complete deletion would violate audit trail requirements). Erasure is irreversible.

**DPDP Act 2023 right to erasure:** The patient's PII is anonymised (not physically deleted) to preserve referential integrity and audit logs. This is a legally accepted approach to "erasure" — the data can no longer identify the individual.

**PII fields anonymised:**
- `patients.name` → "Deleted Patient"
- `patients.phone` → NULL (unique constraint removed at same time — allows future re-registration with the same number)
- `patients.dob` → NULL
- `patients.gender` → NULL
- `patients.reason_for_first_visit` → NULL
- `appointments.visit_note` (all appointments for this patient) → "[deleted per erasure request]"

**Fields retained:** `appointments.*` (all except visit_notes), `audit_logs.*` — retained for legal/operational audit compliance.

**Access:** Owner-only action. Receptionist cannot initiate erasure.

## Acceptance Criteria

**Given** a Clinic Owner navigates to Settings → Data Rights,
**When** the page loads,
**Then** a "Patient Data Erasure" section is shown with: a description of the DPDP Act erasure right and a patient search input.

**Given** the Owner searches for a patient by name or phone,
**When** results appear (same search as Story 6.1),
**Then** each result has an "Erase Data" button (red, small, right-aligned).

**Given** the Owner clicks "Erase Data" for a patient,
**When** the confirmation dialog opens,
**Then** the dialog shows:
- Patient name and phone (current values — last visible before erasure)
- Warning: "This action permanently removes all personal information for this patient. Appointment history is retained for audit purposes. This cannot be undone."
- A text confirmation input: "Type DELETE to confirm"
- "Erase Patient Data" button (red-filled, disabled until "DELETE" is typed exactly)
- "Cancel" button (ghost)

**Given** the Owner types "DELETE" and clicks "Erase Patient Data",
**When** the erasure runs,
**Then** a DB transaction executes atomically:
  1. `UPDATE clinic_{clinicId}.patients SET name = 'Deleted Patient', phone = NULL, dob = NULL, gender = NULL, reason_for_first_visit = NULL WHERE id = {patientId}`
  2. `UPDATE clinic_{clinicId}.appointments SET visit_note = '[deleted per erasure request]' WHERE patient_id = {patientId} AND visit_note IS NOT NULL`
  3. `INSERT INTO audit.audit_logs (...) VALUES ('patient-erasure', patientId, actorId, actorRole, NOW(), { reason: 'DPDP Act erasure request' })`
**And** all steps succeed or all roll back (transaction).
**And** the dialog closes; success toast: "Patient data erased. Personal information has been anonymised."
**And** the patient record now shows "Deleted Patient" if viewed — the record still exists (no DELETE from DB).

**Given** the erasure runs and the patient's phone is set to NULL,
**When** a future patient books with the same phone number,
**Then** the de-duplication check (FR-20) does NOT match against the erased record (phone = NULL).
**And** a new Patient record is created for the new booking.

**Given** a Receptionist navigates to Settings → Data Rights,
**When** the page loads,
**Then** the page shows: "Data erasure can only be performed by Clinic Owners."
**And** the API `POST /api/v1/patients/{id}/erase` returns 403 for Receptionist session tokens.

**Given** the erasure audit log entry is created,
**When** the Super Admin or Owner views audit logs,
**Then** the entry is visible with: action `patient-erasure`, timestamp, actorId, actorRole, patientId (the ID is retained — the PII is gone but the audit entry is not).
**And** the audit log entry itself is immutable (INSERT-only — cannot be erased).

**Given** the Owner searches for the erased patient after erasure,
**When** they search by the old name or phone,
**Then** the erased record does NOT appear in search results (name = "Deleted Patient" — does not match a real name search; phone = NULL — does not match phone search).

## UX Design Reference

**EXPERIENCE.md — Data Rights settings section (UX-DR27):**
> Settings → Data Rights page:
> - Section: "Patient Data Erasure (DPDP Act)"
>   - Description: 2-sentence explanation of the right to erasure
>   - Patient search input (same component as global search)
>   - Results list with "Erase Data" button per patient
> - Section: "Clinic Data Export" (Story 11.3)
>
> Erasure confirmation dialog: destructive action pattern — most friction of all dialogs in the platform. Red header ("Erase Patient Data"), warning icon. "Type DELETE" input is case-sensitive. "Erase Patient Data" button remains grey until exact match typed.

**DESIGN.md — Erasure dialog:**
- Dialog header: `bg-red-50 border-b border-red-100 text-red-800` with shield-alert icon
- Warning text: 14px neutral-700, `bg-amber-50 rounded-md p-3 border border-amber-200` block
- Confirmation input: standard input, but border turns red on focus
- "Erase Patient Data" button: `bg-red-600 text-white hover:bg-red-700`; disabled state: 40% opacity + cursor-not-allowed

## File Locations

```
apps/web/
  src/
    app/
      (portal)/
        settings/
          data-rights/
            page.tsx                      ← Settings → Data Rights (Owner-only, RBAC gate)
            DataRightsClient.tsx          ← Client: search + erasure flow
      api/
        v1/
          patients/
            [patientId]/
              erase/
                route.ts                  ← POST: anonymise patient PII (Owner only)
    components/
      settings/
        PatientErasureSearch.tsx          ← Search + results with Erase button
        ErasureConfirmDialog.tsx          ← Type-DELETE confirmation dialog
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | Erasure transaction: all 3 steps execute atomically | 100% |
| Unit | Post-erasure: phone = NULL → de-duplication does not match erased record | 100% |
| Unit | Erased patient: does not appear in name/phone search results | 100% |
| Unit | Audit log created with correct fields (patientId retained) | 100% |
| Integration | POST /patients/{id}/erase: PII fields anonymised in DB | 100% |
| Integration | POST /patients/{id}/erase: 403 for Receptionist session | 100% |
| Integration | POST /patients/{id}/erase: visit_notes set to '[deleted per erasure request]' | 100% |
| Integration | Post-erasure: new booking with same phone creates NEW patient record (no dedup match) | 100% |
| Playwright (E2E) | Owner: search patient → click Erase → type DELETE → confirm → record anonymised | Core path |
| Playwright | "Erase Patient Data" button disabled until "DELETE" typed exactly (case-sensitive) | Core path |
| Playwright | Receptionist: Data Rights page shows access-restricted message | Core path |
