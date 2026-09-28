---
story: 16.1
epic: 16
title: Dual-Transport Send Layer
status: done
created: 2026-09-27
---

# Story 16.1: Dual-Transport Send Layer

## User Story

As the platform,
I want every outbound WhatsApp send to resolve the clinic's transport and route via either the direct Meta API or the Notify platform,
So that clinics can migrate to per-clinic credentials without any change to the conversation engine or Inngest jobs.

## Context

The send surface is exactly two modules: `lib/whatsapp/message-sender.ts`
(session messages: `sendText`, `sendQuickReply`, `sendListMessage` — used by
all 11 step handlers and the appointment jobs) and
`lib/meta-whatsapp.ts::sendTemplateMessage` (HSM templates — used by the six
event jobs). Both key on `phoneNumberId`, which is why the transport resolver
(`lib/notify/transport.ts`) is keyed the same way. Function signatures are
unchanged, so zero callers were touched.

## Acceptance Criteria

**Given** a clinic with `whatsapp_transport = 'direct'` (or an unknown phoneNumberId, or a DB failure during resolution)
**When** any send function runs
**Then** the request to Meta is byte-identical to pre-Epic-16 behavior (regression-tested)

**Given** a clinic with `whatsapp_transport = 'notify'` and a stored API key
**When** `sendText` / `sendQuickReply` / `sendListMessage` / `sendTemplateMessage` runs
**Then** the message goes to `POST {NOTIFY_API_URL}/v1/send` with the clinic's decrypted `nsk_` key, mapped to Notify's `text` / `interactive_buttons` (object-form buttons preserving routing ids like `CANCEL_APPOINTMENT:<id>`) / `interactive_list` / `hsmTemplate` payloads
**And** the returned `waMessageId` is surfaced as `messageId` so Redis delivery correlation keeps working

**Given** a clinic flagged `notify` whose key is missing or undecryptable
**Then** the send fails loudly (`{success: false}`) — never a silent fallback to `direct`

**And** transport resolutions are cached 60s per phoneNumberId; error states are never cached

## Implementation Notes

- `lib/notify/transport.ts` (resolver + cache + `clearTransportCache()`),
  `lib/notify/client.ts` (/v1/send client), `lib/notify/crypto.ts`
  (AES-256-GCM via `NOTIFY_CREDS_KEY`, format `v1:<iv>:<tag>:<ct>`)
- Depends on notify-sdk work items 2 (list messages) and 5 (caller-supplied
  button ids) — both shipped
- Tests: `lib/notify/__tests__/{crypto,transport}.test.ts`,
  `lib/whatsapp/__tests__/message-sender.test.ts` (incl. direct-path
  byte-identical regression)
