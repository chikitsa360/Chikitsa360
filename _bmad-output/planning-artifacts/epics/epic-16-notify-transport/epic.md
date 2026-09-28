---
epic: 16
title: WhatsApp Dual Transport via Notify Platform
status: done
created: 2026-09-27
stories: 3
---

# Epic 16: WhatsApp Dual Transport via Notify Platform

## Goal

Route WhatsApp messaging through our own Meta Tech Provider platform (Notify,
repo `notify-sdk`, hosted at api.azentis.in / broadcast.azentis.in) so each
clinic operates on its own WABA with its own credentials — eliminating the
shared `META_SYSTEM_ACCESS_TOKEN` and any per-clinic Meta console work — while
keeping the existing direct Meta path fully intact as the default. Both
transports coexist per clinic behind a `whatsapp_transport` flag.

## User Outcome

After this epic is complete:
- A new clinic connects WhatsApp entirely inside the product: either through
  Meta's Embedded Signup popup (managed) or by pasting its own credentials
  (BYO) — no developers.facebook.com, no per-clinic app review
- Every existing clinic keeps working exactly as before on the `direct`
  transport (default; zero behavior change)
- The full booking journey (consent → name → age → gender → slot list →
  confirmation), reminders, cancellations, event notifications, delivery
  tracking, and SMS fallback work identically on both transports
- A clinic can be rolled back to `direct` with a single column update
- Notify's own auto-replies are disabled for clinic tenants — Cliniqly's
  state machine is the only responder

## Requirements Covered

| Category | Items |
|---|---|
| Functional | Transport-agnostic send layer; per-clinic tenant provisioning; webhook bridge with signature verification; BYO credentials path |
| NFRs | Tenant isolation (per-clinic WABA/keys/secrets, AES-256-GCM at rest); no silent fallback on misconfiguration; additive-only migration; instant per-clinic rollback |
| Cross-repo | notify-sdk work items 1–5 (partner API, list messages, payload completeness, auto-reply kill switch, caller-supplied button ids) — see `notify-sdk/docs/cliniqly-integration-brief.md` |

## Architecture

See `docs/whatsapp-notify-transport.md` (code map, wire contract pointers,
env vars, runbook, rollback). Counterpart contract lives in
`notify-sdk/docs/cliniqly-integration-brief.md` + `partner-api-reference.md`.

## Stories

| # | Title | Status |
|---|---|---|
| 16.1 | Dual-Transport Send Layer | done |
| 16.2 | Notify Webhook Bridge | done |
| 16.3 | Notify Connect & Tenant Provisioning | done |

## Deferred / follow-ups

- Onboarding + Settings UI for the notify connect flow (route is
  backend-complete; UI must follow the mockup design system)
- Move reminders/confirmations to HSM templates (possible now via Notify;
  fixes silent failure outside Meta's 24h session window)
- Surface per-clinic messaging tier / quality rating so clinics verify with
  Meta before hitting the unverified 250/day cap
