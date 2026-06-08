---
story: 2.3
epic: 2
title: WhatsApp Business Number Connection
status: review
created: 2026-06-07
baseline_commit: d8174b3
requirements:
  functional: [FR-36]
  compliance: [CR-9, CR-10]
  nfr: [NFR-11, NFR-13]
  ux: [UX-DR27]
---

# Story 2.3: WhatsApp Business Number Connection

## User Story

As a Clinic Owner,
I want to connect my clinic's WhatsApp Business number to the platform via Meta's API,
So that patients can book appointments by WhatsApp and receive automated confirmations and reminders from the clinic's own number.

## Context

**Architecture decision (addendum.md A1):** Direct Meta WhatsApp Cloud API — no BSP intermediary.

**What "connecting" means:**
1. Clinic Owner registers/links a WhatsApp Business number via Meta Business Manager
2. Meta issues a WABA (WhatsApp Business Account) ID, Phone Number ID, and access token
3. Cliniqly stores these credentials encrypted in clinic settings
4. Cliniqly registers its webhook URL with Meta (`/api/webhooks/whatsapp`)
5. Meta sends a webhook verification challenge which Cliniqly must respond to (HMAC-SHA256)

**Meta verification status flow:**
```
Number registered → Templates submitted → Verified (green tick eligible)
```
Verification timeline: 5–10 business days total. This is an external process and is NOT a launch blocker.

**Template pre-approval (CR-9):** All WhatsApp message templates (`apt_confirmation`, `apt_reminder_24h`, `apt_reminder_2h`, `apt_cancellation`) must be submitted via Meta's WhatsApp Manager and approved BEFORE MVP pilot launch. Template IDs are stored in Cliniqly's environment config (not per-clinic — templates are shared across all clinics).

**"WhatsApp pending" state:** If the Owner skips Step 4, the clinic operates fully except WhatsApp Booking Flow and automated reminders are inactive. A persistent banner reminds them to complete setup.

**Meta Embedded Signup:** Meta provides an embedded signup SDK (JavaScript) that launches a Meta-managed flow for phone number registration without leaving the Cliniqly portal. The flow returns OAuth-style credentials on completion.

## Acceptance Criteria

**Given** I am on `/onboarding/step-4` (WhatsApp Setup),
**When** the step renders,
**Then** I see:
- A heading: "Connect your WhatsApp Business Number"
- An explanation: "Patients will book appointments and receive reminders on your clinic's WhatsApp number."
- A 3-step status indicator (visual progress): "① Number Registered → ② Templates Submitted → ③ Verified"
- A "Connect WhatsApp" primary button
- A "Skip for now" ghost button with note: "You can complete this in Settings → WhatsApp later."

**Given** I click "Connect WhatsApp",
**When** the Meta Embedded Signup flow launches,
**Then** a Meta-managed popup/iframe opens for the Owner to select or register their WhatsApp Business phone number.
**And** the Cliniqly UI shows a loading/waiting state: "Completing WhatsApp setup... Don't close this window."

**Given** the Meta Embedded Signup flow completes successfully,
**When** Meta returns the credentials (WABA ID, Phone Number ID, Access Token),
**Then** Cliniqly stores these credentials encrypted in the Clinic settings record.
**And** Cliniqly registers the webhook URL (`{BASE_URL}/api/webhooks/whatsapp`) with Meta using the Phone Number ID and Access Token.
**And** Meta sends a webhook verification challenge (GET request with `hub.challenge`); Cliniqly responds with the challenge value to verify ownership.
**And** the 3-step status indicator updates to show "Number Registered ✓".
**And** a success message shows: "WhatsApp connected! Your clinic number is now ready for patient bookings."

**Given** the Meta Embedded Signup flow fails (e.g. phone number already registered, token expired),
**When** Meta returns an error,
**Then** the specific error message from the Meta API is displayed to the Owner in plain language (e.g. "This number is already linked to another WhatsApp Business account. Please use a different number.").
**And** a "Try Again" button allows retrying without restarting the wizard.
**And** no credentials are stored if the flow failed.

**Given** I click "Skip for now",
**When** I confirm the skip,
**Then** I am advanced to wizard completion (Story 2.4) in 'WhatsApp pending' state.
**And** `whatsapp_connected = false` on the Clinic record.
**And** WhatsApp Booking Flow and automated reminders are inactive for this Clinic until connected.

**Given** I navigate to Settings → WhatsApp after the wizard,
**When** the page renders,
**Then** I see:
- Connection status: "Connected" (green) or "Not Connected" (amber)
- Phone number registered (if connected): "+91 XXXXXXXXXX"
- WABA verification status: "Number Registered / Templates Submitted / Verified" with checkmarks
- Per-template approval status table: `apt_confirmation` (Approved / Pending / Rejected), `apt_reminder_24h`, `apt_reminder_2h`, `apt_cancellation`
- Language setting: "Clinic communication language: English / Hindi" (Select dropdown — FR-36/NFR-13)
- "Reconnect WhatsApp" button (initiates new Meta Embedded Signup)

**Given** I change the Clinic communication language in Settings → WhatsApp,
**When** I save,
**Then** all future WhatsApp messages to patients from this Clinic use the selected language (English or Hindi).
**And** the portal language is NOT changed by this setting — portal language is user-level (changed in avatar menu).

**Given** the webhook endpoint `POST /api/webhooks/whatsapp` receives a message,
**When** the request arrives,
**Then** the HMAC-SHA256 signature is validated against Meta's secret before any processing.
**And** if the signature is invalid, the endpoint returns HTTP 403 and no processing occurs.
**And** if the signature is valid, the endpoint immediately returns HTTP 200 (< 200ms) to acknowledge receipt.
**And** the actual message processing is handed off to an Inngest job (not processed synchronously in the webhook handler).

**Given** Meta sends a webhook verification GET request (with `hub.mode=subscribe`, `hub.verify_token`, `hub.challenge`),
**When** the endpoint `/api/webhooks/whatsapp` handles it,
**Then** it validates the `hub.verify_token` against Cliniqly's configured value.
**And** if valid, responds with `hub.challenge` value as the response body.
**And** if invalid, returns HTTP 403.

## UX Design Reference

**EXPERIENCE.md — Onboarding Step 4 (WhatsApp Setup):**
- Card layout same as other wizard steps
- Status indicator: horizontal row of 3 circles connected by lines (same pattern as overall wizard progress bar but 3-step)
  - Each circle: numbered (①②③), status: pending (grey) / complete (green check)
  - Labels below: "Number Registered", "Templates Submitted", "Verified"
- "Connect WhatsApp" button: brand-primary, full-width, WhatsApp logo icon + text
- Error state: amber Alert component with the Meta error text + "Try Again" button
- Success state: green Alert component + confetti or success animation (subtle, 1-time)

**DESIGN.md — Settings → WhatsApp page:**
- Status card at top: large "Connected ✓" or "Not Connected ⚠" with phone number
- Template status table: 4 rows (template name + status badge: Approved green / Pending amber / Rejected red)
- Language selector: standard Select component, full-width, with flag icons optional
- "Reconnect" button: outline/ghost style (not primary — destructive action path)

**EXPERIENCE.md — State Patterns (WhatsApp pending state):**
- Persistent banner: yellow/amber background, full-width below header
- Text: "Complete your WhatsApp setup to enable patient bookings."
- CTA: "Connect WhatsApp →" links to Settings → WhatsApp
- Dismiss: NOT dismissable — persists until WhatsApp is connected
- The banner appears on: Dashboard, Appointments, Patients, Settings

## File Locations

```
apps/web/
  src/
    app/
      (dashboard)/
        onboarding/
          step-4/
            page.tsx                      ← WhatsApp Setup step
        settings/
          whatsapp/
            page.tsx                      ← Settings → WhatsApp management
      api/
        webhooks/
          whatsapp/
            route.ts                      ← POST (inbound messages) + GET (verification)
        v1/
          clinics/
            whatsapp/
              connect/
                route.ts                  ← POST (store credentials + register webhook)
              status/
                route.ts                  ← GET (connection + template status)
    lib/
      meta-whatsapp.ts                    ← Meta Cloud API client (send messages, register webhook)
    components/
      onboarding/
        WhatsAppSetupStep.tsx             ← Step 4 UI component
        WhatsAppStatusIndicator.tsx       ← 3-step status progress indicator
      settings/
        WhatsAppSettings.tsx              ← Settings → WhatsApp page component
      layout/
        WhatsAppPendingBanner.tsx         ← Persistent setup reminder banner
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | HMAC-SHA256 signature validation (valid signature passes, tampered fails) | 100% |
| Unit | Webhook verification GET (valid token → challenge; invalid → 403) | 100% |
| Integration | Webhook POST: valid signature → 200 ACK + Inngest job enqueued | 100% |
| Integration | Webhook POST: invalid signature → 403, no job enqueued | 100% |
| Playwright (E2E) | Skip WhatsApp step → wizard completion → persistent banner visible | Core path |
| Playwright | Settings → WhatsApp page renders with status fields | Core path |

## Compliance Notes

- **CR-9:** Template pre-approval is an operational prerequisite, not a code requirement. Before MVP pilot launch: submit `apt_confirmation`, `apt_reminder_24h`, `apt_reminder_2h`, `apt_cancellation` templates via Meta WhatsApp Manager. Template IDs are stored in env vars (`WHATSAPP_TEMPLATE_CONFIRMATION_ID` etc.) — not hardcoded.
- **CR-10:** Only transactional messages triggered by patient-initiated actions are sent. No marketing messages permitted. This is a design/policy constraint enforced by the message trigger logic in Epic 3 + Epic 7.
- **NFR-11:** HMAC-SHA256 validation is implemented in this story — every inbound Meta webhook is validated before processing. Reject if > 5 minutes old (replay attack protection).
- **Security:** Meta credentials (WABA ID, Phone Number ID, Access Token) are stored encrypted in the Clinic record. Never exposed to client-side code. Access Token is a system token (not an OAuth user token) — stored in `WHATSAPP_ACCESS_TOKEN` env var (platform-wide) or per-clinic encrypted field (if multi-number in future).

## Notes

- Meta Embedded Signup SDK requires a `FACEBOOK_APP_ID` env var and a frontend JavaScript snippet. This is the official Meta-recommended flow for business onboarding.
- For MVP, the access token is the platform-level System User token (not per-clinic). All clinics share the same Meta App; each has their own Phone Number ID and WABA ID.
- The webhook registration endpoint must be publicly accessible (not behind auth middleware). It is validated via HMAC-SHA256 + verify_token — that is its own authentication mechanism.
