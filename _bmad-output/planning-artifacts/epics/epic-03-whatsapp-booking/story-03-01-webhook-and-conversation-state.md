---
story: 3.1
epic: 3
title: WhatsApp Webhook Handler & Conversation State Engine
status: review
created: 2026-06-07
baseline_commit: 4726811ba8737c9ef0947d6d2fd43d7eda09bca7
requirements:
  functional: [FR-1, FR-6b]
  arch: [ARCH-9, ARCH-13]
  nfr: [NFR-1, NFR-11]
  compliance: [CR-9, CR-10]
---

# Story 3.1: WhatsApp Webhook Handler & Conversation State Engine

## User Story

As a developer,
I want a reliable webhook handler that receives Meta messages and manages multi-turn conversation state in Redis,
So that the WhatsApp booking flow can process patient messages durably without losing state on pod restarts or handling duplicate deliveries.

## Context

This story builds the infrastructure layer that all WhatsApp booking stories depend on. The webhook handler was partially bootstrapped in Story 2.3 (HMAC validation + webhook verification GET). This story adds the full message processing pipeline.

**Critical architecture decisions:**
- **Immediate 200 ACK:** Meta expects HTTP 200 within 5 seconds or it retries. We return 200 in < 200ms and process async via Inngest.
- **Idempotency via messageId:** Meta may deliver the same message multiple times. Inngest's event deduplication (via `idempotencyKey`) prevents double processing.
- **Redis as state machine store:** Multi-turn conversation state (step, collected fields, reserved slot) stored in Redis with 30-min TTL. AOF persistence ensures durability across restarts (FR-6b).
- **Slot race condition:** `SELECT ... FOR UPDATE SKIP LOCKED` prevents two concurrent bookings on the same slot.

**Meta webhook event types handled:**
- `messages` (type: `text`, `interactive` — for Quick Reply and List Message responses)
- `statuses` (type: `delivered`, `read`, `failed` — for delivery tracking in Story 3.4)

## Acceptance Criteria

**Given** Meta sends a `POST /api/webhooks/whatsapp` with a valid inbound message,
**When** the handler processes the request,
**Then** it returns HTTP 200 within 200ms.
**And** the full Meta payload is passed to an Inngest event `whatsapp/message.received` with `id: messageId` as the idempotency key.
**And** no message processing logic runs inside the HTTP handler — all logic is in the Inngest function.

**Given** Meta sends the same messageId a second time (retry),
**When** Inngest receives the duplicate event,
**Then** the second invocation is deduplicated — the Inngest function runs exactly once for that messageId.
**And** the patient does not receive a duplicate WhatsApp response.

**Given** a `POST /api/webhooks/whatsapp` arrives with an invalid HMAC-SHA256 signature,
**When** the handler validates the signature,
**Then** it returns HTTP 403 immediately.
**And** no Inngest job is enqueued.
**And** a security alert is logged to the audit log: `{ action: 'WEBHOOK_SIGNATURE_INVALID', resource_type: 'whatsapp_webhook' }`.

**Given** a `POST /api/webhooks/whatsapp` arrives with a valid signature but a timestamp older than 5 minutes,
**When** the handler checks the timestamp,
**Then** it returns HTTP 403 (replay attack prevention).
**And** no Inngest job is enqueued.

**Given** an Inngest `whatsapp/message.received` job runs,
**When** the job handler reads the Redis state for `{clinicId}:{patientPhone}:conversation`,
**Then** if state exists and TTL > 0: the current step value is returned (e.g. `AWAITING_AGE`).
**And** if state is absent or expired: `null` is returned (fresh conversation).
**And** the Redis read uses the Upstash REST client (not `ioredis` — Inngest functions are serverless).

**Given** a conversation step completes successfully (e.g. patient provides name),
**When** the handler writes updated state,
**Then** the Redis key `{clinicId}:{patientPhone}:conversation` is updated with `SET ... EX 1800` (30-minute TTL reset on every write).
**And** the complete state object (step, collectedFields, reservedSlotId, language, consentGiven) is serialised as JSON.

**Given** a slot is reserved during the booking flow,
**When** the reservation is made,
**Then** an Inngest delayed job (`whatsapp/slot.release`) is scheduled 5 minutes in the future with the `slotId` and `appointmentId = null`.
**And** the `reservationJobId` is stored in conversation state so it can be cancelled if the booking completes.

**Given** the delayed `whatsapp/slot.release` job fires,
**When** it runs,
**Then** it checks: has an Appointment been created for this slot? If no: slot status is reset to `available`. If yes: no action (booking completed normally).

**Given** the backend (Vercel function / Inngest worker) restarts mid-conversation,
**When** the patient sends their next message,
**Then** the conversation state is read from Redis (AOF-persisted) and the flow resumes from the last written step.
**And** the patient does not see the flow restart from the beginning.

**Given** Meta sends a delivery status webhook (`POST` with `statuses` array),
**When** the handler processes it,
**Then** it enqueues an Inngest job `whatsapp/status.update` with the messageId and status (`delivered`, `read`, `failed`).
**And** the HTTP handler returns HTTP 200 immediately.

## Technical Notes

**Conversation state Redis key:** `{clinicId}:{patientPhone}:conversation`
- TTL: 1800 seconds (30 minutes), reset on every write
- Format: JSON serialised `ConversationState` object
- On flow completion (appointment created): delete the key immediately (don't wait for TTL)

**Inngest functions registered in this story:**
1. `whatsapp/message.received` — main flow dispatcher (reads state → routes to step handler)
2. `whatsapp/slot.release` — delayed 5-minute slot hold releaser
3. `whatsapp/status.update` — delivery status tracker (updates appointment delivery_status field)

**Message dispatching logic:**
```typescript
// In the Inngest function:
const state = await redis.get(`${clinicId}:${patientPhone}:conversation`);
if (!state) return await handleFreshConversation(event, clinicId, patientPhone);
switch (state.step) {
  case 'AWAITING_CONSENT': return handleConsentResponse(event, state);
  case 'AWAITING_NAME': return handleNameInput(event, state);
  case 'AWAITING_AGE': return handleAgeSelection(event, state);
  case 'AWAITING_GENDER': return handleGenderSelection(event, state);
  case 'AWAITING_SLOT': return handleSlotSelection(event, state);
}
```

**Slot locking (ARCH-9):**
```sql
-- Run inside a Prisma $transaction:
SELECT id FROM slots
WHERE id = $slotId AND status = 'available'
FOR UPDATE SKIP LOCKED;
-- If no row returned: slot is already locked by concurrent booking
-- If row returned: update status = 'reserved', proceed
```

## File Locations

```
apps/web/
  src/
    app/
      api/
        webhooks/
          whatsapp/
            route.ts                          ← POST handler (HMAC validation + 200 ACK + Inngest enqueue)
    inngest/
      functions/
        whatsapp-message-received.ts          ← Main conversation dispatcher
        whatsapp-slot-release.ts              ← Delayed slot hold releaser
        whatsapp-status-update.ts             ← Delivery status tracker
      client.ts                               ← Inngest client (already from Story 1.1)
    lib/
      whatsapp/
        conversation-state.ts                 ← Redis read/write helpers for conversation state
        step-handlers/
          fresh-conversation.ts               ← Step 0: identity resolution
          handle-consent.ts                   ← Step 1: consent
          handle-name.ts                      ← Step 2: name input
          handle-age.ts                       ← Step 3: age selection
          handle-gender.ts                    ← Step 4: gender selection
          handle-slot-selection.ts            ← Step 5: slot selection + locking
        slot-lock.ts                          ← SELECT FOR UPDATE SKIP LOCKED helper
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | HMAC-SHA256 validation (valid/invalid/expired timestamp) | 100% |
| Unit | Conversation state read/write/expire helpers | ≥ 90% |
| Unit | Step dispatcher routing (all 6 step cases) | 100% |
| Unit | Slot release job: appointment exists → no release; no appointment → release | 100% |
| Integration (testcontainers) | Slot locking: concurrent reservation attempts → exactly one succeeds | 100% |
| Integration | Redis state TTL reset on each write | 100% |
| Integration | Webhook POST: valid signature → 200 + Inngest event; invalid → 403 | 100% |
| Integration | Duplicate messageId → Inngest job runs exactly once | 100% |

## Security Notes

- Webhook endpoint is not behind next-auth middleware (it's public) — validated by HMAC-SHA256 + timestamp
- Clinic lookup in webhook: `clinicId` derived from the WhatsApp Phone Number ID in the payload (mapped to clinic record)
- No patient PII is logged in plain text in error logs — only phone number last 4 digits
- Conversation state in Redis contains phone numbers — ensure Upstash instance is in the closest region (Mumbai) to AWS RDS for DPDP compliance
