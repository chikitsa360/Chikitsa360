---
story: 7.1
epic: 7
title: 24-Hour & 2-Hour Appointment Reminders
status: Not Started
created: 2026-06-07
requirements:
  functional: [FR-22, FR-23, FR-24]
  nfr: [NFR-1, NFR-13]
  ux: [UX-DR24]
  compliance: [CR-9, CR-10, CR-11]
---

# Story 7.1: 24-Hour & 2-Hour Appointment Reminders

## User Story

As a patient with a confirmed appointment,
I want to receive a WhatsApp reminder 24 hours before and 2 hours before my appointment time,
So that I don't forget my appointment and can cancel in advance if my plans change.

## Context

**FR-22:** 24h reminder — sent 24h before appointment time for all `confirmed` appointments. Includes "Cancel appointment" Quick Reply button. Not sent if appointment booked < 24h before scheduled time.

**FR-23:** 2h reminder — sent 2h before appointment time. Includes "Reply CANCEL to cancel" instruction. Not sent if booked < 2h before scheduled time.

**FR-24:** SMS fallback — when WhatsApp delivery fails, MSG91 SMS sent within 5 minutes. Applies to all reminder types.

**Scheduling pattern:** When an appointment is created (any source), `scheduleReminders(appointmentId)` is called alongside `scheduleConfirmation()`. It enqueues two Inngest delayed jobs immediately, with `scheduledAt` computed from the slot datetime.

**WhatsApp templates required (must be Meta-approved before deployment):**
- `apt_reminder_24h` (English + Hindi)
- `apt_reminder_2h` (English + Hindi)

## Acceptance Criteria

**Given** an appointment is created with status `confirmed`,
**When** `scheduleReminders(appointmentId)` is called,
**Then** two Inngest delayed jobs are enqueued:
  - `appointment/reminder-24h.send` with `scheduledAt = slot_datetime - 24 hours`, `id: ${appointmentId}:reminder-24h`
  - `appointment/reminder-2h.send` with `scheduledAt = slot_datetime - 2 hours`, `id: ${appointmentId}:reminder-2h`
**And** if `slot_datetime - 24 hours` is in the past (appointment booked < 24h before slot), the 24h job is NOT enqueued.
**And** if `slot_datetime - 2 hours` is in the past (appointment booked < 2h before slot), the 2h job is NOT enqueued.

**Given** the `appointment/reminder-24h.send` Inngest job executes,
**When** the job runs,
**Then** it first checks: `appointment.status === 'confirmed'` — if not (cancelled, completed, no-show), the job exits without sending.
**And** it checks: `clinic.reminder_24h_enabled === true` (Story 7.2 toggle) — if false, job exits.
**And** it checks: `patient.whatsapp_opt_out_at IS NOT NULL` — if opted out, skip WhatsApp and enqueue SMS directly.
**And** if all checks pass: a WhatsApp message is sent using the `apt_reminder_24h` template in the clinic's configured language (`en` or `hi`).
**And** the message includes a "Cancel Appointment" Quick Reply button (interactive message, button payload: `CANCEL_APPOINTMENT:{appointmentId}`).
**And** `appointments.reminder_24h_sent_at` is set to the current timestamp on successful send.

**Given** the `appointment/reminder-2h.send` Inngest job executes,
**When** the job runs,
**Then** same status + toggle + opt-out checks as the 24h job.
**And** WhatsApp message sent using `apt_reminder_2h` template.
**And** the message body includes: "Reply CANCEL to cancel your appointment." (text instruction, not a Quick Reply button — 2h reminder uses a simpler template to avoid confusion with the 24h interactive one).
**And** `appointments.reminder_2h_sent_at` is set on successful send.

**Given** the same `appointmentId:reminder-24h` Inngest job runs more than once (retry scenario),
**When** the second execution fires,
**Then** the idempotency key `${appointmentId}:reminder-24h` prevents a duplicate WhatsApp send (Inngest deduplicates by job id).

**Given** WhatsApp delivery of the reminder fails (patient not on WhatsApp, Meta API error, rate limit),
**When** the delivery failure status is received via webhook (`statuses[].status === 'failed'`),
**Then** an Inngest job `appointment/sms-fallback.send` is enqueued with `{ appointmentId, channel: 'reminder-24h' | 'reminder-2h' }`.
**And** MSG91 SMS is sent within 5 minutes of failure detection.
**And** SMS content (plain text, ≤ 160 chars):
  - 24h: "Reminder: Your appt with Dr. {Doctor} is tomorrow at {Time}. Token #{Token}. {ClinicName}. Reply CANCEL to cancel."
  - 2h: "Reminder: Your appt with Dr. {Doctor} is in 2 hours at {Time}. Token #{Token}. {ClinicName}."
**And** delivery failure is appended to `appointments.delivery_failures` JSONB: `{ channel: 'whatsapp-reminder-24h', failedAt, reason }`.

**Given** the 24h WhatsApp reminder is delivered successfully,
**When** the patient taps the "Cancel Appointment" Quick Reply button,
**Then** the webhook receives `interactive.button_reply.id = 'CANCEL_APPOINTMENT:{appointmentId}'`.
**And** the cancellation flow from Story 3.3 / Story 5.4 executes: appointment `cancelled`, slot released, Pusher event, cancellation acknowledgment sent (Story 7.3).

**Given** the reminder jobs run for a clinic with language set to Hindi (`hi`),
**When** the templates are rendered,
**Then** `apt_reminder_24h_hi` and `apt_reminder_2h_hi` templates are used.
**And** date/time formatting uses IST and Hindi conventions: "Kal 3:30 baje" / "Aaj 3:30 baje".

**Given** a sample appointment (`is_sample = true`) is created during onboarding (Story 2.4),
**When** `scheduleReminders()` is called,
**Then** NO reminder jobs are enqueued for sample appointments.

## UX Design Reference

**EXPERIENCE.md — Reminder message format (UX-DR24):**

24h reminder WhatsApp template parameters:
```
Template: apt_reminder_24h
{{1}}: Patient first name
{{2}}: Doctor full name
{{3}}: Date string (e.g. "tomorrow" / "Mon, 9 Jun")
{{4}}: Time (IST, 12h format, e.g. "3:30 PM")
{{5}}: Token number
{{6}}: Clinic name
{{7}}: Clinic address
Interactive: Quick Reply button — "Cancel Appointment"
```

2h reminder WhatsApp template parameters:
```
Template: apt_reminder_2h
{{1}}: Patient first name
{{2}}: Doctor full name
{{3}}: Time (IST, 12h format)
{{4}}: Token number
{{5}}: Clinic name
Footer: "Reply CANCEL to cancel"
```

## Technical Notes

```typescript
// apps/web/src/lib/notifications/schedule-reminders.ts
export async function scheduleReminders(appointmentId: string, slotDatetime: Date) {
  const now = new Date();
  const remind24h = new Date(slotDatetime.getTime() - 24 * 60 * 60 * 1000);
  const remind2h  = new Date(slotDatetime.getTime() -  2 * 60 * 60 * 1000);

  if (remind24h > now) {
    await inngest.send({
      name: 'appointment/reminder-24h.send',
      data: { appointmentId },
      id: `${appointmentId}:reminder-24h`,
      ts: remind24h,
    });
  }

  if (remind2h > now) {
    await inngest.send({
      name: 'appointment/reminder-2h.send',
      data: { appointmentId },
      id: `${appointmentId}:reminder-2h`,
      ts: remind2h,
    });
  }
}
```

Called from: all appointment creation paths (WhatsApp Story 3.2, Web Story 4.1, Manual Story 5.2, Walk-in Story 5.3) alongside `scheduleConfirmation()`.

## File Locations

```
apps/web/
  src/
    lib/
      notifications/
        schedule-reminders.ts             ← scheduleReminders(appointmentId, slotDatetime)
        build-reminder-message.ts         ← Template parameter builder (24h + 2h, en + hi)
    inngest/
      functions/
        appointment-reminder-24h.ts       ← Inngest: status check + WA send + SMS fallback enqueue
        appointment-reminder-2h.ts        ← Inngest: status check + WA send + SMS fallback enqueue
        appointment-sms-fallback.ts       ← Extended: handles reminder channels (from Story 3.4)
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | scheduleReminders: 24h job NOT enqueued if slot < 24h away | 100% |
| Unit | scheduleReminders: 2h job NOT enqueued if slot < 2h away | 100% |
| Unit | scheduleReminders: sample appointment → no jobs enqueued | 100% |
| Unit | Reminder job: exits if appointment status != 'confirmed' | 100% |
| Unit | Reminder job: exits if clinic toggle disabled (Story 7.2) | 100% |
| Unit | Reminder job: opted-out patient → skip WA, enqueue SMS directly | 100% |
| Unit | Template builder: correct params for 24h + 2h (en + hi) | 100% |
| Unit | Date formatting: "tomorrow" / "Kal" / "Mon, 9 Jun" | 100% |
| Integration | WA failure → SMS fallback enqueued within 5 min | 100% |
| Integration | Idempotency: duplicate job run → only one WA message sent | 100% |
| Integration | delivery_failures JSONB updated on WA failure | 100% |
