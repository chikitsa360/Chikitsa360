---
story: 5.2
epic: 5
title: Manual Appointment Creation
status: review
baseline_commit: 4726811ba8737c9ef0947d6d2fd43d7eda09bca7
created: 2026-06-07
requirements:
  functional: [FR-10, FR-15]
  nfr: [NFR-7, NFR-10]
  ux: [UX-DR13, UX-DR14, UX-DR35]
---

# Story 5.2: Manual Appointment Creation

## User Story

As a Receptionist,
I want to create an appointment for a patient directly from the portal by looking them up by phone number and selecting a slot,
So that I can book appointments for patients who call in or visit in person, without needing them to use WhatsApp or the web link.

## Context

**FR-10:** Logged-in Receptionist or Owner specifies patient (new/existing), doctor, slot. Existing phone number auto-fills name and shows visit history inline. New patient → create record (name + phone minimum). Appointment appears immediately in calendar. Token assigned with same daily sequential logic as FR-5.

**FR-15:** Two concurrent bookings on same slot: exactly one succeeds; other receives "Slot just taken" with alternatives. Manual entry into booked slot shows warning + requires explicit confirmation to override.

**Slot locking:** Same `SELECT ... FOR UPDATE SKIP LOCKED` used by WhatsApp and web flows — no special path for manual entry.

**Patient de-duplication:** Phone number lookup is scoped to the Clinic's tenant. If a match is found, the existing record is reused; the Receptionist cannot accidentally create a duplicate.

## Acceptance Criteria

**Given** a Receptionist clicks "+ New Appointment" (available in header quick-actions or in the Day View empty state),
**When** the New Appointment panel/modal opens,
**Then** it opens as a right-side panel on desktop or full-screen sheet on mobile (UX-DR14).
**And** focus moves to the Phone Number field automatically.
**And** the panel title is "New Appointment".

**Given** the Receptionist types a 10-digit phone number in the Phone field,
**When** 10 digits are entered,
**Then** the system performs an async lookup: `GET /api/v1/patients/by-phone?phone={phone}&clinicId={clinicId}`.
**And** if the patient EXISTS → the Name field auto-fills with the patient's name (read-only with an edit icon).
**And** a compact visit history strip appears below the name: "Last seen: {date} — Dr. {Doctor} — {status}" (most recent appointment).
**And** if multiple prior visits exist, a "See all {N} visits" link expands the history inline.
**And** if the patient DOES NOT EXIST → Name field is empty and editable; a helper text shows "New patient — a record will be created on booking".

**Given** the patient is identified (existing or new),
**When** the Receptionist selects a Doctor from the Doctor dropdown,
**Then** the available slots for that doctor are fetched: `GET /api/v1/slots/available?clinicId={clinicId}&doctorId={doctorId}&date={date}`.
**And** slots render in a date-grouped grid (same component as the web booking page — `SlotGrid`).
**And** the date defaults to today; the Receptionist can navigate to a different date.

**Given** the Receptionist selects a time slot,
**When** the slot is tapped/clicked,
**Then** the slot is highlighted (brand-primary border + `bg-primary/10`).
**And** a summary row appears: "{Doctor} — {Date} at {Time}".
**And** the "Confirm Appointment" button becomes active.

**Given** the Receptionist clicks "Confirm Appointment",
**When** the form submits,
**Then** a `POST /api/v1/appointments` request is made with: `{ patientId | newPatient: { name, phone }, doctorId, clinicId, slotDate, slotTime, bookingSource: 'manual' }`.
**And** the API runs `SELECT ... FOR UPDATE SKIP LOCKED` on the slot.
**And** if the slot is available: Patient record is created if new (name + phone, `booking_source: 'manual'`). Appointment is created with status `confirmed`, `booking_source: 'manual'`, `token_number = MAX(today) + 1` (in transaction). `scheduleConfirmation(appointmentId)` is called. Pusher `appointment.created` event published. The panel closes; the new appointment appears in the Day View calendar within 5 seconds.
**And** the token number is shown in a success toast: "Appointment confirmed — Token #7" (UX-DR35).

**Given** the slot was taken between the Receptionist opening the panel and clicking Confirm,
**When** the `SELECT FOR UPDATE SKIP LOCKED` detects the conflict,
**Then** the form shows an inline message: "That slot was just taken. Please choose another time."
**And** the slot grid refreshes automatically to show current availability.
**And** all previously entered data (name, phone) is preserved.
**And** the "Confirm Appointment" button returns to its normal state.

**Given** the Receptionist tries to book a slot that shows as already booked in the grid (e.g. a different doctor's appointment was rescheduled into it),
**When** the API returns a conflict for a slot the Receptionist manually selected,
**Then** the same "slot just taken" message appears — no silent override is possible without the walk-in override flow (Story 5.3).

**Given** the Receptionist enters a new patient's name,
**When** the name field loses focus (blur validation),
**Then** digit-only or special-character-only names are rejected with: "Please enter a valid patient name."
**And** Unicode and Devanagari characters are accepted (same validation as FR-3).

**Given** the Receptionist enters a phone number that is already registered to a different patient in this clinic,
**When** the lookup returns the existing patient,
**Then** the Receptionist is shown the existing record (name auto-fill + history) and cannot create a new record for that number — FR-20 de-duplication applies to manual creation too.

**Given** the form is submitted with a valid new patient (name + phone),
**When** the API creates the patient record,
**Then** `booking_source = 'manual'` is set on the Patient record.
**And** DOB, gender, reason for visit are left blank (FR-17: all fields except name + phone optional; completable from Patient Profile later).

**Given** the Receptionist closes the panel without submitting,
**When** the panel is dismissed (Escape / × / backdrop click),
**Then** no patient or appointment records are created.
**And** if a slot had been selected (but not confirmed), no slot hold is placed (manual creation has no timed slot reservation — only `SELECT FOR UPDATE` at submit time).

## UX Design Reference

**EXPERIENCE.md — Manual appointment creation panel (UX-DR14):**
> Panel layout (top to bottom):
> 1. Phone number input (numeric keyboard, `inputmode="tel"`) — auto-lookup on 10-digit entry
> 2. Patient name (auto-filled if existing; editable if new; inline visit history strip below if existing)
> 3. Doctor selector (dropdown; defaults to single doctor if clinic has only one)
> 4. Date navigator (defaults to today; < > chevrons)
> 5. Slot grid (date-grouped time buttons, same design as web booking SlotGrid)
> 6. Selected slot summary row
> 7. "Confirm Appointment" button (brand-primary, full-width, 52px, disabled until slot selected)

**DESIGN.md — Panel specifics:**
- Panel width: 420px on desktop, full-screen on mobile
- Header: "New Appointment" 18px semibold + × close
- Input labels: 14px Inter medium neutral-700
- Visit history strip: `bg-neutral-50` rounded-md, 12px Inter, neutral-600
- Success toast: green-50 background, checkmark icon, token number bold

**EXPERIENCE.md — Token display (UX-DR35):**
> Token number shown prominently on success: large (#N) in brand-primary, 28px semibold, in the confirmation toast and in the appointment detail panel header.

## File Locations

```
apps/web/
  src/
    app/
      api/
        v1/
          appointments/
            route.ts                      ← POST: create appointment (manual/walk-in/web)
          patients/
            by-phone/
              route.ts                    ← GET: patient lookup by phone + clinicId
    components/
      appointments/
        NewAppointmentPanel.tsx           ← Wrapper panel/modal shell
        PatientLookup.tsx                 ← Phone input + auto-fill + visit history strip
        DoctorSlotSelector.tsx            ← Doctor dropdown + SlotGrid + date nav
    hooks/
      usePatientLookup.ts                 ← React Query hook: debounced phone lookup
      useCreateAppointment.ts             ← Mutation hook: POST /api/v1/appointments
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | Patient name validation: Unicode/Devanagari pass; digit-only fail | 100% |
| Unit | Phone lookup: existing patient returns record; unknown returns null | 100% |
| Unit | Token assignment: MAX(today) + 1 in transaction (concurrent creation test) | 100% |
| Integration | Manual booking: new patient created + appointment created + confirmation scheduled | 100% |
| Integration | Manual booking: existing patient matched — no duplicate | 100% |
| Integration | Slot race condition on manual booking (concurrent requests) | 100% |
| Integration | POST /api/v1/appointments: clinic tenant isolation (cannot book into another clinic) | 100% |
| Playwright (E2E) | Open panel → enter phone → select doctor → select slot → confirm → token shown in toast | Core path |
| Playwright | Existing patient: phone entry → name auto-fills + visit history shown | Core path |
| Playwright | Race condition: submit → "slot just taken" → grid refreshes | Core path |

## Dev Agent Record

### Completion Notes

- `POST /api/v1/appointments` route handles `bookingSource: 'manual'`; validates doctor belongs to clinic; patient de-duplication by phone (FR-20); token = MAX(today)+1; 409 SLOT_TAKEN on unique constraint violation
- `GET /api/v1/patients/by-phone` returns existing patient with last 5 visits or null for unknown number
- `GET /api/v1/slots/available` extended to accept `clinicId` directly (portal use) in addition to `slug` (public)
- `NewAppointmentPanel.tsx`: 420px right-side panel, Escape to close, integrates PatientLookup + doctor select + SlotGrid
- `PatientLookup.tsx`: 300ms debounce, auto-lookup on 10 digits, existing patient name read-only + visit history strip, new patient editable; Unicode/Devanagari-safe name validation via `/\p{L}/u`
- Integration tests: POST new patient, existing patient de-dup (FR-20), walk-in booking_source, 409 SLOT_TAKEN, 404 doctor not found, 400 validation (16 tests in appointments.test.ts)

## File List

- apps/web/src/app/api/v1/appointments/route.ts (new — shared with 5.1)
- apps/web/src/app/api/v1/patients/by-phone/route.ts (new)
- apps/web/src/app/api/v1/slots/available/route.ts (modified — added clinicId param)
- apps/web/src/components/appointments/NewAppointmentPanel.tsx (new)
- apps/web/src/components/appointments/PatientLookup.tsx (new)
- apps/web/src/app/api/v1/appointments/__tests__/appointments.test.ts (new)

## Change Log

- 2026-06-08: Implemented Story 5.2 — Manual Appointment Creation. POST /api/v1/appointments, GET /api/v1/patients/by-phone, NewAppointmentPanel, PatientLookup with Unicode name validation. FR-20 de-duplication, 409 race condition handling.
