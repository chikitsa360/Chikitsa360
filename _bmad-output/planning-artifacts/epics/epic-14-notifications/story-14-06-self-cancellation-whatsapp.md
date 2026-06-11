---
story: 14.6
epic: 14
title: Patient Self-Cancellation via WhatsApp Keyword + Auto-Promotion
status: review
created: 2026-06-10
requirements:
  fr: [FR-17, FR-18, FR-12]
  nfr: [NFR-4]
  tech: [TECH-7]
---

# Story 14.6: Patient Self-Cancellation via WhatsApp Keyword + Auto-Promotion

## User Story

As a registered patient,
I want to cancel my registration by replying CANCEL_EVENT_REG:{registrationId} on WhatsApp,
So that I can cancel directly from my phone without opening a link; and as the first person on the waiting list, I want to be automatically promoted and notified when a seat opens.

## Context

This is the WhatsApp keyword handler + auto-promotion Inngest function. The keyword parsing is added to `whatsapp-message-received.ts` BEFORE the existing keyword detection — exactly the same pattern used for `CANCEL_APPOINTMENT:{aptId}` in Epic 07 (`handleReminderCancellation()`). The `event/registration.cancelled` Inngest event was introduced in Story 14.5 — this story also implements the Inngest consumer function.

## Acceptance Criteria

**Given** the WhatsApp webhook receives a message body matching `/^CANCEL_EVENT_REG:([a-f0-9-]{36})$/i` from a patient's phone
**When** `whatsapp-message-received.ts` processes it
**Then** this pattern is parsed BEFORE `isKeyword()` and the general flow handler
**And** the handler looks up the registration by id
**And** verifies that `patients.phone` (for the registration's patient_id) matches the sender's WA phone (security: prevent cancelling others' registrations)
**And** if valid and status='registered': calls the same cancellation logic as Story 14.5 (set status=cancelled, decrement seats, fire `event/registration.cancelled` Inngest event)
**And** if not found or phone mismatch: sends WA reply "We couldn't find your registration. Please check the reference number or contact the clinic."

**Given** the `event/registration.cancelled` Inngest event fires (from either Story 14.5 or this story)
**When** `event-registration-cancelled` function runs
**Then** it sends a WA confirmation to the patient: "Your registration for [event_name] has been cancelled. Reference: EVT-XXXX-XXX."
**And** on WA failure: SMS fallback
**And** it checks `event_waiting_list` for the first entry with `status='waiting'` for this event, ordered by `position ASC`
**And** if found:
  - Creates a new `event_registrations` row for the waitlisted patient (status='registered', new reference_number, new cancellation_token)
  - Updates `events.seats_registered += 1`
  - Updates `event_waiting_list` entry: `status='promoted'`
  - Fires `event/registration.confirm` Inngest event for the promoted patient (triggering Story 14.1)
**And** if no waitlist entry found: no further action

## Technical Notes

### WhatsApp webhook modification
File: `apps/web/src/lib/whatsapp/` — find the main webhook handler (likely `whatsapp-message-received.ts` or similar from Epic 07).

Add before `isKeyword()` check:
```ts
const eventCancelMatch = body.match(/^CANCEL_EVENT_REG:([a-f0-9-]{36})$/i)
if (eventCancelMatch) {
  await handleEventRegistrationCancellation(clinicId, senderPhone, eventCancelMatch[1])
  return // stop processing
}
```

### Phone match security check
```ts
const [reg] = await db.$queryRawUnsafe(
  `SELECT er.*, p.phone AS patient_phone
   FROM "clinic_${clinicId}".event_registrations er
   JOIN "clinic_${clinicId}".patients p ON p.id = er.patient_id
   WHERE er.id = $1`, registrationId
)
if (!reg || reg.patient_phone !== senderPhone) {
  await sendWhatsAppReply(senderPhone, "We couldn't find your registration...")
  return
}
```

### Inngest function: event-registration-cancelled
`apps/web/src/inngest/functions/event-registration-cancelled.ts`

```ts
export const eventRegistrationCancelled = inngest.createFunction(
  { id: 'event-registration-cancelled', retries: 3 },
  { event: 'event/registration.cancelled' },
  async ({ event, step }) => {
    // 1. Send cancellation confirmation WA to patient
    // 2. Find first waiting list entry (status=waiting, ORDER BY position ASC)
    // 3. If found: promote → create registration, fire event/registration.confirm
  }
)
```

### Promotion registration reference number
Follow same pattern as Story 13.5 for generating the reference_number (EVT-XXXX-XXX).

### Race safety for promotion
Wrap promotion in a transaction with SELECT FOR UPDATE on the event row (same pattern as Story 13.5) to prevent two concurrent cancellations from promoting the same waitlist entry.

## File Locations

```
apps/web/src/inngest/functions/event-registration-cancelled.ts   ← CREATE
apps/web/src/lib/whatsapp/whatsapp-message-received.ts           ← MODIFY: add CANCEL_EVENT_REG parser
apps/web/src/inngest/functions/index.ts                          ← MODIFY: export
```

## Test Coverage Requirements

| Test type | What to cover |
|---|---|
| Unit | CANCEL_EVENT_REG:{id} parsed before keyword detection; phone mismatch rejected |
| Integration | Cancellation sets status=cancelled; seats_registered decremented; Inngest event fired |
| Integration | Auto-promotion: first waitlist entry promoted; event/registration.confirm fired for promoted patient |
| Integration | No waitlist: function completes without promoting |
| Unit | Race: two concurrent cancellations both trigger promotion → only one waitlist entry promoted |
