---
epic: 6
title: Patient Database & Profiles
status: Not Started
created: 2026-06-07
stories: 3
depends_on: [Epic 1, Epic 2, Epic 5]
---

# Epic 6: Patient Database & Profiles

## Goal

Every patient at a clinic has a searchable profile with a complete 360° visit history. Receptionists can search, create, and update patient records; Doctors and Owners can add clinical visit notes to completed appointments.

## User Outcome

After this epic is complete:
- Receptionists can search any patient by name (3+ chars) or last 4 digits of phone — results in under 1 second
- Duplicate patient records are prevented: entering an existing phone number always surfaces the existing record
- Patient profiles show all personal info and a chronological visit history across all appointments at the clinic
- Doctors and Owners can add plain-text visit notes (up to 500 chars) to any completed appointment
- Receptionists can view but not edit visit notes (RBAC enforced)
- "Book Appointment" CTA on the patient profile pre-fills the appointment panel with the patient's details
- All profile edits are audit-logged with actor and timestamp

## Requirements Covered

| Category | Items |
|---|---|
| Functional | FR-17 (patient profile fields), FR-18 (visit history + notes), FR-19 (patient search), FR-20 (de-duplication) |
| UX Design | UX-DR21 (patient profile 360° view), UX-DR23 (visit history timeline), UX-DR33 (search results), UX-DR45 (inline note editor) |
| Compliance | CR-4 (data residency ap-south-1), CR-12 (audit log) |

## Stories

| # | Title | Status |
|---|---|---|
| [6.1](story-06-01-patient-search-and-directory.md) | Patient Search & Directory | Not Started |
| [6.2](story-06-02-patient-profile-360-view.md) | Patient Profile & 360° View | Not Started |
| [6.3](story-06-03-visit-notes-and-record-management.md) | Visit Notes & Record Management | Not Started |

## Dependencies

- **Epic 1:** DB schema (patients table in clinic_{clinicId} schema), RBAC (Doctor vs Receptionist write permissions), audit_logs
- **Epic 2:** Clinic tenant isolation — all patient queries scoped to `clinic_{clinicId}` schema
- **Epic 5:** Appointment records with status, visit notes — profile aggregates data from appointments table

## Key Technical Notes

- Patient records live in `clinic_{clinicId}.patients` — complete tenant isolation; cross-clinic lookup is impossible by schema design
- Search uses PostgreSQL `ILIKE` on `name` + exact match on last 4 digits of `phone` — no full-text index needed at MVP scale (≤ 5,000 records)
- Patient profile page is a Server Component (RSC) for fast initial render of profile fields; visit history loaded client-side with React Query (dynamic, paginated)
- Visit note RBAC: `canEditVisitNote(role)` returns true for `owner` and `doctor` only; Receptionist sees notes read-only
- De-duplication enforced at API level: `POST /api/v1/patients` checks for existing phone in clinic tenant before creating; returns existing record if found
