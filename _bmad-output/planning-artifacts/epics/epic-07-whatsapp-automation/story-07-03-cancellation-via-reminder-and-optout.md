---
story: 7.3
epic: 7
title: Cancellation via Reminder & Opt-Out Management
status: review
created: 2026-06-07
baseline_commit: cb126142ac853ade1aef263e88dee838d6bb6d2a
requirements:
  functional: [FR-6, FR-24]
  nfr: [NFR-1]
  compliance: [CR-11]
---

# Story 7.3: Cancellation via Reminder & Opt-Out Management

## User Story

As a patient,
I want to cancel my appointment directly from the reminder message with a single tap,
And if I want to stop all automated messages, I want my STOP request honoured immediately and permanently.

## Context

**FR-6:** Patient-initiated cancellation via "CANCEL" keyword (or Quick Reply button). Acknowledgment within 3 seconds. Appointment → `cancelled`. Slot → available. Calendar updates in real time.

**CR-11:** Patient opt-out (STOP keyword) — no further automated messages sent after opt-out. Opt-out is WhatsApp-specific; SMS is a separate channel.

**Reminder-initiated cancellation:** When a patient taps the "Cancel Appointment" Quick Reply in the 24h reminder, the webhook payload contains `interactive.button_reply.id = 'CANCEL_APPOINTMENT:{appointmentId}'`. This is a specific cancellation path (appointmentId-scoped) vs. the generic "CANCEL" text (which resolves the appointment from conversation state).

**Story 3.3 reuse:** The core cancellation logic (`cancelAppointment(appointmentId, source)`) and opt-out logic are already built in Story 3.3. This story wires the reminder-specific cancellation entry point to that shared function and ensures opt-out is correctly respected in all reminder send paths.

## Acceptance Criteria

**Given** a patient receives the 24h reminder WhatsApp message with a "Cancel Appointment" Quick Reply button,
**When** the patient taps the button,
**Then** the webhook receives `interactive.button_reply.id = 'CANCEL_APPOINTMENT:{appointmentId}'`.
**And** the `whatsapp/message.received` Inngest job parses the `CANCEL_APPOINTMENT:` prefix and extracts the `appointmentId`.
**And** `cancelAppointment(appointmentId, { source: 'whatsapp-reminder-reply', patientPhone })` is called.
**And** the appointment status is set to `cancelled`, slot released, Pusher `appointment.cancelled` event published (same as Story 3.3 / Story 5.4 cancellation).
**And** a WhatsApp cancellation acknowledgment is sent to the patient within 3 seconds: "Your appointment with Dr. {Doctor} on {Date} at {Time} has been cancelled. If you'd like to book again, reply 'BOOK' or visit {bookingURL}."
**And** `appointments.cancelled_via = 'whatsapp-reminder'` is recorded for analytics.

**Given** a patient replies "CANCEL" (text, any case) directly to the 2h reminder message (which doesn't have a Quick Reply button),
**When** the webhook receives the text message,
**Then** the conversation state engine (Story 3.1) resolves the most recent `confirmed` appointment for this patient at this clinic.
**And** the same `cancelAppointment()` flow executes.
**And** if no confirmed appointment exists for today/upcoming: "You have no upcoming appointments to cancel. Would you like to book a new appointment?"

**Given** a patient has previously sent "STOP" (opt-out recorded in Story 3.3 — `whatsapp_opt_out_at IS NOT NULL`),
**When** any reminder Inngest job (24h or 2h) runs for this patient,
**Then** the WhatsApp send is skipped entirely.
**And** SMS fallback via MSG91 is attempted directly (opt-out is WhatsApp-only; SMS is a separate channel per CR-11).
**And** the job records: `{ channel: 'whatsapp-skipped-optout', reminderType: '24h'|'2h' }` in `delivery_failures` JSONB for observability.

**Given** a patient sends "STOP" in response to a reminder message,
**When** the webhook processes the message,
**Then** `patient.whatsapp_opt_out_at = NOW()` is set (same handler as Story 3.3).
**And** the reminder cancellation flow does NOT trigger (STOP ≠ CANCEL).
**And** a final opt-out acknowledgment is sent: "You've been unsubscribed from WhatsApp messages from {ClinicName}. You will no longer receive automated messages." (This is the last WhatsApp message sent to this patient from this clinic.)
**And** no further automated WhatsApp messages are sent to this patient from this clinic.

**Given** an opted-out patient books a new appointment (via Web or Walk-in — no WhatsApp interaction needed for booking),
**When** the appointment is confirmed,
**Then** `scheduleConfirmation()` — checks opt-out → skips WhatsApp, sends SMS directly.
**And** `scheduleReminders()` — both reminder jobs check opt-out at execution time → skip WhatsApp, send SMS directly.
**And** opt-out status is NOT automatically cleared by a new booking (re-opt-in requires the patient to explicitly send "START" or "JOIN" — Phase 1 feature; not in MVP).

**Given** the Clinic Owner views Settings → Notifications,
**When** the opt-out metric renders (Story 7.2),
**Then** clicking "View opted-out patients" navigates to Patients directory filtered by `whatsapp_opt_out = true`.
**And** the filtered list shows opted-out patients with the opt-out date.
**And** no re-opt-in action is available from this screen (read-only — patient must initiate re-opt-in themselves).

**Given** the cancellation acknowledgment WhatsApp message fails to deliver (patient not reachable),
**When** the delivery failure webhook arrives,
**Then** SMS cancellation acknowledgment is sent via MSG91: "Appointment cancelled: Dr. {Doctor}, {Date} {Time}. {ClinicName}."
**And** failure logged in `delivery_failures`.

## Technical Notes

**Cancellation Quick Reply payload parsing:**
```typescript
// In whatsapp/message.received Inngest handler
if (message.type === 'interactive' && message.interactive.type === 'button_reply') {
  const buttonId = message.interactive.button_reply.id;
  if (buttonId.startsWith('CANCEL_APPOINTMENT:')) {
    const appointmentId = buttonId.replace('CANCEL_APPOINTMENT:', '');
    await cancelAppointment(appointmentId, {
      source: 'whatsapp-reminder-reply',
      patientPhone: message.from,
    });
    return; // short-circuit — do not process as regular conversation message
  }
}
```

**Opt-out check in reminder jobs (consistent pattern):**
```typescript
// In appointment/reminder-24h.send Inngest function
const patient = await db.patient.findUnique({ where: { id: appointment.patientId } });
if (patient.whatsapp_opt_out_at) {
  // Skip WhatsApp, go directly to SMS
  await inngest.send({ name: 'appointment/sms-fallback.send', data: { appointmentId, channel: 'reminder-24h' } });
  return;
}
```

## File Locations

```
apps/web/
  src/
    lib/
      appointments/
        cancel-appointment.ts             ← cancelAppointment(id, opts) — shared (from Story 3.3)
    inngest/
      functions/
        whatsapp-message-received.ts      ← Extended: parse CANCEL_APPOINTMENT: button reply
        appointment-reminder-24h.ts       ← Extended: opt-out check before WA send
        appointment-reminder-2h.ts        ← Extended: opt-out check before WA send
    app/
      (portal)/
        patients/
          page.tsx                        ← Extended: filter by whatsapp_opt_out query param
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | CANCEL_APPOINTMENT: button reply parsed → cancelAppointment called with correct appointmentId | 100% |
| Unit | Text "CANCEL" to reminder → most recent confirmed appointment resolved + cancelled | 100% |
| Unit | Text "CANCEL" with no upcoming appointment → correct "no appointment" response | 100% |
| Unit | STOP message → opt_out_at set; opt-out acknowledgment sent; no further sends | 100% |
| Unit | Opted-out patient + reminder job → WA skipped, SMS fallback enqueued | 100% |
| Integration | Quick Reply cancel → appointment cancelled + Pusher event + acknowledgment sent | 100% |
| Integration | Opted-out patient booking → confirmation + reminders go to SMS only | 100% |
| Playwright (E2E) | Simulate Quick Reply cancel webhook → appointment status = cancelled in portal calendar | Core path |
| Playwright | Opted-out patients filter in Patient Directory → list shows opt-out dates | Core path |
