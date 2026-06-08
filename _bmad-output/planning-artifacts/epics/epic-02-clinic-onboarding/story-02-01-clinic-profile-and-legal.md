---
story: 2.1
epic: 2
title: Clinic Profile Setup & Legal Acceptance
status: review
created: 2026-06-07
baseline_commit: d8174b3
requirements:
  functional: [FR-36]
  compliance: [CR-6, CR-7]
  nfr: [NFR-23, NFR-25]
  ux: [UX-DR28]
---

# Story 2.1: Clinic Profile Setup & Legal Acceptance

## User Story

As a Clinic Owner,
I want to enter my clinic's details and accept the platform's legal terms,
So that my clinic is registered on the platform and I've given proper consent before any patient data is collected.

## Context

This is Step 1 of the 4-step onboarding wizard. It establishes the Clinic record and captures the legal acceptances required by:
- **CR-6:** Privacy Policy and ToS must be accessible before any data is collected
- **CR-7:** Grievance Officer must be named in the Privacy Policy (30-day response commitment)
- **DPDP Act 2023:** Clinic Owner must explicitly accept the Data Processing Agreement as Data Fiduciary

The wizard is page-level (not a modal) — full-page experience at `/onboarding`. Each step is independently saveable (partial wizard completion doesn't block portal access — FR-36).

**Wizard URL structure:**
- `/onboarding` → auto-routes to first incomplete step
- `/onboarding/step-1` → Clinic Details
- `/onboarding/step-2` → Add Doctor
- `/onboarding/step-3` → Working Hours
- `/onboarding/step-4` → WhatsApp Setup

**Redirect logic (from Story 1.4):**
- New Owner (no Clinic record) → `/onboarding/step-1`
- Partially complete → `/onboarding` → redirects to first incomplete step
- Fully complete → `/dashboard`

## Acceptance Criteria

**Given** I am a new Clinic Owner who just completed OTP login for the first time,
**When** my session is created,
**Then** I am redirected to `/onboarding` which resolves to `/onboarding/step-1`.
**And** the page shows a 4-step progress bar at the top with labels: "Clinic Details", "Add Doctor", "Working Hours", "WhatsApp Setup".
**And** Step 1 is shown as active (current); Steps 2–4 are shown as upcoming.

**Given** I am on `/onboarding/step-1`,
**When** the form renders,
**Then** I can fill in the following fields:
- **Clinic Name** (text input, required, max 100 chars)
- **Address Line** (text input, required, max 200 chars)
- **City** (text input, required, max 50 chars)
- **Speciality** (Select dropdown, required): General Medicine / Dermatology / Dentistry / Orthopaedics / Gynaecology / Paediatrics / Ophthalmology / ENT / Other
- **Clinic Phone Number** (text input, optional, Indian format 10 digits)
- **Booking URL Slug** (text input, pre-filled with auto-generated value from Clinic Name, editable — one-time only)
**And** the Booking URL Slug field shows a preview: `cliniqly.com/book/{slug}` below the input (UX-DR28).

**Given** I type into the Clinic Name field,
**When** the name changes and the slug field has not been manually edited,
**Then** the slug auto-updates to a URL-safe version of the clinic name (lowercase, spaces → hyphens, special chars stripped, e.g. "ABC Dental Clinic" → "abc-dental-clinic").

**Given** I manually edit the Clinic URL Slug field,
**When** I save the form,
**Then** the slug is locked permanently; the slug field is shown as read-only thereafter (with a note: "Slug cannot be changed after first save").
**And** if the slug is already taken, a validation error shows: "This URL is taken. Try: {suggestion}" with an available alternative.

**Given** I scroll below the form fields,
**When** the legal acceptance section renders,
**Then** I see three separate checkboxes (each must be individually checked — not a single "accept all"):
1. "I have read and accept the [Terms of Service](link)" — link opens in new tab
2. "I have read and accept the [Privacy Policy](link)" — link opens in new tab
3. "I accept the [Data Processing Agreement](link) as a Data Fiduciary under the DPDP Act 2023" — link opens in new tab
**And** the "Save & Continue" button is disabled until all three boxes are checked.

**Given** all required fields are filled and all three legal boxes are checked,
**When** I click "Save & Continue",
**Then** the Clinic record is created/updated in the DB with all entered details.
**And** the following timestamps are recorded on the Clinic record: `tos_accepted_at`, `privacy_accepted_at`, `dpa_accepted_at` — all set to the current UTC timestamp.
**And** I am redirected to `/onboarding/step-2`.

**Given** I complete Step 1 but close the browser before finishing later steps,
**When** I log in again and navigate to `/onboarding`,
**Then** I am routed to `/onboarding/step-2` (the next incomplete step).
**And** Step 1 shows a green checkmark in the progress bar.
**And** my previously entered Clinic Name, Address, Speciality etc. are pre-filled.

**Given** I navigate to Settings → Clinic Profile after the wizard is complete,
**When** the settings page renders,
**Then** I see all clinic profile fields editable: Clinic Name, Address, City, Speciality, Phone Number.
**And** the Slug field is read-only (already set during onboarding) with a note: "Contact support to change your booking URL."
**And** clicking "Save Changes" updates the clinic record and shows a success toast: "Clinic profile updated."

**Given** the form has a validation error (e.g. required field left blank),
**When** I attempt to submit,
**Then** the error is shown inline below the relevant field (red border + error text via the `Input` component's error state).
**And** the form does not submit and focus moves to the first error field.

**Given** all wizard copy renders,
**When** I switch language to Hindi,
**Then** all step titles, field labels, placeholder text, legal checkbox text, and button labels appear in Hinglish via next-intl.

## UX Design Reference

**EXPERIENCE.md — Onboarding Wizard (UX-DR28):**
- Full-page layout: centered max-width 640px card on a light grey background
- Progress bar: horizontal stepper at top, 4 steps with labels; active = brand-primary filled circle, complete = green check, upcoming = grey circle
- Each step: heading (24px Plus Jakarta Sans), subheading description (14px Inter, neutral-600), form fields, "Save & Continue" primary button + "Save for later" ghost button
- Legal section: visually separated with a thin divider; grey background card `--color-surface`; checkbox text in 14px with inline hyperlinks in brand-primary

**DESIGN.md — Form patterns:**
- Input fields: 44px height, `--radius-md`, full-width within card
- Select dropdown: searchable, 44px height, same styling as Input
- Required field indicator: red asterisk (*) after label
- Error state: `--color-error` border + error message below in 12px red text

**DESIGN.md — Progress bar:**
- Step indicator: 32px circles, numbered (1–4); active: `bg-primary text-white`; complete: `bg-success text-white` with checkmark icon; upcoming: `bg-neutral-200 text-neutral-500`
- Connecting lines between circles: complete = `bg-success`, upcoming = `bg-neutral-200`

**EXPERIENCE.md — Voice & Tone (wizard):**
- Heading: "Let's set up your clinic" (welcoming, not formal)
- Legal section intro: "Before we start, please review and accept these agreements. They protect both you and your patients."
- Button: "Save & Continue" (not "Next" or "Submit")
- Save for later: "I'll finish this later" (casual, supportive)

## File Locations

```
apps/web/
  src/
    app/
      (dashboard)/
        onboarding/
          page.tsx                    ← Redirects to first incomplete step
          step-1/
            page.tsx                  ← Clinic profile + legal acceptance
          step-2/
            page.tsx                  ← Add doctor (Story 2.2)
          step-3/
            page.tsx                  ← Working hours (Story 2.2)
          step-4/
            page.tsx                  ← WhatsApp setup (Story 2.3)
          layout.tsx                  ← Onboarding layout (progress bar, no sidebar)
        settings/
          clinic/
            page.tsx                  ← Settings → Clinic Profile (editable post-wizard)
      api/
        v1/
          clinics/
            route.ts                  ← POST (create/update clinic) + GET (current clinic)
            slug/
              check/
                route.ts              ← GET slug availability check
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | Slug generation from clinic name (spaces, special chars, Devanagari) | 100% of edge cases |
| Unit | Slug uniqueness check | Core paths |
| Integration | Clinic creation with legal timestamps; verify `tos_accepted_at` set | 100% |
| Integration | Slug taken → validation error with suggestion | 100% |
| Integration | Partial wizard: only Step 1 complete → resume at Step 2 | 100% |
| Playwright (E2E) | Full Step 1 flow: fill form → accept legal → advance to Step 2 | Full UJ path |
| Playwright | Legal checkboxes: button disabled until all 3 checked | 100% |

## Compliance Notes

- **CR-6:** Links to ToS and Privacy Policy must be visible and functional before the user submits any data. The legal checkboxes appear on the same page as the first data collection form (Clinic Name, Address etc.)
- **CR-7:** Privacy Policy document must name the Grievance Officer with contact details and a 30-day response commitment. This is a legal document concern (not code), but the link from the wizard must point to the correct document.
- **DPDP Act 2023:** Explicit, separate consent for the Data Processing Agreement as Data Fiduciary is mandatory. The three-checkbox approach (not a single "accept all") provides clearer consent records per requirement.
- Legal timestamps are stored in UTC on the Clinic record and included in the audit log entry for clinic creation.
