---
story: 3.4
epic: 3
title: Booking Confirmation Message & SMS Fallback
status: review
created: 2026-06-07
baseline_commit: 4726811ba8737c9ef0947d6d2fd43d7eda09bca7
requirements:
  functional: [FR-5, FR-21]
  nfr: [NFR-1, NFR-13]
  compliance: [CR-9, CR-10]
---

# Story 3.4: Booking Confirmation Message & SMS Fallback

## User Story

As a patient who just booked an appointment,
I want to receive a WhatsApp confirmation message immediately after booking from any channel,
So that I have my appointment details (time, doctor, token) saved in my chat and know my booking is confirmed.

## Context

**FR-21:** On Appointment creation from ANY source (WhatsApp flow, Web Booking Link, manual entry), a WhatsApp confirmation is sent to the patient within 30 seconds.
**FR-24:** If WhatsApp delivery fails → SMS via MSG91 within 5 minutes (also covers FR-22/FR-23/FR-6 — but those are Epic 7; this story covers FR-21).

**Confirmation is triggered by:** Appointment creation event (regardless of source).
**Cross-epic:** This story's `sendConfirmation()` function is reused by Epic 4 (Web Booking Link) and Epic 5 (Manual Appointment Entry) — build it as a shared service.

**Idempotency:** Inngest job key = `${appointmentId}:confirmation` — prevents duplicate confirmations on Inngest retries.

**WhatsApp template:** `apt_confirmation` (pre-approved via Meta)
- English template: "Appointment confirmed! Token #{token}, Dr. {doctorName}, {date} {time}, {clinicName}, {address}."
- Hindi template: "Appointment confirm ho gayi! Token #{token}, Dr. {doctorName}, {date} {time}, {clinicName}, {address}."

## Acceptance Criteria

**Given** an Appointment is created with status `confirmed` from any source (WhatsApp, Web, Manual, Walk-in),
**When** the appointment creation event fires,
**Then** an Inngest job `appointment/confirmation.send` is enqueued with `id: ${appointmentId}:confirmation` (idempotency key).
**And** the Inngest job sends a WhatsApp message to the patient's phone number within 30 seconds of appointment creation.
**And** the WhatsApp message uses the pre-approved `apt_confirmation` template in the Clinic's configured language (English or Hindi).
**And** the message body contains: Patient first name, Doctor full name, date (e.g. "Today" / "Tomorrow" / "Mon, 9 Jun"), time (e.g. "3:30 PM"), Token number (e.g. "Token #7"), Clinic name, Clinic address.

**Given** the `appointment/confirmation.send` Inngest job runs more than once for the same `appointmentId` (retry scenario),
**When** the second run executes,
**Then** only one WhatsApp message is sent to the patient — Inngest's idempotency key prevents duplicate delivery.

**Given** the WhatsApp message delivery fails (patient number not registered on WhatsApp, Meta API error, rate limit),
**When** the delivery failure status is received via the delivery status webhook (`failed` status),
**Then** an Inngest job `appointment/sms-fallback.send` is enqueued automatically.
**And** the SMS fallback executes within 5 minutes of the WhatsApp failure detection.
**And** MSG91 sends an SMS to the patient's phone number with plain-text content: "Appointment confirmed. Token #{token}. Dr. {doctorName}. {date} {time}. {clinicName}. {address}."

**Given** both WhatsApp delivery and SMS fallback fail,
**When** both failures are logged,
**Then** the Appointment record remains `confirmed` — the booking is not rolled back.
**And** a `delivery_failures` JSONB field on the Appointment record logs: `[{ channel: 'whatsapp', failedAt, reason }, { channel: 'sms', failedAt, reason }]`.
**And** the failed delivery status is visible to the Receptionist on the Appointment detail panel (a small amber indicator: "Confirmation not delivered").

**Given** the confirmation message is sent in Hindi,
**When** the Clinic's language setting is `hi`,
**Then** the `apt_confirmation_hi` Hindi template is used (separate Meta-approved template for Hindi).
**And** date/time in the message uses IST and is formatted for Hindi: "Aaj 3:30 baje" / "Kal" etc.

**Given** a sample appointment is created (FR-37, `is_sample = true`),
**When** the appointment creation event fires,
**Then** NO confirmation message is sent — sample appointments are excluded from all notification logic.

**Given** a patient has opted out of WhatsApp (`whatsapp_opt_out_at IS NOT NULL`),
**When** the confirmation send job runs,
**Then** the WhatsApp message is NOT sent.
**And** SMS fallback is attempted directly (opt-out is WhatsApp-only; SMS is a separate channel).
**And** if the patient has also opted out of SMS (Phase 1 feature — not in MVP), the notification is skipped entirely.

**Given** the `sendConfirmation(appointmentId)` service function is called,
**When** invoked from any appointment creation path (WhatsApp flow, Web Booking, Manual entry),
**Then** it always triggers the same `appointment/confirmation.send` Inngest job — no duplicate logic in each creation path.

## Technical Notes

**Shared service pattern:**
```typescript
// apps/web/src/lib/notifications/send-confirmation.ts
export async function scheduleConfirmation(appointmentId: string) {
  await inngest.send({
    name: 'appointment/confirmation.send',
    data: { appointmentId },
    id: `${appointmentId}:confirmation`,   // idempotency key
  });
}
```

Called from:
- Story 3.2 (WhatsApp flow appointment creation)
- Story 4.x (Web Booking Link appointment creation)
- Story 5.x (Manual appointment creation)

**WhatsApp message format (Meta template parameters):**
```
Template name: apt_confirmation
Parameters (positional):
  {{1}}: Patient first name
  {{2}}: Token number
  {{3}}: Doctor full name
  {{4}}: Date string (formatted in clinic language)
  {{5}}: Time string (IST, 12h format)
  {{6}}: Clinic name
  {{7}}: Clinic address
```

**SMS fallback (MSG91):**
- API: MSG91 SMS API (`/api/sendotp` or transactional SMS endpoint)
- Content: plain-text, max 160 chars (single SMS)
- Sender ID: clinic-specific or Cliniqly platform sender ID

**Delivery status tracking:**
- Meta webhook `statuses` array triggers `whatsapp/status.update` Inngest job (from Story 3.1)
- Status `failed` → enqueue `appointment/sms-fallback.send`
- Update `appointments.whatsapp_delivery_status = 'failed'` in DB

## File Locations

```
apps/web/
  src/
    lib/
      notifications/
        send-confirmation.ts              ← scheduleConfirmation(appointmentId) — shared
        build-confirmation-message.ts     ← Template parameter builder (bilingual)
      sms/
        msg91.ts                          ← MSG91 SMS API client
    inngest/
      functions/
        appointment-confirmation-send.ts  ← Inngest function: WhatsApp send + failure tracking
        appointment-sms-fallback.ts       ← Inngest function: SMS fallback on WA failure
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | Template parameter builder: correct values for all 7 params (en + hi) | 100% |
| Unit | Date formatting: "Today" / "Tomorrow" / "Mon, 9 Jun" in en and hi | 100% |
| Unit | Sample appointment excluded from notification | 100% |
| Unit | Opted-out patient: WhatsApp skipped; SMS attempted | 100% |
| Integration | Confirmation Inngest job: runs once per appointmentId (idempotency) | 100% |
| Integration | WhatsApp failure → SMS fallback enqueued within 5 minutes | 100% |
| Integration | Delivery failure logging on appointment record | 100% |
| Playwright (E2E) | Appointment created → confirmation delivery status indicator visible in portal | Core path |
