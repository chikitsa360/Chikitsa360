---
story: 12.3
epic: 12
title: New Event Modal — Step 1 (Event Details Form)
status: done
created: 2026-06-10
requirements:
  fr: [FR-1, FR-2]
  ux: [UX-4]
---

# Story 12.3: New Event Modal — Step 1 (Event Details Form)

## User Story

As a clinic staff member,
I want to click "New Event" and fill in a form with event details and optional recurrence configuration,
So that I can save a draft event or proceed to invite patients.

## Context

This is the UI for event creation. The modal is a 2-step stepper — this story builds Step 1 (Event Details). Step 2 (Invite Patients) is Epic 13 Story 13.1. The modal is a client component opened from the events list page (Story 12.4 creates the page shell; this story creates the modal component).

**UX reference:** `_bmad-output/planning-artifacts/ux-designs/ux-Cliniqly-2026-06-07/mockups/new-event.html`

## Acceptance Criteria

**Given** I am on any authenticated page
**When** I click "New Event" button (in the events list page header)
**Then** a modal overlay opens with a 2-step stepper header: "Step 1: Event Details" (active) | "Step 2: Invite Patients" (inactive)

**Given** Step 1 is active
**When** I view the form
**Then** I see these fields in order:
- Title (required, text input)
- Description (optional, textarea, 3 rows)
- Date (required, date picker)
- Start Time (required, time input)
- End Time (required, time input, must be after start time)
- Registration Deadline (optional, date+time picker)
- Venue (optional, text input)
- Meeting Link (optional, URL input)
- Max Seats (required, number input, 1–500)
- Fee (optional, ₹ prefix input — paise stored, display rupees)

**And** a "Recurrence" toggle section below the form fields:
- Toggle OFF by default
- When toggled ON: shows Daily / Weekly radio group; for Weekly, shows day-of-week picker (Mon–Sun chips); and an "Occurrences" number input (2–52)
- When recurrence is configured (weekly, Wednesday, 8 occurrences): a preview row shows "8 events · Wed weekly · 30 seats each"

**Given** I click "Save as Draft"
**When** the form is valid
**Then** `POST /api/v1/events` is called; on success, modal closes and the events list refreshes showing the new draft
**And** a success toast: "Event saved as draft"

**Given** I click "Next: Invite Patients"
**When** required fields are filled and valid
**Then** the stepper advances to Step 2 (implemented in Story 13.1); the event is NOT saved yet at this point (save happens on final step completion)

**Given** required fields are empty when clicking either action
**Then** inline validation errors appear below each invalid field; no API call is made

**Given** I close the modal (× button or Escape key)
**Then** the modal closes and any unsaved form state is discarded

## Technical Notes

### Component location
```
apps/web/src/components/events/NewEventModal.tsx   ← 'use client' — main modal
apps/web/src/components/events/EventDetailsForm.tsx ← form fields (used in both create and edit)
```

### State management
Use `useState` for form fields and `useState<'step1'|'step2'>` for stepper. Pass `onSuccess` callback prop to close modal and refresh parent.

### Recurrence preview
```tsx
{recurrenceEnabled && recurrenceType === 'weekly' && dayOfWeek && occurrences && (
  <p className="text-sm text-muted-foreground mt-2">
    {occurrences} events · {DAY_NAMES[dayOfWeek]} weekly · {maxSeats} seats each
  </p>
)}
```

### Fee input
Display in rupees (integer), store in paise (multiply by 100 before API call):
```tsx
const feePaise = feeRupees ? Math.round(parseFloat(feeRupees) * 100) : undefined
```

### Design tokens — never hardcode colors
Use `text-primary`, `bg-muted`, `border-border`, `rounded-[--radius]`. Use `cn()` from `@chikitsa360/core` for conditional classes.

### Modal pattern
Follow existing modal patterns in the codebase (e.g., `NewAppointmentModal.tsx`). Use a fixed overlay with `z-50`, centered card, max-w-lg.

### "Next" button behavior
When "Next: Invite Patients" is clicked, store form state in the modal's local state and advance the stepper. Do NOT call the API yet — the event is created only when the user completes Step 2 or explicitly clicks "Save as Draft".

## File Locations

```
apps/web/src/components/events/NewEventModal.tsx      ← CREATE
apps/web/src/components/events/EventDetailsForm.tsx   ← CREATE (reused in edit modal)
```

## Test Coverage Requirements

| Test type | What to cover |
|---|---|
| Unit (RTL) | Form renders all fields; recurrence toggle shows/hides recurrence fields; validation errors appear on submit with empty required fields |
| Unit | Fee conversion: 150 rupees → 15000 paise |
| Unit | Recurrence preview text renders correctly |
