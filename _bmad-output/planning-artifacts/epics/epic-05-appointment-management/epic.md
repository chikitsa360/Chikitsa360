---
epic: 5
title: Appointment Management & Calendar
status: Not Started
created: 2026-06-07
stories: 4
depends_on: [Epic 1, Epic 2, Epic 3, Epic 4]
---

# Epic 5: Appointment Management & Calendar

## Goal

Receptionists and Clinic Owners can manage every appointment from within the portal — create manual bookings, register walk-ins in under 60 seconds, reschedule or cancel appointments, block slots — using a real-time calendar with day and week views and drag-to-reschedule on desktop.

## User Outcome

After this epic is complete:
- Receptionists can create manual appointments with patient lookup by phone (existing patient auto-filled, new patient created inline)
- Walk-in registration takes under 60 seconds including token assignment
- Day view shows all appointments chronologically; week view shows density per doctor per day
- Appointment detail panel opens inline on tap/click — no page navigation
- Calendar updates in real time (< 5 seconds) when any appointment is created, modified, or cancelled
- Double-booking is prevented with `SELECT FOR UPDATE SKIP LOCKED`; overflow walk-ins require explicit confirmation
- Receptionists can reschedule (WhatsApp resent) or cancel (WhatsApp cancellation sent) any appointment
- Slot blocking (lunch, emergency, CME) hides slots from WhatsApp and Web booking instantly
- All modifications are logged in the Activity Log with timestamp + actor role

## Requirements Covered

| Category | Items |
|---|---|
| Functional | FR-10 (manual appointment), FR-11 (walk-in), FR-12 (modification/cancellation), FR-14 (calendar views), FR-15 (no double-booking), FR-16 (slot blocking) |
| UX Design | UX-DR7 (calendar), UX-DR13 (appointment detail panel), UX-DR14 (manual create), UX-DR15 (walk-in flow), UX-DR18 (slot blocking), UX-DR20 (drag-to-reschedule), UX-DR22 (reschedule/cancel dialogs), UX-DR35 (token display), UX-DR41 (real-time animation), UX-DR44 (overflow warning) |

## Stories

| # | Title | Status |
|---|---|---|
| [5.1](story-05-01-calendar-view-and-realtime.md) | Calendar View & Real-Time Updates | Not Started |
| [5.2](story-05-02-manual-appointment-creation.md) | Manual Appointment Creation | Not Started |
| [5.3](story-05-03-walk-in-registration.md) | Walk-In Registration | Not Started |
| [5.4](story-05-04-modification-cancellation-slot-blocking.md) | Appointment Modification, Cancellation & Slot Blocking | Not Started |

## Dependencies

- **Epic 1:** Pusher setup, DB schema (appointments, slot_blocks, audit_logs), Inngest
- **Epic 2:** Working hours / slot computation (`computeAvailableSlots()`), doctor config, default_fee per doctor
- **Epic 3:** `scheduleConfirmation(appointmentId)` shared service, `SELECT FOR UPDATE SKIP LOCKED` slot locking, Pusher `appointment.created` event pattern
- **Epic 4:** Public slot availability API (reused for staff-side slot browser)

## Key Technical Notes

- Calendar is a Client Component using React Query for state; Pusher events trigger `queryClient.invalidateQueries(['appointments', clinicId, date])`
- Day view rendered with a time-column grid (CSS Grid); week view uses a compact density card per day-doctor cell
- Drag-to-reschedule on desktop: `@dnd-kit/core` — pointer sensor only; touch drag disabled (mobile uses tap-to-reschedule modal instead)
- Slot blocking stored in `slot_blocks` table (`clinic_id`, `doctor_id`, `date`, `start_time`, `end_time`, `recurrence`, `reason`); `computeAvailableSlots()` already excludes blocked ranges
- Walk-in overflow (overriding a fully-booked day) records `booking_source = 'walk-in-overflow'` for analytics distinction
- Activity Log: audit entries written synchronously in the same DB transaction as the modification (same pattern as Story 1.5)
- Token assignment: `MAX(token_number) + 1` for clinic + date, computed inside the appointment-creation transaction to prevent gaps/duplicates
