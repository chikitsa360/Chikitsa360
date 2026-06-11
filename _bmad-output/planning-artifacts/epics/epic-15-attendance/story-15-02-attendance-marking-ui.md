---
story: 15.2
epic: 15
title: Attendance Marking UI
status: review
created: 2026-06-10
requirements:
  fr: [FR-22]
  ux: [UX-6]
---

# Story 15.2: Attendance Marking UI

## User Story

As a clinic staff member,
I want attendance action buttons in the Registrants tab after the event starts, with bulk marking support,
So that I can efficiently record who attended.

## Context

Updates `EventRegistrantsTab.tsx` (Story 13.7) to add attendance buttons and bulk selection. The buttons are disabled before event start_time, enabled after. The API for these actions is Story 15.1.

**UX reference:** `_bmad-output/planning-artifacts/ux-designs/ux-Cliniqly-2026-06-07/mockups/event-detail.html` — attendance banner + bulk action bar state.

## Acceptance Criteria

**Given** I am on the Registrants tab and the event has NOT started
**When** I view the table
**Then** "Mark Attended" and "No-Show" buttons are shown as disabled for each registered row
**And** a tooltip on hover: "Attendance marking available after event starts"

**Given** the event has started (start_time has passed)
**When** I view the table
**Then** rows with status='registered' show two buttons: "Mark Attended" (green outline) and "No-Show" (amber outline)
**And** rows with status='attended' show a green "Attended" badge (no buttons)
**And** rows with status='no_show' show an amber "No-Show" badge (no buttons)
**And** rows with status='cancelled' show a muted "Cancelled" badge (no buttons)

**Given** I click "Mark Attended" on a row
**When** the API call succeeds
**Then** the row status badge updates to "Attended" (green) without page reload; buttons disappear for that row

**Given** I check multiple row checkboxes
**When** checkboxes are checked
**Then** a bulk action bar appears at the top of the table: "[N] selected — [Mark All Attended] [Mark All No-Show]"
**And** bulk action calls the API for each selected registration sequentially (not in parallel — avoid DB contention)
**And** after all API calls, all affected rows update without page reload

**And** an "Attendance in Progress" banner shows when `event.start_time <= NOW() < event.end_time + 24h` (event active period)

## Technical Notes

### Client-side start_time check
```ts
const eventStarted = new Date(event.start_time).getTime() <= Date.now()
const eventActive = eventStarted && new Date(event.end_time).getTime() + 86400000 > Date.now()
```
Re-check every 60 seconds with `useEffect` + `setInterval` so buttons enable automatically without page reload.

### Optimistic update
After successful PATCH, update the local `registrations` state array:
```ts
setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, status: newStatus } : r))
```

### Bulk action sequential processing
```ts
for (const regId of selectedIds) {
  await markAttendance(regId, 'mark-attended')
}
// then clear selection
```

### Checkbox state
`useState<Set<string>>` for selected registration IDs. "Select all" checkbox selects all rows with status='registered'.

### Tooltip on disabled buttons
```tsx
<button disabled title="Attendance marking available after event starts" className="...disabled:opacity-50 disabled:cursor-not-allowed">
  Mark Attended
</button>
```

### Component to modify
`apps/web/src/components/events/EventRegistrantsTab.tsx` — add attendance buttons, checkbox column, bulk action bar.

## File Locations

```
apps/web/src/components/events/EventRegistrantsTab.tsx   ← MODIFY: add attendance buttons + bulk bar
```

## Test Coverage Requirements

| Test type | What to cover |
|---|---|
| Unit (RTL) | Buttons disabled when event not started; enabled when started |
| Unit | Bulk action bar appears when checkboxes checked; disappears when deselected |
| Unit | Row status updates optimistically after API success |
