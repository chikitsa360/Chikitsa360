# WhatsApp Dual Transport — Direct Meta API + Notify Platform

**Status: implemented (Epic 16, commit `80d032d`). Last updated: 2026-09-28.**

Cliniqly supports two WhatsApp transports per clinic, selected by
`clinics.whatsapp_transport`:

| Transport | Who uses it | How it sends | How it receives |
|---|---|---|---|
| `direct` (default) | Every clinic existing before Epic 16 | Meta Cloud API with the shared `META_SYSTEM_ACCESS_TOKEN` | Meta webhook → `/api/webhooks/whatsapp` |
| `notify` | Clinics connected via the Notify platform (broadcast.azentis.in) | `POST {NOTIFY_API_URL}/v1/send` with the clinic's own `nsk_` API key | Notify outbound webhook → `/api/webhooks/notify/[clinicId]` |

The Notify platform is our separately-deployed Meta **Tech Provider** system
(repo: `notify-sdk`, hosted API `https://api.azentis.in`, admin
`https://broadcast.azentis.in`). One verified Meta app — Notify's — serves
every clinic; **no per-clinic Meta app, review, or publishing ever**. Each
clinic gets its own WABA + phone number (a Meta platform requirement), created
inside the Embedded Signup popup or brought by the clinic (BYO).

## Design invariants (do not break these)

1. **The booking brain lives in Cliniqly.** The conversation state machine
   (`lib/whatsapp/step-handlers/*`), slot locking, validation, and all Inngest
   jobs are transport-agnostic and unchanged. Notify is transport only; its
   own AI auto-reply/automation flows are disabled for clinic tenants
   (`autoReplyEnabled: false` at tenant creation).
2. **Same function signatures across transports.** `sendText`,
   `sendQuickReply`, `sendListMessage` (`lib/whatsapp/message-sender.ts`) and
   `sendTemplateMessage` (`lib/meta-whatsapp.ts`) resolve the transport
   internally by `phoneNumberId` — callers never know which transport ran.
3. **Same Inngest events across transports.** The Notify bridge translates
   payloads into `whatsapp/message.received` / `whatsapp/status.update` with
   the same data shape and dedup ids as the Meta webhook route.
4. **No silent fallback.** A clinic flagged `notify` with a missing/broken key
   fails the send loudly (`lib/notify/transport.ts` returns `mode: 'error'`).
   A DB failure during resolution fails open to `direct` (pre-Epic-16
   behavior).
5. **Everything is additive.** The direct path is byte-identical to
   pre-Epic-16; a clinic can be flipped back by setting
   `whatsapp_transport = 'direct'` (instant rollback, cache TTL 60s).

## Code map

| Piece | Path |
|---|---|
| Transport resolver (60s cache) | `apps/web/src/lib/notify/transport.ts` |
| /v1/send client | `apps/web/src/lib/notify/client.ts` |
| Partner provisioning client | `apps/web/src/lib/notify/partner.ts` |
| Secret encryption (AES-256-GCM) | `apps/web/src/lib/notify/crypto.ts` |
| Webhook signature + payload translation | `apps/web/src/lib/notify/webhook.ts` |
| Webhook bridge route | `apps/web/src/app/api/webhooks/notify/[clinicId]/route.ts` |
| Connect route (managed + BYO) | `apps/web/src/app/api/v1/clinics/whatsapp/connect-notify/route.ts` |
| Schema | `clinics.whatsapp_transport` enum + `notify_tenant_id`, `notify_api_key_encrypted`, `notify_webhook_secret_encrypted` (migration `20260927000000_notify_transport`) |
| Tests | `lib/notify/__tests__/*`, `lib/whatsapp/__tests__/message-sender.test.ts` |

The authoritative wire contract (exact payloads both directions, provisioning
sequence, retry semantics) is documented in the Notify repo:
`notify-sdk/docs/cliniqly-integration-brief.md` and
`notify-sdk/docs/partner-api-reference.md`.

## Environment variables

| Var | Purpose | Notes |
|---|---|---|
| `NOTIFY_API_URL` | Notify hosted API base | `https://api.azentis.in` (prod) |
| `NOTIFY_PARTNER_KEY` | Partner provisioning key | Issued per `notify-sdk/docs/partner-api-reference.md` → "Issuing a new partner key". Server-only. |
| `NOTIFY_CREDS_KEY` | 32-byte hex key encrypting per-clinic Notify secrets at rest | Generate once: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. **Never rotate casually — stored clinic secrets become undecryptable.** |

Clinics on `direct` need none of these. The legacy `META_*` vars remain
required while any clinic is on `direct`.

## Connecting a clinic (until the UI ships, via API)

`POST /api/v1/clinics/whatsapp/connect-notify` (authenticated clinic session).
Two methods, one destination:

```jsonc
// Managed — Embedded Signup (code from Meta's popup, ~30s TTL)
{ "method": "embedded_signup", "code": "...", "wabaId": "...", "phoneNumberId": "..." }

// BYO — clinic brings its own Meta credentials
{ "method": "manual", "accessToken": "...", "phoneNumberId": "...", "wabaId": "...", "appSecret": "..." }
```

The route provisions in order — tenant → API key → webhook endpoint →
credentials — persisting each step, so **retrying after a failure is safe and
resumes where it left off** (Notify's endpoints are idempotent/dedup-safe on
their side too). Success flips the clinic to `whatsapp_transport = 'notify'`.

BYO caveat: the clinic's Meta app webhook callback must point at Notify's
central URL (`{NOTIFY_API_URL}/v1/webhook/whatsapp`) — Notify handles this
automatically via `subscribed_apps` during credential verification.

## Go-live / test runbook

Prerequisites (Notify side, done in the notify-sdk repo): branch deployed,
migrations 026–028 applied, partner key issued.

1. Cliniqly migration: `pnpm exec prisma migrate deploy` (additive).
2. Set the three `NOTIFY_*` vars (`.env.local` + Vercel).
3. **E2E needs a publicly reachable Cliniqly** — Notify's SSRF guard rejects
   `localhost`/private webhook URLs. Use the deployed URL or a public tunnel.
4. Connect a throwaway clinic (BYO method first — no OAuth timing pressure).
5. Walk the journey from a spare phone (not on personal WhatsApp): "Hi" →
   consent buttons → name → age → gender → slot list → booked + confirmation.
6. Verify delivery statuses on the appointment; force a failure → SMS
   fallback fires.
7. Reminder cancel button (`CANCEL_APPOINTMENT:<id>`) round-trips; STOP/START
   honored; Notify never auto-replies.

## Rollback

Per clinic: `UPDATE clinics SET whatsapp_transport = 'direct' WHERE id = ...`
(effective within 60s; immediate if the app restarts). The direct path is
untouched, so rollback restores exact pre-Epic-16 behavior — provided the
clinic's WABA is still accessible via `META_SYSTEM_ACCESS_TOKEN` (true for
clinics that were connected direct before; NOT true for clinics provisioned
fresh through Notify, whose WABA belongs to the Notify platform app — those
have no direct-path equivalent and rollback means fixing the Notify config
instead).

## Known follow-ups

- Onboarding/settings UI for `connect-notify` (route is backend-complete).
- 24h/2h reminders + confirmations still go out as session messages; moving
  them to HSM templates (works outside Meta's 24h window) is now possible via
  Notify and should be a follow-up story.
- Notify's `/v1` rate limit is 60 req/min per tenant — fine for booking
  conversations; revisit for large event invitation blasts (`send-bulk`
  exists on the Notify side).
