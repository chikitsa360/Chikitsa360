---
story: 2.4
epic: 2
title: Wizard Completion & Sample Appointment
status: Not Started
created: 2026-06-07
requirements:
  functional: [FR-36, FR-37]
  nfr: [NFR-23, NFR-37]
  ux: [UX-DR28]
---

# Story 2.4: Wizard Completion & Sample Appointment

## User Story

As a Clinic Owner,
I want the onboarding wizard to conclude with a sample appointment in my calendar and a clear path to my Dashboard,
So that I can see how the platform works before my first real patient books.

## Context

**FR-37:** On wizard completion, auto-create one sample appointment:
- Patient name: "Sample Patient"
- Status: `confirmed`
- Visual "Sample" label badge
- No WhatsApp/SMS triggered
- Deletable by Owner at any time

**FR-36 (completion states):**
- Wizard completed (Steps 1–3 done + Step 4 done or skipped) → redirect to Dashboard
- 'WhatsApp pending' state (Step 4 skipped) → persistent banner on every page
- Partial completion (only Step 1) → wizard resumes at furthest incomplete step on return

**Wizard re-entry prevention:** Once `onboarding_complete = true`, visiting `/onboarding` redirects to `/dashboard`.

## Acceptance Criteria

**Given** I have completed Steps 1–3 of the wizard (minimum: clinic profile + at least 1 doctor + working hours),
**When** I arrive at the wizard completion screen (after Step 4 or by completing Step 3 and clicking "Finish Setup" without WhatsApp),
**Then** the system automatically creates a sample appointment with:
- `patient.name = "Sample Patient"`, `patient.phone = "0000000000"` (placeholder, not a real patient)
- `doctor_id` = first configured Doctor
- `slot` = tomorrow at the first computed available slot from working hours
- `status = "confirmed"`
- `booking_source = "sample"`
- `is_sample = true` flag (separate DB column — used to filter from analytics, reminders, billing)
**And** no WhatsApp message is sent; no SMS is sent; no Inngest reminder job is scheduled for this appointment.

**Given** the sample appointment is created,
**When** the completion screen renders,
**Then** I see:
- A success illustration or icon (clinic building or calendar check)
- Heading: "Your clinic is ready!" (English) / "Aapka clinic tayaar hai!" (Hindi)
- Booking link highlighted: `cliniqly.com/book/{slug}` with a "Copy Link" button
- A "Share on WhatsApp" button (pre-fills "Book at our clinic: {link}" as a WhatsApp message)
- A "Go to Dashboard" primary button

**Given** I click "Go to Dashboard",
**When** I am redirected to `/dashboard`,
**Then** the Clinic's `onboarding_complete` flag is set to `true` in the DB.
**And** the sample appointment is visible in the calendar as a "Sample" labelled block (with a distinct visual indicator — e.g. dashed border or "Sample" text badge).
**And** the sample appointment does NOT appear in revenue calculations, no-show counts, or analytics.

**Given** I return to `/onboarding` after `onboarding_complete = true`,
**When** the route resolves,
**Then** I am immediately redirected to `/dashboard` — the wizard is never shown again.

**Given** I am a Doctor or Receptionist logging in for the first time,
**When** my session is created and my clinic's onboarding is already complete,
**Then** I am redirected directly to `/dashboard` — never to `/onboarding` (the wizard is Owner-only).

**Given** I am on the Dashboard and the sample appointment is visible,
**When** I click the sample appointment to open its detail,
**Then** I see a "Delete sample appointment" button (not "Cancel" — sample appointments are deleted, not cancelled).
**And** clicking it shows a confirmation: "Delete this sample appointment? This cannot be undone."
**And** on confirm, the appointment is permanently deleted (hard delete, not soft delete — no audit log entry needed for sample data).

**Given** `onboarding_complete = true` but `whatsapp_connected = false`,
**When** I view any portal page (Dashboard, Appointments, Patients, Reports, Settings),
**Then** a persistent amber/yellow banner is visible directly below the global header: "Complete your WhatsApp setup to enable patient bookings and reminders. [Connect WhatsApp →]"
**And** the banner link navigates to `/settings/whatsapp`.
**And** the banner cannot be dismissed — it persists until WhatsApp is connected.
**And** the banner does NOT appear once `whatsapp_connected = true`.

**Given** I complete the wizard with WhatsApp connected (Step 4 not skipped),
**When** I reach the completion screen,
**Then** no persistent WhatsApp pending banner appears anywhere in the portal.

**Given** I partially completed the wizard (e.g. only Step 1 + Step 2 done) and navigate away,
**When** I return to `/onboarding` later,
**Then** I am routed to `/onboarding/step-3` (the first incomplete step).
**And** the progress bar shows Steps 1–2 as complete (green checkmarks) and Step 3 as active.
**And** all data entered in Steps 1–2 is preserved.

## UX Design Reference

**EXPERIENCE.md — Onboarding completion screen:**
- Full-page layout (same as wizard, no sidebar yet — sidebar is shown after Dashboard redirect)
- Center-aligned content within a card
- Illustration: Simple SVG of a clinic or calendar with a check mark (brand-primary colours)
- Clinic name shown prominently: "ABC Dental Clinic is ready!"
- Booking link: monospace/code-styled text in a bordered box, "Copy" button copies to clipboard with "Copied!" feedback
- "Share on WhatsApp" button: WhatsApp green (#25D366), WhatsApp icon + "Share booking link"
- "Go to Dashboard" button: brand-primary, large (48px height), full-width or centered 320px max

**DESIGN.md — Sample appointment in calendar (from AppointmentBlock):**
- Same AppointmentBlock component as real appointments
- Visual differentiator: dashed/dotted left border (instead of solid), "SAMPLE" text badge in neutral-400 inside the block
- Status badge: "Sample" (neutral pill, not the standard status colours)
- Not clickable in the same way as real appointments — shows a simplified detail panel with only "Delete" option

**EXPERIENCE.md — WhatsApp pending banner:**
- Height: 44px, full-width, position: sticky below global header (above page content)
- Background: `--color-warning/15` (amber-tint)
- Left: amber ⚠ icon + "Complete your WhatsApp setup to enable patient bookings."
- Right: "Connect WhatsApp →" link in brand-primary (underlined)
- z-index: above page content, below modals/toasts
- No ✕ dismiss button — permanent until resolved

**EXPERIENCE.md — Wizard progress bar (final state after completion):**
- All 4 steps show green checkmarks on the completion screen
- Transition: animate each step to "complete" state sequentially (200ms each) for a satisfying completion effect

## File Locations

```
apps/web/
  src/
    app/
      (dashboard)/
        onboarding/
          complete/
            page.tsx                      ← Wizard completion screen
        dashboard/
          page.tsx                        ← Updated to show sample appointment (Epic 8)
    components/
      onboarding/
        WizardComplete.tsx                ← Completion screen component
        BookingLinkShare.tsx              ← Booking link display + copy + WhatsApp share
      layout/
        WhatsAppPendingBanner.tsx         ← Already created in Story 2.3
    api/
      v1/
        clinics/
          complete-onboarding/
            route.ts                      ← POST (set onboarding_complete, create sample appt)
        appointments/
          [id]/
            route.ts                      ← DELETE (used for sample appointment deletion)
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | Sample appointment creation: correct doctor, tomorrow's first slot, is_sample = true | 100% |
| Unit | Sample appointment excluded from: revenue total, no-show count, reminder scheduling | 100% |
| Integration | `onboarding_complete` → `/onboarding` redirects to `/dashboard` | 100% |
| Integration | Doctor/Receptionist first login → `/dashboard` not `/onboarding` | 100% |
| Integration | Sample appointment hard-delete: no audit log entry, no soft-delete record | 100% |
| Playwright (E2E) | Full wizard completion: Step 1 → 2 → 3 → 4 (skip) → completion screen → Dashboard | Full UJ |
| Playwright | WhatsApp pending banner: visible after skip; absent after connect | Core path |
| Playwright | Partial completion: navigate away → return → correct step resumed | Core path |

## Notes

- `is_sample` column on `appointments` table: boolean, default false. Filter `is_sample = false` in ALL queries for: dashboard counts, revenue, no-show reports, reminders scheduling, analytics.
- Sample patient record: use a dedicated placeholder patient (`phone = "0000000000"`) rather than creating a real Patient record that could affect analytics. Mark `is_placeholder = true` on the patients table.
- The "Share on WhatsApp" button uses the WhatsApp URL scheme: `https://wa.me/?text=Book%20at%20our%20clinic%3A%20{encodedLink}` — opens WhatsApp on mobile, WhatsApp Web on desktop.
- Copy to clipboard: use the Clipboard API with a fallback for older browsers; show "Copied! ✓" toast for 2 seconds.
