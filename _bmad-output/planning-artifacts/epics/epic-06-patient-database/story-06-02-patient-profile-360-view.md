---
story: 6.2
epic: 6
title: Patient Profile & 360° View
status: Not Started
created: 2026-06-07
requirements:
  functional: [FR-17, FR-18]
  nfr: [NFR-2, NFR-5]
  ux: [UX-DR21, UX-DR23, UX-DR45]
  compliance: [CR-12]
---

# Story 6.2: Patient Profile & 360° View

## User Story

As a Receptionist or Doctor,
I want to open any patient's profile and immediately see their personal details, full appointment history, and any visit notes —
So that I have a complete picture of the patient's relationship with the clinic before I interact with them.

## Context

**FR-17:** Patient profile fields: name, mobile number, DOB (optional), gender (optional), reason for first visit (optional). Mobile number = unique identifier per patient within clinic tenant. Profile created via WhatsApp flow (FR-3) or manually by Receptionist (FR-10). All fields except name + mobile optional; completable later.

**FR-18:** Visit history — chronological list of all appointments: date, doctor, status, visit note. All statuses appear (completed, cancelled, no-show). Read-only for Receptionists; Doctors and Owners can add plain-text visit note (500 chars max) to any `completed` appointment.

**360° view:** The profile page is the single source of truth for everything the clinic knows about a patient. Designed to answer "who is this person?" in under 5 seconds.

**Performance:** Profile page uses RSC for initial data (name, phone, DOB) for fast LCP. Visit history is paginated and loaded client-side.

## Acceptance Criteria

**Given** a Receptionist or Doctor navigates to a patient's profile (via search result, appointment detail panel, or direct URL `/patients/{patientId}`),
**When** the profile page loads,
**Then** the page header shows: Patient name (24px semibold), avatar initials circle (48px, brand-primary), mobile number, and a "Book Appointment" CTA button.
**And** below the header, two sections: "Patient Details" (left card) and "Visit History" (right / below on mobile).

**Given** the Patient Details section renders,
**When** the profile loads,
**Then** it shows: Full Name, Mobile Number (unmasked — staff view), Date of Birth (if set; else "Not provided"), Gender (if set; else "Not provided"), Reason for first visit (if set; else "Not provided"), Date registered (when the patient record was created), Booking source at registration (WhatsApp / Web / Manual).
**And** an "Edit Profile" button allows inline editing of all optional fields (DOB, gender, reason for visit).
**And** Name and Mobile Number are not editable via the profile page (changes to identifying fields require Settings → Patient Merge or admin action — out of scope MVP).

**Given** a Receptionist clicks "Edit Profile",
**When** the inline edit mode activates,
**Then** DOB (date picker), Gender (Select: Male / Female / Other / Prefer not to say), and Reason for first visit (text input, max 200 chars) become editable fields.
**And** "Save" and "Cancel" buttons appear.
**And** on Save: `PATCH /api/v1/patients/{id}` updates the fields.
**And** audit log: `{ action: 'patient-profile-edit', patientId, changedFields, actorId, timestamp }`.
**And** a success toast: "Patient profile updated."

**Given** the Visit History section renders,
**When** the patient has appointments,
**Then** appointments are listed in reverse-chronological order (most recent first).
**And** each entry shows: Date + Time (IST), Doctor name, Status badge (colour-coded), Token number, Visit note excerpt (first 100 chars if present; "No note" in neutral-400 if absent).
**And** entries are paginated: 10 per page with "Load more" infinite scroll.
**And** the total count is shown: "X appointments".

**Given** the patient has no appointments yet,
**When** the visit history renders,
**Then** an empty state is shown: "No appointments yet." with a "Book First Appointment" CTA (launches the New Appointment panel pre-filled with this patient).

**Given** a Doctor or Owner views a `completed` appointment in the visit history,
**When** they click on the visit note area (or "Add note" if none exists),
**Then** an inline note editor appears (Story 6.3 — UX-DR45).

**Given** a Receptionist views the same `completed` appointment,
**When** they see the visit note section,
**Then** the note is displayed read-only (no edit icon, no "Add note" link).
**And** the RBAC check `canEditVisitNote(role)` returns `false` for `receptionist` role.

**Given** the "Book Appointment" CTA button is clicked,
**When** the New Appointment panel opens (Story 5.2),
**Then** it opens pre-filled with this patient's phone and name (patient lookup step is skipped — patient already identified).
**And** the panel goes directly to Doctor + Slot selection.

**Given** the profile page is accessed on a mobile device,
**When** the layout renders on a viewport < 768px,
**Then** Patient Details and Visit History are stacked vertically (single column).
**And** the "Book Appointment" button is sticky at the bottom of the screen.

**Given** the profile URL `/patients/{patientId}` is accessed,
**When** the `patientId` belongs to a different clinic's tenant,
**Then** the API returns 404 (not 403 — we do not reveal that the patient exists in another tenant).
**And** the page renders a "Patient not found" state.

## UX Design Reference

**EXPERIENCE.md — Patient profile 360° view (UX-DR21):**
> Two-column layout on desktop (Patient Details left 35% | Visit History right 65%). Single column on mobile.
>
> Patient Details card: white, shadow-card, radius-lg. Header row: avatar (48px circle initials) + name + phone + "Book Appointment" button (right-aligned). Divider. Fields below in label + value pairs: Label 12px neutral-500 uppercase tracking-wide; Value 15px neutral-900.
>
> Visit History: list of timeline cards. Each card has left coloured border (status-coded, same as calendar). Date + doctor in header row. Status badge right-aligned. Token # subtle (12px neutral-400). Note excerpt below in 13px italic neutral-600.

**EXPERIENCE.md — Visit history timeline (UX-DR23):**
> Timeline is reverse-chronological. Each entry is a card with: left border (4px status colour), top row (date + time + doctor), second row (status badge + token), third row (note excerpt or "No note"). Clicking a card expands it to show the full note and inline note editor (if permitted). Collapsed by default; expanded state persists per session.

**DESIGN.md — Profile page:**
- Page background: `--color-surface` (light grey)
- Patient Details card: white, `--shadow-card`, `--radius-lg`, padding 24px
- Avatar circle: 48px, `bg-primary/10 text-primary font-semibold text-lg`
- Patient name: 22px Plus Jakarta Sans semibold neutral-900
- Field label: 11px Inter uppercase tracking-wider neutral-400
- Field value: 15px Inter neutral-800
- "Book Appointment" button: brand-primary fill, 40px height, `--radius-md`
- Visit History card: white, border `--color-border`, `--radius-md`, padding 16px, margin-bottom 8px

## File Locations

```
apps/web/
  src/
    app/
      (portal)/
        patients/
          [patientId]/
            page.tsx                      ← RSC: fetch patient details server-side
            PatientProfileClient.tsx      ← Client: visit history (React Query, paginated)
      api/
        v1/
          patients/
            [patientId]/
              route.ts                    ← GET: patient detail; PATCH: update profile fields
    components/
      patients/
        PatientHeader.tsx                 ← Avatar + name + phone + Book Appointment CTA
        PatientDetailsCard.tsx            ← Personal info fields + inline edit
        VisitHistoryList.tsx              ← Paginated visit history with timeline cards
        VisitHistoryCard.tsx              ← Individual appointment entry (expandable)
    hooks/
      useVisitHistory.ts                  ← React Query: GET /api/v1/patients/{id}/appointments
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | RBAC: canEditVisitNote — doctor/owner true, receptionist false | 100% |
| Unit | Profile page 404 for cross-tenant patientId | 100% |
| Unit | Visit history: reverse-chronological sort | 100% |
| Integration | GET /api/v1/patients/{id}: returns correct patient with tenant check | 100% |
| Integration | PATCH /api/v1/patients/{id}: updates optional fields + audit log written | 100% |
| Integration | GET /api/v1/patients/{id}: 404 for patientId in different clinic tenant | 100% |
| Playwright (E2E) | Open patient profile → verify details rendered → edit DOB → save → value updated | Core path |
| Playwright | Doctor role: completed appointment → "Add note" visible and clickable | Core path |
| Playwright | Receptionist role: completed appointment → note visible but no edit control | Core path |
| Playwright | "Book Appointment" CTA → panel opens pre-filled with patient | Core path |
| Playwright | Mobile (375px): two sections stacked; "Book Appointment" sticky at bottom | Mobile UJ |
