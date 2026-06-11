---
story: 13.1
epic: 13
title: New Event Modal — Step 2 (Invite Patients)
status: done
created: 2026-06-10
requirements:
  fr: [FR-6]
  ux: [UX-4]
---

# Story 13.1: New Event Modal — Step 2 (Invite Patients)

## User Story

As a clinic staff member,
I want Step 2 of the New Event modal to let me search and select patients to invite,
So that I can target the right patients before sending the event invitation blast.

## Context

Step 2 builds on the modal stepper from Story 12.3. At this point, the event may or may not have been saved yet (depends on whether the user clicked "Save as Draft" in Step 1 or went directly to Step 2 via "Next: Invite Patients"). The modal should save the event via POST /api/v1/events on transition to Step 2 if not already saved, then show the patient selector.

Reuses the existing patient search API: `GET /api/v1/patients/search?q=` (implemented in Epic 06).

## Acceptance Criteria

**Given** I am on Step 2 of the New Event modal
**When** the step loads
**Then** I see a search input: "Search by name or phone..."
**And** a "Selected" list (initially empty) showing a count: "0 patients selected"
**And** two action buttons at the bottom: "Skip for now" (secondary) and "Send Invitations & Publish" (primary)

**Given** I type 3+ characters in the search input
**When** the search fires (debounced 300ms)
**Then** a results dropdown shows matching patients: name, phone (last 4 masked), last visit date
**And** each result has a checkbox; already-selected patients show a checkmark

**Given** I click a patient in results
**Then** they are added to the "Selected" list below the search
**And** the counter updates: "N patients selected"
**And** clicking the patient again (or × in the selected list) removes them

**Given** I click "Send Invitations & Publish"
**When** at least 1 patient is selected
**Then** calls `POST /api/v1/events/[eventId]/invite` with selected patientIds (Story 13.2)
**And** event is published (PATCH with `{ action: 'publish' }`) — done in the same API call or sequentially
**And** modal closes; success toast: "Invitations queued for N patients. Event published."
**And** events list refreshes

**Given** I click "Skip for now"
**Then** modal closes without sending invitations; event remains as draft (or published if already published)
**And** no API calls for invitations are made

**Given** "Send Invitations & Publish" is clicked with 0 patients selected
**Then** inline error: "Select at least one patient to send invitations"

## Technical Notes

### Component location
Extend `NewEventModal.tsx` with a `Step2InvitePatients` sub-component or add the step content inline.

### Patient search reuse
```ts
// Reuse existing API — no new endpoint needed
const res = await fetch(`/api/v1/patients/search?q=${encodeURIComponent(query)}&clinicId=${clinicId}`)
```
Note: the existing search API requires auth (cookie sent automatically from the modal's browser context).

### Debounce
Use a 300ms debounce on the search input to avoid hammering the API:
```ts
const debouncedQuery = useDebounce(searchValue, 300)
useEffect(() => { if (debouncedQuery.length >= 3) fetchPatients(debouncedQuery) }, [debouncedQuery])
```
Add `useDebounce` hook to `apps/web/src/lib/hooks/useDebounce.ts` if not already present.

### Selected patients state
`useState<Patient[]>` — patients array with `id`, `name`, `phone`. Render as chips with × button.

### Event save + publish flow on "Send Invitations & Publish"
```ts
// 1. If event not yet created (user came to step 2 without saving draft):
//    POST /api/v1/events → get eventId
// 2. POST /api/v1/events/[eventId]/invite with { patientIds }
// 3. PATCH /api/v1/events/[eventId] with { action: 'publish' }
// 4. Close modal + refresh
```

## File Locations

```
apps/web/src/components/events/NewEventModal.tsx   ← MODIFY: add Step 2 content
apps/web/src/lib/hooks/useDebounce.ts              ← CREATE if not exists
```

## Test Coverage Requirements

| Test type | What to cover |
|---|---|
| Unit (RTL) | Search results appear after 3 chars; patient added to selected list on click; removed on × click |
| Unit | "Skip for now" calls no invite API; "Send" with 0 selected shows error |
