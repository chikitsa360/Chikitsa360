---
story: 13.6
epic: 13
title: Registration Flow UI — Form, Waitlist, and Confirmation States
status: Not Started
created: 2026-06-10
requirements:
  fr: [FR-8, FR-9, FR-10, FR-11]
  ux: [UX-5]
---

# Story 13.6: Registration Flow UI — Form, Waitlist, and Confirmation States

## User Story

As a patient,
I want the registration page to show the right state (form → waitlist offer → confirmation) based on my registration outcome,
So that I always know what happened and what to do next.

## Context

This story adds the interactive registration form to the public page shell from Story 13.4. Three distinct UI states: State A (registration form), State B (seats full + waitlist offer), State C (confirmation). State transitions happen client-side based on API responses.

**UX reference:** `_bmad-output/planning-artifacts/ux-designs/ux-Cliniqly-2026-06-07/mockups/event-registration.html` — all 3 states shown.

## Acceptance Criteria

**Given** the event is published with seats available (State A)
**When** I view the page
**Then** I see a form with: Name (text, required), Phone (10-digit India mobile, required), and a "Register" button

**Given** I fill Name and Phone and click "Register"
**When** `POST /api/v1/events/[slug]/register` returns `{ status: 'registered', referenceNumber }`
**Then** page transitions to State C (Confirmation):
- "Registration Confirmed!" heading
- Reference number prominently displayed: "EVT-0002-023"
- Event name, date/time, venue
- "A WhatsApp confirmation will be sent to +91XXXXXXXX10"
- "Cancel Registration" link (token URL — stub text for now, token included after Epic 14 Story 14.1)

**Given** API returns `{ status: 'seats_full' }` (race condition: seats just ran out)
**Then** page transitions to State B (Seats Full):
- "Event is fully booked" heading
- "Join the waiting list" offer with position estimate shown
- "Join Waiting List" button (primary)
- "No thanks" link (returns to State A)

**Given** I click "Join Waiting List"
**When** POST called again with `{ joinWaitlist: true }` and returns `{ status: 'waitlisted', position: 4 }`
**Then** page shows confirmation: "You're #4 on the waiting list. We'll notify you if a seat opens."

**Given** API returns `{ code: 'ALREADY_REGISTERED', referenceNumber }`
**Then** inline error below the form: "You're already registered for this event. Reference: EVT-0002-023"

**Given** phone input has non-10-digit value or letters
**Then** inline validation error: "Enter a valid 10-digit Indian mobile number" (client-side, before API call)

**And** during API call, "Register" button shows loading state (disabled + spinner)

## Technical Notes

### Component location
`apps/web/src/app/(event-registration)/events/[slug]/page.tsx` — convert the relevant section to a client component or add a child client component `RegistrationForm.tsx`:
```
apps/web/src/components/event-registration/RegistrationForm.tsx  ← CREATE ('use client')
```

### State machine
```ts
type RegistrationState =
  | { step: 'form' }
  | { step: 'seats_full' }
  | { step: 'confirmed'; referenceNumber: string }
  | { step: 'waitlisted'; position: number }
```
Use `useState<RegistrationState>({ step: 'form' })`.

### Phone validation (client-side)
```ts
const isValidIndianPhone = (phone: string) => /^[6-9]\d{9}$/.test(phone)
```
Same pattern as existing booking page.

### Confirmation state — cancel link
```tsx
{/* Token link populated after Epic 14 delivers the token in the confirmation API response */}
<a href="#" className="text-sm text-muted-foreground underline">Cancel Registration</a>
```
Update to real token URL in Epic 14 Story 14.5.

### Design tokens
All colors via CSS tokens. State B (waitlist) uses violet tones: `bg-violet-50 text-violet-700` for the waitlist badge (check if these are available via brand tokens; if not, use Tailwind directly as a one-off — document it).

## File Locations

```
apps/web/src/components/event-registration/RegistrationForm.tsx   ← CREATE
apps/web/src/app/(event-registration)/events/[slug]/page.tsx      ← MODIFY: embed RegistrationForm
```

## Test Coverage Requirements

| Test type | What to cover |
|---|---|
| Unit (RTL) | Form shows for published event; transitions to confirmed on success response; transitions to seats_full on seats_full response |
| Unit | Phone validation rejects non-10-digit; accepts valid 10-digit starting with 6-9 |
| Unit | Already-registered shows inline error with reference number |
| Unit | Waitlist join: POST fires with joinWaitlist=true; waitlisted state shows position |
