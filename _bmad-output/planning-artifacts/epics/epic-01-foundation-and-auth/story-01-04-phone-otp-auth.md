---
story: 1.4
epic: 1
title: Phone OTP Authentication
status: review
created: 2026-06-07
baseline_commit: d8174b38e545265d7e7f04c6f5009c2dfbbdd15c
requirements:
  functional: [FR-34]
  arch: [ARCH-2]
  nfr: [NFR-7, NFR-10, NFR-11]
  compliance: [CR-6]
---

# Story 1.4: Phone OTP Authentication

## User Story

As a Clinic Owner or staff member,
I want to log in with my phone number and a 6-digit OTP,
So that I can securely access the platform without needing to remember a password.

## Context

**FR-34:** All users log in via phone number + 6-digit OTP. No password.
- OTP: 6 digits, valid 10 minutes
- Delivery: SMS via MSG91 (primary); WhatsApp (if SMS unavailable)
- Max 3 failed attempts → 15-minute lockout on that phone number
- Sessions persist 30 days on trusted device
- Re-authentication required on new/unrecognised device (trusted = valid HttpOnly session cookie; clearing cookies = new device)

**Auth stack:**
- next-auth v5 (Auth.js) with custom Credentials provider
- HttpOnly session cookies (30-day)
- JWT session payload: `{ clinicId, userId, role }`
- Redis tracks OTP attempt counts per phone number
- `next-auth` middleware protects all `(dashboard)/*` routes

**First-login flow (Clinic Owner who just signed up):**
1. Lands on `/login`
2. Enters phone number → OTP sent → enters OTP → authenticated
3. `next-auth` checks: does user have an associated Clinic with `onboarding_complete = true`?
4. No → redirect to `/onboarding` wizard (Epic 2)
5. Yes → redirect to `/dashboard`

**Returning user flow:**
- Phone number → OTP → authenticated → redirect to `/dashboard`

## Acceptance Criteria

**Given** I visit `/login` as an unauthenticated user,
**When** the page renders,
**Then** I see a phone number input field (labelled "Mobile Number"), a "Send OTP" button, and language is shown in both English and Hindi (per the portal's current language setting).

**Given** I enter a valid 10-digit Indian mobile number and tap "Send OTP",
**When** the request is submitted,
**Then** MSG91 sends a 6-digit OTP via SMS to the provided number within 30 seconds.
**And** the UI transitions to an OTP entry screen showing "Code sent to +91 XXXXXX{last4}" (masking all but last 4 digits).
**And** a "Didn't receive? Resend OTP" link appears after 30 seconds (resend cooldown timer).

**Given** the OTP entry screen is shown,
**When** I enter the correct 6-digit code within 10 minutes and submit,
**Then** I am authenticated.
**And** a 30-day HttpOnly session cookie is set (not accessible via `document.cookie`).
**And** if my Clinic's onboarding is incomplete, I am redirected to `/onboarding`.
**And** if my Clinic's onboarding is complete, I am redirected to `/dashboard`.

**Given** the OTP entry screen is shown,
**When** 10 minutes have elapsed since OTP generation,
**Then** the OTP is expired; attempting to use it shows "OTP expired. Please request a new code."
**And** the user is returned to the phone entry step.

**Given** the OTP entry screen is shown,
**When** I enter an incorrect OTP,
**Then** an error message shows "Incorrect OTP. {N} attempts remaining." (where N decrements from 2 to 0).
**And** after 3 failed attempts, the phone number is locked for 15 minutes.
**And** during lockout, any attempt (login or new OTP request) returns "Too many attempts. Try again in {minutes} minutes."
**And** the lockout state is stored in Upstash Redis with key `otp:{phone}:lockout` and TTL = 15 minutes.

**Given** I am logged in on Device A (valid HttpOnly cookie),
**When** I open the portal in a different browser or after clearing cookies (Device B),
**Then** I am redirected to `/login` and must re-authenticate.
**And** Device A's session remains active.

**Given** a valid session exists,
**When** the session cookie reaches 30 days old,
**Then** the session expires; the next request is redirected to `/login`.

**Given** I am authenticated and my JWT session is valid,
**When** any protected API route in `/api/v1/` is called,
**Then** the next-auth middleware validates the session and populates `{ clinicId, userId, role }` into request context before the handler executes.

**Given** a request to any `(dashboard)/*` route or `/api/v1/*` endpoint is made without a valid session,
**When** the middleware evaluates the request,
**Then** it redirects to `/login` (for page requests) or returns HTTP 401 with `{ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }` (for API requests).
**And** no data about the protected resource is present in the response.

**Given** the login page and OTP page render,
**When** viewed in either English or Hindi mode,
**Then** all text (labels, error messages, helper text, button labels) is correctly translated in both languages via next-intl.

**Given** the login flow on mobile (360px viewport),
**When** I interact with the phone number input and OTP input,
**Then** the phone number input shows `inputmode="tel"` (numeric keyboard on mobile).
**And** the OTP input shows `inputmode="numeric"` and `autocomplete="one-time-code"` (enables SMS autofill on Android/iOS).
**And** both inputs and the submit button meet 44px minimum touch target height (NFR-16).

## UX Design Reference

**DESIGN.md — Login screen:**
- Centered card on white/dark background (no sidebar; full-page auth layout)
- Card: `--shadow-card` elevation, `--radius-lg` corners, 40px internal padding
- Clinic logo (Chikitsa360 logo) at top
- Heading: "Welcome back" (Plus Jakarta Sans, 24px/32px)
- Phone input: full width, `--radius-md`, 12px padding
- "Send OTP" button: brand-primary fill, full width, 44px height
- OTP input: 6 individual digit boxes (or single input with character splitting)
- "Verify & Login" button: brand-primary fill, full width
- Error state: red border on input, error text below in `--color-error`

**EXPERIENCE.md — Key Flows: Login (paraphrased):**
1. User lands on `/login`
2. Enters phone number → validation (10 digits, Indian format)
3. "Send OTP" → loading state → OTP sent → input transitions to OTP entry
4. Enters 6-digit OTP → submit → success → redirect
5. Error: inline on OTP field; lockout: full card message with timer

**EXPERIENCE.md — Accessibility:**
- OTP input: `autocomplete="one-time-code"` for SMS autofill
- Error messages: `aria-describedby` pointing to the input
- Loading: button shows spinner + "Sending..." text; not disabled (avoid focus loss)

## File Locations

```
apps/web/
  src/
    app/
      (auth)/
        login/
          page.tsx                  ← Login page (phone entry + OTP entry)
        layout.tsx                  ← Auth layout (no sidebar; centered card)
    lib/
      auth.ts                       ← next-auth v5 config + custom Credentials provider
      otp.ts                        ← MSG91 OTP send function; Redis attempt tracking
    components/
      auth/
        LoginForm.tsx               ← Phone entry step
        OtpForm.tsx                 ← OTP entry step
        AuthCard.tsx                ← Centered card wrapper
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | OTP generation, expiry, attempt counting, lockout logic in `otp.ts` | ≥ 90% |
| Integration (testcontainers) | Full auth flow: send OTP → store in Redis → validate → create session | Core happy path |
| Integration | Lockout: 3 failed attempts → lockout state in Redis; correct TTL | 100% |
| Integration | Session expiry: expired cookie → redirect to login | 100% |
| Playwright (E2E) | UJ login: phone input → OTP → dashboard redirect (mobile + desktop viewports) | 100% of UJ path |
| Playwright | Error state: wrong OTP → error message; lockout message | Core paths |

## Security Notes

- MSG91 API key stored in `UPSTASH_REDIS_REST_TOKEN` — never exposed to client
- OTP is NOT stored in the database — only in Redis with TTL; cleared on successful verification
- Session cookie: `HttpOnly: true`, `Secure: true`, `SameSite: lax`
- Redis key for OTP: `otp:{phone}:{sessionNonce}` — include a nonce to prevent brute-force OTP reuse across sessions
- Rate limiting on the OTP send endpoint (separate from general API rate limit): max 3 OTP requests per phone per 10 minutes via Upstash Rate Limit
