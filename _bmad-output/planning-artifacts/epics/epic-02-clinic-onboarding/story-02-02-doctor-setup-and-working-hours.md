---
story: 2.2
epic: 2
title: Doctor Setup & Working Hours Configuration
status: Not Started
created: 2026-06-07
requirements:
  functional: [FR-13, FR-36]
  monetisation: [MON-2]
  nfr: [NFR-23]
  ux: [UX-DR27]
---

# Story 2.2: Doctor Setup & Working Hours Configuration

## User Story

As a Clinic Owner,
I want to add my doctors and configure their working hours and appointment slot durations,
So that the system knows when appointments can be booked and presents the correct available slots to patients.

## Context

**FR-13: Working hours and slot configuration:**
- Working days, start/end time, slot duration (15/20/30/60 min), per-doctor schedules
- Changes take effect the NEXT calendar day — existing confirmed appointments not affected
- Intra-day slot structure frozen at day-start (no mid-day regeneration)
- Lunch breaks and custom blocked periods per doctor per day
- Each doctor can have an independent schedule

**FR-36 (Step 2 + 3 of wizard):**
- Step 2: Add at least one Doctor
- Step 3: Configure working hours and slot duration

**MON-2:** Doctor count enforced per plan:
- Starter: 1 Doctor
- Growth: 3 Doctors
- Pro: 10 Doctors

**Slot generation:** Slots are NOT stored as individual rows at configuration time. They are computed dynamically from working_hours config when a patient requests available slots. Only booked slots (appointments) and blocked slots exist as explicit records.

## Acceptance Criteria

**Given** I am on `/onboarding/step-2` (Add Doctor),
**When** the form renders,
**Then** I can enter for each Doctor:
- **Full Name** (required, text input)
- **Phone Number** (required, 10-digit Indian mobile — this becomes their login credential)
- **Medical Speciality** (optional, Select dropdown: same options as Clinic speciality)
- **Default Consultation Fee in ₹** (optional, numeric — auto-populates billing in Epic 9)
**And** on first load, one Doctor form row is shown.
**And** an "+ Add Another Doctor" button allows adding more rows (up to the plan's Doctor limit).

**Given** I try to add a Doctor beyond my plan's limit (e.g. 2nd Doctor on Starter plan),
**When** I click "+ Add Another Doctor",
**Then** an upgrade prompt appears inline: "Starter plan supports 1 Doctor. Upgrade to Growth to add up to 3 Doctors."
**And** no new form row is added.
**And** an "Upgrade Plan" link is shown (navigates to billing — placeholder for Epic 11).

**Given** I fill in at least one Doctor's details and click "Save & Continue",
**When** the form submits,
**Then** Doctor records are created in the `clinic_{clinicId}.doctors` table.
**And** a StaffInvite record is created per Doctor with status `pending` (Doctor will receive setup link).
**And** I am redirected to `/onboarding/step-3`.

**Given** I am on `/onboarding/step-3` (Working Hours),
**When** only one Doctor was added,
**Then** the working hours form shows configuration for that Doctor directly (no tab navigation).

**Given** I am on `/onboarding/step-3`,
**When** multiple Doctors were added,
**Then** a tab row shows one tab per Doctor (by name); clicking a tab shows that Doctor's working hours form.

**Given** I am configuring working hours for a Doctor,
**When** the form renders,
**Then** I can set:
- **Working days** (7 checkboxes: Mon, Tue, Wed, Thu, Fri, Sat, Sun — default: Mon–Sat checked)
- **Start time** (time picker, 15-min increments, default: 10:00 AM)
- **End time** (time picker, 15-min increments, default: 7:00 PM)
- **Slot duration** (dropdown: 15 min / 20 min / 30 min / 60 min — default: 20 min)
- **Lunch break** (optional toggle; when enabled: lunch start + end time pickers appear)
**And** I can see a preview: "This generates approximately {N} appointment slots per day" (computed from start–end time ÷ slot duration − lunch break slots).

**Given** I set end time earlier than start time,
**When** the form validates,
**Then** an error shows: "End time must be after start time."
**And** the form cannot submit.

**Given** I complete working hours for all Doctors and click "Save & Continue",
**When** the form submits,
**Then** `working_hours` records are created: one row per Doctor per working day (day_of_week, start_time, end_time, slot_duration, lunch_start, lunch_end, is_active = true).
**And** a `notification_settings` record is created for the Clinic with: `reminder_24h_enabled = true`, `reminder_2h_enabled = true` (FR-25 defaults).
**And** I am redirected to `/onboarding/step-4`.

**Given** working hours are saved and the next calendar day begins (midnight IST),
**When** a patient requests available slots via WhatsApp or Web Booking Link,
**Then** slots are computed dynamically from the `working_hours` config for that Doctor — not pre-generated.
**And** existing confirmed appointments are not affected by working hours changes.

**Given** I navigate to Settings → Working Hours after the wizard,
**When** the settings page renders,
**Then** I see the same per-Doctor tab view with all working hours fields editable.
**And** when I save changes, a toast shows: "Working hours updated. Changes take effect from tomorrow."

**Given** I navigate to Settings → Doctors after the wizard,
**When** the page renders,
**Then** I see a list of all Doctors with: name, speciality, default fee (if set), schedule summary (e.g. "Mon–Sat, 10:00 AM – 7:00 PM, 20 min slots").
**And** I can edit any Doctor's profile (name, speciality, default fee) inline or via an edit modal.
**And** I can add new Doctors ("+Add Doctor" button, plan limit enforced).
**And** each Doctor shows their invitation status (Pending / Active).

## UX Design Reference

**EXPERIENCE.md — Onboarding Step 2 (Doctor Setup):**
- Clean form card, same layout as Step 1
- Doctor form row: name + phone side-by-side (desktop), stacked (mobile)
- "+ Add Another Doctor" button: ghost/outline style, full width, with + icon
- Plan limit exceeded: inline amber info banner, not blocking modal

**EXPERIENCE.md — Onboarding Step 3 (Working Hours):**
- Doctor tabs: horizontal tabs at top of the form card (if multiple doctors)
- Working days: 7 pill toggles (Mon/Tue/Wed/Thu/Fri/Sat/Sun) — selected = brand-primary filled
- Time pickers: native `<input type="time">` or custom time select component
- Slot duration: visual card options (not dropdown) — 4 cards: "15 min", "20 min", "30 min", "60 min" with patient count estimate below each (e.g. "~27 patients/day")
- Lunch break toggle: when on, reveals time range row; background colour shifts to amber-tint to visually indicate blocked time

**DESIGN.md — Settings → Doctors page:**
- Doctor list: DataTable rows with avatar (initials), name, speciality badge, default fee, schedule summary, edit icon, status badge
- Edit modal: same fields as wizard step 2 + link to Working Hours settings
- "+ Add Doctor" button: top-right of the page, brand-primary fill

**DESIGN.md — Slot duration card:**
```
┌─────────────┐
│   20 min    │
│ ~27 patients│
│  /day       │
└─────────────┘
```
Selected card: brand-primary border (2px), light primary-tint background

## File Locations

```
apps/web/
  src/
    app/
      (dashboard)/
        onboarding/
          step-2/
            page.tsx                  ← Add Doctor step
          step-3/
            page.tsx                  ← Working hours step
        settings/
          doctors/
            page.tsx                  ← Settings → Doctors list + edit
          working-hours/
            page.tsx                  ← Settings → Working Hours per-doctor
    components/
      onboarding/
        DoctorForm.tsx                ← Reusable Doctor form row (wizard + settings)
        WorkingHoursForm.tsx          ← Reusable working hours form (wizard + settings)
        SlotDurationPicker.tsx        ← Visual card selector for slot duration
    api/
      v1/
        doctors/
          route.ts                    ← POST (add doctor) + GET (list) + PUT (update)
        working-hours/
          route.ts                    ← POST (save) + GET (by doctor) + PUT (update)
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | Slot count preview calculation (start/end time, lunch break, slot duration) | 100% |
| Unit | Plan limit enforcement (Starter: 1 Doctor, Growth: 3, Pro: 10) | 100% |
| Integration | Doctor creation + working_hours records in DB | Core paths |
| Integration | notification_settings defaults created on Step 3 completion | 100% |
| Integration | Working hours change → takes effect next day (not same day) | 100% |
| Playwright (E2E) | Step 2 + Step 3 wizard flow: add doctor → set hours → advance to Step 4 | Full UJ |
| Playwright | Multi-doctor: tab switching; per-doctor independent schedule | Core paths |

## Notes

- **Slot computation (dynamic):** Slots are NOT pre-generated as DB rows. Available slots are computed at query time: `for each working_hour record for doctor+day: generate slot windows from start_time to end_time in slot_duration increments, excluding lunch_start–lunch_end, then subtract booked appointments`. This keeps the schema lean and avoids stale slot tables.
- **Lunch break storage:** Store as `lunch_start_time` and `lunch_end_time` nullable columns on `working_hours` table.
- **Default fee:** Stored on the `doctors` record; used as the default fee in billing records (Epic 9) when a Receptionist records payment for an appointment with this Doctor.
- **Doctor phone as login credential:** The phone number entered for a Doctor in Step 2 is the same number they'll use for OTP login. No password is set — they log in via the setup link/OTP flow from Epic 1.
