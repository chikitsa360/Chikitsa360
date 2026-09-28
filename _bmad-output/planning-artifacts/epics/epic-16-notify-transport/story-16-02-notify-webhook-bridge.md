---
story: 16.2
epic: 16
title: Notify Webhook Bridge
status: done
created: 2026-09-27
---

# Story 16.2: Notify Webhook Bridge

## User Story

As the platform,
I want inbound Notify webhook events translated into the exact Inngest events the direct Meta webhook emits,
So that the conversation state machine, slot locking, delivery tracking, and SMS fallback run unchanged for notify-transport clinics.

## Context

Notify delivers `reply` / `sent` / `delivered` / `read` / `failed` events to a
per-clinic URL (`/api/webhooks/notify/[clinicId]`) registered during
provisioning, signed Stripe-style (`X-Notify-Signature: t=<s>,v1=<hmac>` over
`${t}.${body}`, per-clinic secret). Notify payloads carry no tenant id — the
clinicId in the URL is the routing key, and the per-clinic secret makes
cross-clinic spoofing impossible.

## Acceptance Criteria

**Given** a request with an invalid/stale (>5 min) signature or an unknown/non-notify clinicId
**Then** 403 (or 404) with a structured security log — no event emitted

**Given** a valid `reply` event (text / button tap / list-row pick)
**Then** an `whatsapp/message.received` Inngest event is emitted with the same data shape and dedup id (`messageId`) as the Meta route — `buttonId`/`listRowId` mapped to `interactiveId` verbatim (routing keys like `CANCEL_APPOINTMENT:<id>` and encoded slot ids intact)

**Given** a valid status event
**Then** `whatsapp/status.update` is emitted with `messageId = waMessageId` and dedup id `<wamid>:<status>` — so `failed` still triggers SMS fallback via the existing handler

**Given** any post-signature processing error
**Then** the route still returns 200 (Notify auto-disables an endpoint after 10 consecutive delivery failures; Inngest dedup makes retries safe)

## Implementation Notes

- Helpers in `lib/notify/webhook.ts` (route files can't export non-handlers
  in Next 15); route at `app/api/webhooks/notify/[clinicId]/route.ts`
- `/api/webhooks/*` is outside middleware auth by existing design — no
  middleware change needed
- Depends on notify-sdk work item 3 (payload completeness: top-level
  InboundReply fields, `waMessageId` on status events) — shipped and verified
- Tests: `lib/notify/__tests__/webhook.test.ts` (signature valid/stale/
  tampered/malformed; translation for text/button/list/all four statuses;
  null cases)
