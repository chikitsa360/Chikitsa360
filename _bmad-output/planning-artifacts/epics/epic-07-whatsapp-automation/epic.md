---
epic: 7
title: WhatsApp Automation & Reminders
status: Not Started
created: 2026-06-07
stories: 3
depends_on: [Epic 1, Epic 2, Epic 3, Epic 5]
---

# Epic 7: WhatsApp Automation & Reminders

## Goal

The clinic's WhatsApp channel automatically sends 24-hour and 2-hour appointment reminders to patients, handles cancellations triggered from within reminder messages, and gives Clinic Owners a simple toggle to enable or disable each reminder type.

## User Outcome

After this epic is complete:
- All confirmed appointments automatically receive a 24h reminder and a 2h reminder via WhatsApp
- 24h reminder includes a "Cancel appointment" Quick Reply button — patient can cancel without messaging manually
- Reminders are not sent if the appointment was booked less than 24h/2h before the slot time
- SMS fallback via MSG91 fires within 5 minutes if WhatsApp delivery fails
- Clinic Owner can enable/disable each reminder type independently in Settings → Notifications
- Opted-out patients (STOP keyword) skip WhatsApp; SMS fallback is attempted directly
- All reminder sends and failures are logged against the appointment record

## Requirements Covered

| Category | Items |
|---|---|
| Functional | FR-22 (24h reminder), FR-23 (2h reminder), FR-24 (SMS fallback), FR-25 (reminder toggle), FR-6 (CANCEL via reminder) |
| UX Design | UX-DR24 (reminder message format), UX-DR27 (Notifications settings page) |
| Compliance | CR-11 (patient opt-out respected in all automated sends) |

## Stories

| # | Title | Status |
|---|---|---|
| [7.1](story-07-01-appointment-reminders.md) | 24-Hour & 2-Hour Appointment Reminders | Not Started |
| [7.2](story-07-02-reminder-settings-and-toggle.md) | Reminder Settings & Clinic Toggle | Not Started |
| [7.3](story-07-03-cancellation-via-reminder-and-optout.md) | Cancellation via Reminder & Opt-Out Management | Not Started |

## Dependencies

- **Epic 1:** Inngest (delayed job scheduling), Pusher (appointment.cancelled event), audit_logs
- **Epic 2:** Clinic language setting (`en`/`hi`), WhatsApp WABA connection + template approval status
- **Epic 3:** `scheduleConfirmation()` pattern (reminder jobs follow same pattern), CANCEL keyword handler (Story 3.3 — reused), opt-out (`whatsapp_opt_out_at`) field on Patient
- **Epic 5:** Appointment status checks (must be `confirmed` at job execution time)

## Key Technical Notes

- Reminder scheduling: when an appointment is confirmed (any source), two Inngest delayed jobs are enqueued immediately with `scheduledAt` = slot_time - 24h and slot_time - 2h
- Idempotency keys: `${appointmentId}:reminder-24h` and `${appointmentId}:reminder-2h` — prevents duplicates on Inngest retries
- Clinic toggle check: performed at job execution time (not at scheduling time) — a toggle change takes effect for all future reminder sends, including already-scheduled jobs for existing appointments
- WhatsApp templates required: `apt_reminder_24h` (en + hi) and `apt_reminder_2h` (en + hi) — must be pre-approved by Meta before Epic 7 goes live
- SMS fallback pattern: identical to Story 3.4 — `appointment/sms-fallback.send` Inngest job enqueued on WhatsApp delivery failure webhook
- Opt-out check: `patient.whatsapp_opt_out_at IS NOT NULL` → skip WhatsApp, enqueue SMS directly
