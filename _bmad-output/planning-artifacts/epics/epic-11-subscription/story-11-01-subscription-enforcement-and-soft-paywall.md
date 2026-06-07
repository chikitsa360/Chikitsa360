---
story: 11.1
epic: 11
title: Subscription Plan Enforcement & Soft Paywall
status: Not Started
created: 2026-06-07
requirements:
  monetisation: [MON-1, MON-2, MON-3, MON-4]
  ux: [UX-DR25]
---

# Story 11.1: Subscription Plan Enforcement & Soft Paywall

## User Story

As the Platform Operator,
I want clinic subscriptions to be enforced automatically — blocking new bookings when plans expire and preventing doctor counts from exceeding plan limits —
So that the platform's commercial model is protected without creating a harsh experience for clinic staff or patients.

## Context

**MON-1:** Plan tiers — `trial` (14 days, 2 doctors), `basic` (monthly, 3 doctors), `pro` (monthly, 10 doctors). Stored on clinic record.

**MON-2:** Doctor limit — enforced at staff invite time. Cannot add more Doctors than the plan allows.

**MON-3:** Soft paywall on expiry — WhatsApp booking and Web Booking Link show "unavailable" message. Portal access continues in read-only mode.

**MON-4:** Expiry warning — amber persistent banner in portal 7 days before expiry date.

**Philosophy:** Never hard-lock a clinic's portal access to their own historical data. A clinic that has lapsed should still be able to view appointments and patient records — just not accept new bookings. This prevents data loss panic and maintains goodwill.

## Acceptance Criteria

### Doctor Limit (MON-2)

**Given** a Clinic Owner navigates to Settings → Staff and tries to invite a new Doctor,
**When** the clinic has already reached its plan's doctor limit (e.g. `basic` plan, 3 doctors already active),
**Then** the "+ Invite Doctor" button is disabled with a tooltip: "You've reached your plan's doctor limit (3). Upgrade to add more doctors."
**And** the API `POST /api/v1/staff/invite` with `role = 'doctor'` returns 403 with: `{ error: 'doctor_limit_reached', current: 3, limit: 3 }`.
**And** an upgrade prompt is shown inline: "Your plan includes up to 3 doctors. [Upgrade Plan →]" (link to subscription contact/upgrade page — Phase 1; at MVP this links to a contact form).

**Given** an existing doctor is deactivated (removed from the clinic),
**When** the active doctor count drops below the plan limit,
**Then** the "+ Invite Doctor" button becomes enabled again.

### Soft Paywall on Expiry (MON-3)

**Given** a clinic's `plan_expires_at` has passed (plan expired),
**When** a patient sends a WhatsApp message to initiate a booking,
**Then** the WhatsApp flow returns: "Booking is temporarily unavailable at {ClinicName}. Please contact the clinic directly at {clinic phone number}." — in the clinic's configured language (en/hi).
**And** no booking flow is initiated.
**And** the conversation state is NOT stored (no Redis state entry).

**Given** a clinic's plan has expired,
**When** a patient visits `cliniqly.com/book/{slug}`,
**Then** the Web Booking page shows the soft paywall state (Story 4.1 — scaffolded): the slot browser and form are NOT rendered.
**And** the page shows: "Online booking is temporarily unavailable. Please contact the clinic directly at {clinic phone}."
**And** the clinic header (name, address) is still visible — the page is not blank.

**Given** a clinic's plan has expired,
**When** a Clinic Owner or Receptionist logs into the portal,
**Then** they can log in successfully — authentication is NOT blocked.
**And** they can view existing appointments, patient records, and reports in read-only mode.
**And** creating new appointments (manual or walk-in) is blocked: the "+ New Appointment" and "Walk-In" buttons are disabled with: "New bookings are paused. Renew your subscription to resume."
**And** all read operations (viewing history, searching patients, running reports) work normally.

**Given** a clinic's plan has expired and a Receptionist attempts `POST /api/v1/appointments`,
**When** the API processes the request,
**Then** it checks `clinic.plan_expires_at < NOW()` and returns 402 with: `{ error: 'plan_expired', expiredAt: '...' }`.
**And** this check applies to all appointment creation paths (manual, walk-in, web, WhatsApp).

### Expiry Warning Banner (MON-4)

**Given** a clinic's `plan_expires_at` is within the next 7 days (not yet expired),
**When** any portal page loads,
**Then** a persistent amber banner appears at the top of the page (below the header, above the page content): "Your subscription expires on {Date}. Renew to avoid service interruption. [Renew →]"
**And** the banner cannot be permanently dismissed — it reappears on every page load until renewal or expiry.
**And** the banner is shown to both Owners and Receptionists.
**And** "[Renew →]" links to the contact/renewal page (Phase 1: Stripe checkout; MVP: contact form).

**Given** the plan expires while the Owner is actively using the portal,
**When** the expiry timestamp passes (client-side: checked on each API response via a `X-Plan-Status` header),
**Then** the amber warning banner transitions to a red paywall banner: "Your subscription has expired. New bookings are paused."
**And** booking-creation buttons disable without requiring a page reload (real-time header check).

**Given** a new clinic is created (signup),
**When** the clinic record is initialised,
**Then** `plan = 'trial'`, `plan_expires_at = NOW() + 14 days`, `doctor_limit = 2` are set as defaults.
**And** the trial expiry warning banner begins showing on day 8 (7 days before trial ends).

## UX Design Reference

**EXPERIENCE.md — Plan expiry states (UX-DR25):**
> Three portal states based on plan:
> 1. **Active:** No banner. Full functionality.
> 2. **Expiring soon (≤ 7 days):** Amber persistent banner top of every page. All features functional.
> 3. **Expired:** Red persistent banner. Booking creation disabled (buttons greyed with tooltip). Read access full.
>
> Banner anatomy: full-width, 48px height. Left: warning icon + message text. Right: CTA button. No dismiss (×) button — intentional.

**DESIGN.md — Expiry banners:**
- Warning banner (≤ 7 days): `bg-amber-50 border-b border-amber-200 text-amber-800`; icon amber-500; CTA: `bg-amber-600 text-white hover:bg-amber-700` small button
- Expired banner: `bg-red-50 border-b border-red-200 text-red-800`; icon red-500; CTA: `bg-red-600 text-white` small button
- Banner height: 48px; text: 14px Inter medium; z-index above page content, below modal overlays

**DESIGN.md — Disabled booking buttons (expired plan):**
- Button opacity: 50%; cursor: not-allowed
- Tooltip on hover: "New bookings are paused. Renew your subscription to resume."
- Tooltip: dark bg, 12px Inter, max-width 240px

## File Locations

```
apps/web/
  src/
    middleware.ts                           ← Extended: add X-Plan-Status header to all portal API responses
    app/
      (portal)/
        layout.tsx                          ← Extended: render PlanBanner based on X-Plan-Status
      api/
        v1/
          appointments/
            route.ts                        ← Extended: plan_expires_at check → 402
          staff/
            invite/
              route.ts                      ← Extended: doctor_limit check → 403
      (booking)/
        book/
          [slug]/
            page.tsx                        ← Extended: plan_expired → soft paywall state
    components/
      layout/
        PlanBanner.tsx                      ← Warning / expired banner component
    lib/
      plan/
        check-plan.ts                       ← isPlanExpired(clinic), isDoctorLimitReached(clinic) helpers
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | isPlanExpired: plan_expires_at < NOW() → true | 100% |
| Unit | isDoctorLimitReached: active doctors >= doctor_limit → true | 100% |
| Unit | Trial defaults: plan='trial', 14-day expiry, doctor_limit=2 | 100% |
| Integration | POST /api/v1/appointments: expired plan → 402 | 100% |
| Integration | POST /api/v1/staff/invite with role=doctor: at limit → 403 | 100% |
| Integration | WhatsApp booking flow: expired clinic → paywall message sent, no booking created | 100% |
| Playwright (E2E) | Expired plan: portal login succeeds; booking buttons disabled with tooltip | Core path |
| Playwright | Expired plan: web booking page shows soft paywall (no slot grid) | Core path |
| Playwright | Warning banner: shows ≤ 7 days before expiry; not shown > 7 days | Core path |
| Playwright | Expired banner: appears; cannot be dismissed | Core path |
| Playwright | Doctor limit: invite button disabled at limit; re-enabled after doctor removed | Core path |
