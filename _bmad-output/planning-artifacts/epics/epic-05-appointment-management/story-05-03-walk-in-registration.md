---
story: 5.3
epic: 5
title: Walk-In Registration
status: Not Started
created: 2026-06-07
requirements:
  functional: [FR-11, FR-15]
  nfr: [NFR-16]
  ux: [UX-DR15, UX-DR35, UX-DR44]
---

# Story 5.3: Walk-In Registration

## User Story

As a Receptionist,
I want to register a walk-in patient in under 60 seconds — entering their name and phone, picking a slot, and printing their token number —
So that patients who arrive without a prior booking are seen quickly without creating a bottleneck at the front desk.

## Context

**FR-11:** Receptionist enters name + phone, selects doctor, assigns next available slot or specific slot. Walk-in booking source recorded for analytics. "Walk-in (overflow)" source if overriding fully booked day. Override allowed with warning. WhatsApp confirmation sent after registration.

**FR-15:** Double-booking enforcement applies — walk-in cannot silently take a booked slot. Overflow override (fully-booked day) requires a prominent warning + explicit confirmation click.

**Difference from Story 5.2 (Manual):** Walk-in is optimised for speed — a one-tap "Next Available Slot" button assigns the next free slot without the Receptionist having to browse the grid. The walk-in path also specifically supports overflow scenarios with an explicit warning, which the manual appointment path does not.

**Token prominence:** Token number is the primary output of walk-in registration — receptionists verbally communicate it to patients. Token display must be large and clearly visible (UX-DR35).

## Acceptance Criteria

**Given** a Receptionist clicks "Walk-In" (dedicated button in the Appointments page header, distinct from "+ New Appointment"),
**When** the Walk-In panel opens,
**Then** focus lands on the Phone Number field.
**And** the panel title is "Walk-In Registration".
**And** a progress indicator shows: Step 1 of 2 — Patient | Step 2 — Slot.

**Given** the Receptionist enters the patient's phone number (10 digits),
**When** the lookup runs,
**Then** if the patient EXISTS → name auto-fills (same as Story 5.2 patient lookup — FR-20 de-duplication applies).
**And** if NEW → name field is editable; "New patient" helper text shows.
**And** after name is confirmed, the Receptionist taps "Next →" to proceed to slot selection.

**Given** the Receptionist reaches Step 2 (slot selection),
**When** the slot view renders,
**Then** a prominent "Assign Next Available Slot" button is shown at the top (brand-primary, full-width).
**And** below it, the full slot grid is also available for manual selection (date-grouped, today first).
**And** If a Doctor selector is needed (multi-doctor clinic), it appears above the "Next Available" button (defaults to first/only doctor).

**Given** the Receptionist taps "Assign Next Available Slot",
**When** the system computes the next available slot,
**Then** it finds the earliest `available` slot for the selected doctor from the current time onwards (today only).
**And** the slot is highlighted in the grid: "10:40 AM — auto-selected".
**And** a confirmation row shows: "Walk-In slot: {Doctor} at {Time} today".
**And** a "Confirm Walk-In" button becomes active.

**Given** the Receptionist confirms the walk-in,
**When** the `POST /api/v1/appointments` runs,
**Then** `booking_source = 'walk-in'` is set on the appointment.
**And** `SELECT ... FOR UPDATE SKIP LOCKED` prevents double-booking (same as all other sources).
**And** token is assigned: `MAX(today's tokens for clinic) + 1` in the same transaction.
**And** `scheduleConfirmation(appointmentId)` is called → WhatsApp confirmation sent within 30 seconds.
**And** Pusher `appointment.created` event published.
**And** the panel closes and shows the Token Success Screen.

**Given** the Token Success Screen renders,
**When** a walk-in is confirmed,
**Then** it is a full-panel overlay (not a toast) showing:
- Token number: "#7" in 72px bold brand-primary — the single most prominent element (UX-DR35)
- Patient name: below token in 18px semibold
- Doctor + Time: in 16px neutral-700
- A "Register Another Walk-In" button (brand-outline, resets the panel to Step 1)
- A "Done" button (closes the panel entirely)
**And** the token number is announced via `aria-live="assertive"` for screen readers.

**Given** today's schedule for the selected doctor is fully booked (no available slots),
**When** the Receptionist taps "Assign Next Available Slot",
**Then** the system detects no available slots for today.
**And** an amber warning banner appears (UX-DR44): "Today is fully booked for Dr. {Doctor}. Walk-in overflow will override a booked slot — the affected patient will NOT be notified automatically."
**And** two action buttons appear: "Override Anyway" (amber-filled) and "Cancel" (ghost).
**And** the Receptionist must explicitly tap "Override Anyway" to proceed.

**Given** the Receptionist taps "Override Anyway",
**When** the appointment is created in overflow mode,
**Then** `booking_source = 'walk-in-overflow'` is set on the appointment.
**And** the overridden slot is recorded: if a slot was previously blocked (not booked), it's unblocked. If the slot was genuinely booked, the walk-in appointment is created alongside it (two appointments on same slot — analytics flag only; no automatic notification to the displaced patient).
**And** the Token Success Screen shows an additional amber note: "Overflow booking — please inform the affected patient manually."
**And** the audit log records: `{ action: 'walk-in-overflow', actorId, clinicId, appointmentId, timestamp }`.

**Given** the walk-in patient has opted out of WhatsApp (`whatsapp_opt_out_at IS NOT NULL`),
**When** `scheduleConfirmation()` runs,
**Then** the WhatsApp message is NOT sent; SMS fallback via MSG91 is attempted directly (same logic as Story 3.4).

**Given** the walk-in registration panel is on a mobile device used by the Receptionist at the desk,
**When** the layout renders on a 375px viewport,
**Then** all touch targets are ≥ 44px (NFR-16).
**And** the token number on the success screen is ≥ 64px to be readable across the desk.
**And** "Register Another Walk-In" button is at the bottom within thumb reach.

## UX Design Reference

**EXPERIENCE.md — Walk-in registration flow (UX-DR15):**
> Optimised for desk reception scenarios. Two-step panel:
> - Step 1: Phone (lookup) + Name confirmation — single focused action
> - Step 2: Doctor (if multi-doctor) + "Next Available" one-tap + grid fallback
>
> Success screen is a full-panel overlay (not a small toast) because the token must be communicated to the patient standing at the desk. Token is the primary content of the success screen.

**DESIGN.md — Walk-in specifics:**
- Walk-In button: amber-tinted fill (`--color-warning`) to distinguish from blue "+ New Appointment"
- Step indicator: 14px Inter, neutral-500, pill tabs (1 Patient | 2 Slot), active = brand-primary underline
- "Assign Next Available" button: 52px height, brand-primary fill, full-width
- Success overlay: white card, centered, shadow-xl; token `72px Plus Jakarta Sans 700 --color-primary`
- Overflow warning banner: `bg-amber-50 border-amber-200` left-bordered (4px amber), icon = `⚠` amber-600

**EXPERIENCE.md — Overflow warning (UX-DR44):**
> Overflow must not be easy to trigger accidentally. The warning banner blocks the "confirm" action; the CTA is "Override Anyway" in amber (not red — this is a soft override, not a destructive action). The Receptionist must read the consequence text before the button is reachable.

**EXPERIENCE.md — Token display (UX-DR35):**
> Token # on success screen: 72px bold, brand-primary, centred. Designed to be visible from 1–2 metres (across a reception desk). Do not auto-dismiss — Receptionist must explicitly tap "Done" or "Register Another".

## File Locations

```
apps/web/
  src/
    app/
      api/
        v1/
          slots/
            next-available/
              route.ts                    ← GET: next available slot for doctor + clinicId + from-time
    components/
      appointments/
        WalkInPanel.tsx                   ← Panel shell with 2-step progress
        WalkInPatientStep.tsx             ← Step 1: Phone + Name
        WalkInSlotStep.tsx                ← Step 2: Next Available + SlotGrid
        WalkInSuccessScreen.tsx           ← Token success overlay
        OverflowWarningBanner.tsx         ← Amber warning with "Override Anyway" CTA
    hooks/
      useNextAvailableSlot.ts             ← React Query: GET /api/v1/slots/next-available
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | Next-available slot computation: returns first available slot from current time | 100% |
| Unit | Next-available when fully booked: returns null → overflow trigger | 100% |
| Unit | booking_source correctly set: 'walk-in' vs 'walk-in-overflow' | 100% |
| Integration | Walk-in: new patient created + appointment + confirmation scheduled | 100% |
| Integration | Walk-in: existing patient matched (FR-20 de-duplication) | 100% |
| Integration | Overflow booking created with booking_source='walk-in-overflow' | 100% |
| Integration | Audit log entry created on overflow booking | 100% |
| Playwright (E2E) | Walk-in flow: phone → name → next available → confirm → token success screen | Core path |
| Playwright | Overflow: fully booked → warning banner appears → "Override Anyway" → token shown with overflow note | Core path |
| Playwright | Mobile (375px): token number visible; all touch targets ≥ 44px | Mobile UJ |
