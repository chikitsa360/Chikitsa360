---
epic: 3
title: WhatsApp Appointment Booking
status: Not Started
created: 2026-06-07
stories: 4
depends_on: [Epic 1, Epic 2]
---

# Epic 3: WhatsApp Appointment Booking

## Goal

Patients send "Hi" to the clinic's WhatsApp number and receive a confirmed appointment with a token number in under 60 seconds — no app, no account, no staff action required. The clinic calendar updates in real time.

## User Outcome

After this epic is complete:
- Any patient message to the clinic's WhatsApp triggers an automated booking flow within 3 seconds
- New patients are registered (name/age/gender) via guided Quick Reply interactions
- Returning patients are recognised and skip re-registration
- Patients select a slot from a WhatsApp List Message and receive an instant confirmation with Token number
- The clinic portal calendar reflects new bookings in real time (< 5 seconds) via Pusher
- Patients can cancel by replying "CANCEL" — slot is released, clinic calendar updates
- Conversation state survives backend restarts (Redis AOF)
- Slot race conditions are prevented (`SELECT ... FOR UPDATE SKIP LOCKED`)
- Booking confirmation WhatsApp messages are sent with SMS fallback on delivery failure
- Opted-out patients ("STOP") receive no automated messages

## Requirements Covered

| Category | Items |
|---|---|
| Functional | FR-1 (inbound triggers flow), FR-2 (patient identity resolution), FR-3 (new patient registration), FR-4 (slot selection via List Message), FR-5 (appointment confirm + token assignment), FR-6 (patient cancellation via WhatsApp), FR-6b (conversation state durability), FR-21 (booking confirmation message) |
| Architecture | ARCH-9 (slot race condition: SELECT FOR UPDATE SKIP LOCKED), ARCH-13 (Meta webhook handler: 200 ACK + Inngest async) |
| Compliance | CR-1 (consent Quick Reply first step for new patients), CR-2 (data minimisation — only name/age/gender collected), CR-9 (pre-approved WhatsApp templates), CR-10 (no unsolicited messages), CR-11 (opt-out honoured — partial, full enforcement in Epic 7) |
| NFRs | NFR-1 (p95 < 3s webhook response), NFR-11 (HMAC-SHA256 webhook validation), NFR-13 (bilingual messages), NFR-23 (flow completable without instruction) |
| Monetisation | MON-1 (90% plan limit alert), MON-3 (soft paywall: no new bookings when trial expired) |

## Stories

| # | Title | Status |
|---|---|---|
| [3.1](story-03-01-webhook-and-conversation-state.md) | WhatsApp Webhook Handler & Conversation State Engine | Not Started |
| [3.2](story-03-02-new-patient-booking-flow.md) | New Patient WhatsApp Booking Flow | Not Started |
| [3.3](story-03-03-returning-patient-and-cancellation.md) | Returning Patient Fast-Track & Patient Cancellation | Not Started |
| [3.4](story-03-04-confirmation-and-sms-fallback.md) | Booking Confirmation Message & SMS Fallback | Not Started |

## Dependencies

- **Epic 1:** Redis, Inngest, Pusher, Prisma schema, HMAC webhook infrastructure from Story 1.1; audit logging from Story 1.5
- **Epic 2:** WhatsApp Business credentials + webhook registration (Story 2.3); working hours config (Story 2.2) for slot computation; clinic plan info for limit enforcement

## Key Technical Notes

- **Webhook ACK pattern:** `POST /api/webhooks/whatsapp` → immediate HTTP 200 (< 200ms) → Inngest job enqueued → async processing. Never process synchronously in the webhook handler.
- **Idempotency:** Inngest job key = `messageId` from Meta payload. Meta retries same messageId on timeout — Inngest deduplicates.
- **Conversation state schema (Redis JSON):**
  ```json
  {
    "step": "AWAITING_NAME | AWAITING_AGE | AWAITING_GENDER | AWAITING_SLOT | COMPLETED",
    "clinicId": "...",
    "patientPhone": "+91...",
    "collectedFields": { "name": "Rahul", "ageRange": "18-35", "gender": "Male" },
    "reservedSlotId": "slot_xyz",
    "reservationJobId": "inngest_job_abc",
    "language": "en | hi",
    "consentGiven": true,
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
  ```
- **Slot race condition:** `SELECT ... FOR UPDATE SKIP LOCKED` on the `slots` table row at reservation time. If already locked, it means another concurrent booking is in progress — the flow receives "Slot just taken" message.
- **Token assignment:** `MAX(token_number) + 1` per clinic per day, wrapped in the same DB transaction as Appointment creation (atomic). Tokens reset at midnight IST.
- **Real-time update:** On appointment creation/cancellation, publish Pusher event to `private-clinic-{clinicId}` channel. Portal subscribes and calls `queryClient.invalidateQueries(['appointments', clinicId])`.
- **Soft paywall (MON-3):** Check `clinic.plan_status` before initiating booking flow. If `trial_expired` or `suspended`, respond with "Online booking temporarily unavailable. Please call [phone]."
