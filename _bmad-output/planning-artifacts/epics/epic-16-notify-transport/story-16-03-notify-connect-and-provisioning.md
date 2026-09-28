---
story: 16.3
epic: 16
title: Notify Connect & Tenant Provisioning
status: done
created: 2026-09-27
---

# Story 16.3: Notify Connect & Tenant Provisioning

## User Story

As a clinic owner,
I want my clinic connected to WhatsApp through the Notify platform — via Meta's Embedded Signup or my own existing credentials —
So that my clinic runs on its own WABA and API key with no Meta console work, while other clinics remain unaffected.

## Context

`POST /api/v1/clinics/whatsapp/connect-notify` (authenticated). The legacy
direct connect route is untouched — both coexist. Calls Notify's partner API
(`/partner/*`, Bearer `NOTIFY_PARTNER_KEY`) in a resumable sequence; the
clinic's `nsk_` key and webhook secret are stored AES-256-GCM-encrypted on the
Clinic row.

## Acceptance Criteria

**Given** an authenticated clinic session and a valid body
(`{method: 'embedded_signup', code, wabaId, phoneNumberId}` or
`{method: 'manual', accessToken, phoneNumberId, wabaId?, appSecret?}`)
**When** the route runs
**Then** it provisions in order — create tenant (category `healthcare`, `autoReplyEnabled: false`) → issue API key → register webhook endpoint (`/api/webhooks/notify/<clinicId>`, all 5 events) → submit credentials — persisting each result before the next step

**Given** any step fails (502 with Notify's error surfaced)
**When** the request is retried
**Then** completed steps are skipped (tenantId/key/secret already stored) and Notify's side dedupes too (webhook-endpoint creation is retry-safe; credentials/embedded-signup are upserts)

**Given** all steps succeed
**Then** the clinic gets `whatsapp_transport = 'notify'`, `whatsappConnected = true`, phoneNumberId/wabaId stored, and the transport cache is cleared (flip effective immediately)

**Given** a clinic that never calls this route
**Then** nothing changes — it stays on `direct`

## Implementation Notes

- `lib/notify/partner.ts` (partner API client), migration
  `20260927000000_notify_transport` (enum + 3 nullable columns, additive)
- Embedded-signup OAuth code TTL is ~30s — the route forwards it immediately;
  Notify's endpoint is upsert-safe on retry
- **Deferred to a follow-up story**: onboarding/settings UI for this route
  (check mockups first per project rule); until then connect via
  authenticated API call
- Cross-repo dependency: notify-sdk work item 1 (partner API) + retry-safety
  fix `bc05c37` — shipped
