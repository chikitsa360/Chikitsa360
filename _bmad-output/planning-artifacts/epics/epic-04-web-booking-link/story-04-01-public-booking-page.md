---
story: 4.1
epic: 4
title: Public Booking Page (Slot Browser & Patient Form)
status: review
baseline_commit: 4726811ba8737c9ef0947d6d2fd43d7eda09bca7
created: 2026-06-07
requirements:
  functional: [FR-7, FR-8, FR-9]
  nfr: [NFR-2, NFR-16, NFR-17, NFR-23]
  ux: [UX-DR29]
  monetisation: [MON-3]
---

# Story 4.1: Public Booking Page (Slot Browser & Patient Form)

## User Story

As a patient,
I want to open the clinic's booking link on my phone browser, browse available slots, and submit my details,
So that I can book an appointment without downloading an app or creating an account.

## Context

**Realised scenario:** UJ-2 (Ravi books via clinic's Instagram link on his phone during lunch).

**FR-7:** `cliniqly.com/book/{clinic-slug}` is live from Day 1. Slug auto-generated at signup; one-time editable.

**FR-8:** No OTP required at web booking for MVP (ASSUMPTION: friction reduction > phone verification at this stage; revisit if fake bookings appear at pilot review).

**Route architecture:** The booking page lives in `apps/web/src/app/(booking)/book/[slug]/page.tsx` — a separate Next.js route group with no auth middleware and no sidebar layout.

**Performance targets:**
- NFR-2: < 3 seconds on 4G (Lighthouse mobile simulation, India network profile)
- NFR-17: < 5 seconds on 3G (Lighthouse slow-3G)

## Acceptance Criteria

**Given** I open `cliniqly.com/book/{clinic-slug}` on a mobile browser (iOS Safari 16+ or Android Chrome latest),
**When** the page loads,
**Then** it renders in under 3 seconds on 4G (measured by Lighthouse mobile score — Performance ≥ 75 targeting).
**And** no login or account creation is required — the page is fully public.
**And** the Clinic Name, speciality, and address are visible in the page header.
**And** the clinic branding (name, logo if set, primary color) is prominent; "Powered by Cliniqly" appears only in the footer in 12px neutral text.

**Given** the booking page loads for a clinic with multiple doctors,
**When** the doctor selector renders,
**Then** a horizontal scrollable pill row (or Select dropdown on smaller screens) shows all Doctors' names.
**And** selecting a Doctor filters the slot grid to show only that Doctor's available slots.
**And** "All Doctors" is the default (shows combined availability).

**Given** the slot grid renders,
**When** I browse available slots,
**Then** slots are grouped by date with headers: "Today", "Tomorrow", "Wed, 11 Jun" etc.
**And** each date group shows a grid of time slot buttons: "10:00 AM", "10:20 AM" etc.
**And** only `available` slots are shown — booked and blocked slots are absent.
**And** slots span the next 7 days from today (FR-8).
**And** if no slots are available in the next 7 days, the page shows an empty state: "No appointments available right now. Please call us at {clinic phone}."

**Given** I tap a time slot button,
**When** the slot is selected,
**Then** the selected slot is highlighted (brand-primary border + background tint).
**And** a patient details form appears below (or slides up on mobile): Name (text input, required) + Mobile Number (10-digit numeric, required).
**And** the form inputs and "Confirm Appointment" button are all ≥ 44px touch targets (NFR-16).
**And** the mobile number input uses `inputmode="tel"` for the numeric keyboard on mobile.

**Given** I fill in my name and mobile number and tap "Confirm Appointment",
**When** the form submits,
**Then** a loading state is shown on the button ("Booking..." with spinner) — the button is not disabled (focus preserved).
**And** the system first checks: does this mobile number already exist in this Clinic's patient DB?
**And** if YES → existing Patient record is reused (no new record — FR-20).
**And** if NO → new Patient record is created (name, phone, booking_source = 'web').
**And** an Appointment is created: status `confirmed`, booking_source `web`, token_number = MAX(today's tokens) + 1.
**And** `scheduleConfirmation(appointmentId)` is called (Story 3.4's shared service → WhatsApp confirmation sent within 30 seconds).
**And** the page transitions to a success screen.

**Given** the slot I selected was taken by another patient between my page load and my form submission,
**When** the race condition is detected (slot locking via `SELECT FOR UPDATE SKIP LOCKED` fails),
**Then** the page shows an inline message: "Sorry, that slot was just taken. Please choose another time."
**And** the slot grid refreshes to show current availability.
**And** my name and mobile number fields remain filled in (not cleared).
**And** the "Confirm Appointment" button returns to its normal state.

**Given** I enter an invalid mobile number (less than 10 digits, non-numeric characters, starts with 0 or 1),
**When** form validation runs (on blur + on submit),
**Then** an inline error message shows below the field: "Please enter a valid 10-digit Indian mobile number."
**And** the form does not submit.

**Given** the success screen renders after a successful booking,
**When** I view it,
**Then** I see:
- "Appointment Confirmed!" heading (green checkmark icon)
- Token number: "Your token number is #7"
- Doctor: "Dr. {Name}"
- Date + Time: "{Day}, {Date} at {Time} IST"
- Clinic: "{Clinic Name}, {Address}"
- A note: "Your confirmation has been sent to +91 XXXXXX{last4 digits} via WhatsApp."
- A "Book Another Appointment" button that reloads the slot browser
- "Add to WhatsApp Contacts" CTA (links to `https://wa.me/{clinic_whatsapp_number}`)

**Given** the clinic's plan is expired (MON-3, soft paywall active),
**When** the booking page is visited,
**Then** the slot browser and form are NOT rendered.
**And** the page shows: "Online booking is temporarily unavailable. Please contact the clinic directly at {clinic phone}."
**And** no appointment can be created.

**Given** the page is rendered on a 360px viewport (smallest Android phones),
**When** the layout renders,
**Then** all elements fit within the viewport without horizontal scrolling.
**And** slot buttons are displayed in a grid (2–3 columns on mobile) with adequate spacing.

**Given** the page URL is shared on WhatsApp (as a link preview),
**When** WhatsApp fetches the Open Graph tags,
**Then** the preview shows: title `{Clinic Name} — Book an Appointment`, description `Book your appointment at {Clinic Name} in {City}. No app needed.`, and an OG image (clinic logo if available, or default Cliniqly branded image).

## UX Design Reference

**EXPERIENCE.md — Web Booking Link (UX-DR29):**

> Mobile-first (360px min-width), no login required.
> - Clinic header: name, speciality, address
> - Doctor selector (if multiple doctors)
> - Date selector (3 days visible; scroll/swipe for more)
> - Available time slots as button grid
> - Patient details form (name + 10-digit mobile, no OTP)
> - Confirm button
> - Post-confirm: success screen with booking summary and "Add to WhatsApp contacts" CTA
> - No Cliniqly branding beyond subtle footer ("Powered by Cliniqly")
> - Accessible: all slots keyboard reachable, form WCAG 2.1 AA

**DESIGN.md — Web Booking page specifics:**
- Background: `--color-surface` (light grey — not pure white, feels cleaner on mobile)
- Clinic header card: white, `--shadow-card`, `--radius-lg`, padding 20px
- Clinic name: 20px Plus Jakarta Sans semibold, brand-primary colour
- Date section header: 14px Inter semibold neutral-900, `border-bottom: 1px --color-border`
- Slot button: 64px wide, 44px height, `--radius-md`, border `--color-border`, font 14px Inter
  - Default: `bg-white border-neutral-200 text-neutral-900`
  - Selected: `bg-primary/10 border-primary text-primary font-semibold`
  - Hover: `bg-neutral-50`
- Patient form card: white, `--shadow-card`, margin-top 16px
- "Confirm Appointment" button: brand-primary fill, full-width, 52px height, `--radius-md`, 16px font

**EXPERIENCE.md — Accessibility:**
- All slot buttons are `<button>` elements (not `<div>`) — naturally keyboard focusable
- Tab order: date tabs → slot buttons (left to right, top to bottom) → form fields → submit
- Selected slot: `aria-pressed="true"` on the button
- Form errors: `aria-describedby` on input pointing to error message element
- Success screen: `aria-live="polite"` region for the confirmation details

## File Locations

```
apps/web/
  src/
    app/
      (booking)/
        book/
          [slug]/
            page.tsx                      ← Main booking page (Server Component: fetch clinic info)
            BookingClient.tsx             ← Client Component: slot browser + form + success screen
        layout.tsx                        ← Booking layout (no sidebar, no header — public)
    components/
      booking/
        SlotGrid.tsx                      ← Date-grouped slot button grid
        DoctorSelector.tsx                ← Doctor filter pills/dropdown
        PatientForm.tsx                   ← Name + phone form
        BookingSuccess.tsx                ← Success screen with confirmation details
    api/
      v1/
        clinics/
          by-slug/
            [slug]/
              route.ts                    ← GET: public clinic info by slug
        booking/
          route.ts                        ← POST: create web booking (appointment + patient)
        slots/
          available/
            route.ts                      ← GET: available slots for clinic/doctor/date range
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | Slot grid grouping by date (today/tomorrow/future dates) | 100% |
| Unit | Mobile number validation (10-digit Indian, invalid formats) | 100% |
| Unit | Soft paywall check (plan expired → no booking) | 100% |
| Integration | Web booking: new patient created + appointment created + confirmation scheduled | 100% |
| Integration | Web booking: existing patient matched (no duplicate) | 100% |
| Integration | Slot race condition on web booking | 100% |
| Playwright (E2E) | UJ-2: open link → select doctor → select slot → fill form → confirm → success screen | Full UJ |
| Playwright | Slot taken race: fill form → submit → "just taken" message → grid refreshes | Core path |
| Playwright | 360px viewport: no horizontal scroll; slot grid readable; form usable | Mobile UJ |
| Lighthouse | Performance score ≥ 75 on mobile (4G simulation) | Must pass in CI |

## Performance Notes

- Clinic info (name, address, slug, doctors) fetched server-side in the Next.js page (RSC) — included in initial HTML for fast LCP
- Available slots fetched client-side with React Query after hydration (dynamic data, not in initial HTML)
- `next/font` loads Plus Jakarta Sans for clinic name heading — no FOUT
- Images (clinic logo if present) use `next/image` with explicit width/height — no layout shift
- The booking page has NO sidebar, NO auth checks, NO heavy dashboard JS — bundle should be significantly smaller than dashboard pages
