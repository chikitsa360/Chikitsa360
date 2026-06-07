---
story: 5.4
epic: 5
title: Appointment Modification, Cancellation & Slot Blocking
status: Not Started
created: 2026-06-07
requirements:
  functional: [FR-12, FR-16]
  nfr: [NFR-10]
  ux: [UX-DR18, UX-DR20, UX-DR22]
  compliance: [CR-12]
---

# Story 5.4: Appointment Modification, Cancellation & Slot Blocking

## User Story

As a Receptionist,
I want to reschedule or cancel any appointment from the calendar, mark appointments complete or no-show, and block slots for unavailable periods —
So that the clinic's schedule always reflects reality and patients receive timely notifications when their appointment changes.

## Context

**FR-12:** Receptionist or Owner can reschedule (new slot → resend WhatsApp confirmation) or cancel (status `cancelled` → WhatsApp cancellation sent). All modifications logged with timestamp + actor role. Log in Settings → Activity Log (read-only, immutable).

**FR-16:** Receptionist or Owner marks individual slots or time ranges as blocked. Blocked slots hidden from WhatsApp flow and Web Booking Link. Blocked slots shown as greyed-out in calendar. Blocking supports single occurrence or recurring (daily/weekly).

**CR-12:** All appointment state changes written to the audit log synchronously in the same DB transaction. Audit log is INSERT-only from the application layer.

**Drag-to-reschedule (UX-DR20):** Desktop only — `@dnd-kit/core` pointer sensor. Dragging an appointment card to a new slot opens a confirmation dialog before committing.

## Acceptance Criteria

### Reschedule

**Given** a Receptionist opens the Appointment Detail Panel (Story 5.1) and clicks "Reschedule",
**When** the reschedule action is initiated,
**Then** the slot grid opens within the same panel (or a sub-panel) showing available slots for the same doctor.
**And** the currently booked slot is marked "Current" and greyed out (cannot re-select the same slot).
**And** the date defaults to the appointment's current date; the Receptionist can navigate to other dates.

**Given** the Receptionist selects a new slot and clicks "Confirm Reschedule",
**When** the reschedule runs,
**Then** a confirmation dialog appears: "Reschedule to {Day}, {Date} at {Time}? A new WhatsApp confirmation will be sent to the patient." with "Confirm" and "Cancel" buttons (UX-DR22).
**And** on Confirm: `PATCH /api/v1/appointments/{id}` updates `slot_date`, `slot_time`, `updated_at`, `updated_by`.
**And** the original slot is released (`slot.status = 'available'` equivalent — appointment no longer occupies it).
**And** the new slot is locked via `SELECT ... FOR UPDATE SKIP LOCKED`.
**And** `scheduleConfirmation(appointmentId)` is called → patient receives a new WhatsApp message with updated time.
**And** the audit log records: `{ action: 'reschedule', oldSlot, newSlot, actorId, actorRole, timestamp }`.
**And** Pusher `appointment.updated` event published → calendar refreshes within 5 seconds.

**Given** the new slot was taken by another booking between panel open and confirm,
**When** the `SELECT FOR UPDATE SKIP LOCKED` detects conflict,
**Then** the dialog shows: "That slot was just taken. Please choose another time." and the grid refreshes.

**Given** a Receptionist drags an appointment card to a new time slot on the desktop calendar (UX-DR20),
**When** the drag completes (pointer released on a valid empty slot),
**Then** the reschedule confirmation dialog opens (identical to the click-based flow above).
**And** if the target slot is already booked (card dropped on occupied slot), the drag is rejected with a subtle shake animation and toast: "That slot is already booked."
**And** dragging to a blocked slot is also rejected.
**And** touch drag is disabled on mobile — tap-to-reschedule modal only.

### Cancel

**Given** a Receptionist clicks "Cancel Appointment" in the Appointment Detail Panel,
**When** the cancellation action is initiated,
**Then** a confirmation dialog: "Cancel this appointment? A cancellation notification will be sent to {patient name}." (UX-DR22) with "Cancel Appointment" (red-filled) and "Keep" (ghost) buttons.

**Given** the Receptionist confirms cancellation,
**When** the cancellation runs,
**Then** `PATCH /api/v1/appointments/{id}` sets `status = 'cancelled'`, `cancelled_at`, `cancelled_by`.
**And** the slot is released.
**And** an Inngest job `appointment/cancellation.send` is enqueued → WhatsApp cancellation acknowledgment sent within 30 seconds ("Your appointment with Dr. {Doctor} on {Date} at {Time} has been cancelled.").
**And** audit log: `{ action: 'cancel', actorId, actorRole, timestamp }`.
**And** Pusher `appointment.cancelled` event published.
**And** the appointment card in Day View shows strikethrough + neutral-400 status badge.

### Mark Complete / No-Show

**Given** a Receptionist clicks "Mark Complete" or "Mark No-Show" in the detail panel,
**When** the action runs (no confirmation dialog required for these — low-stakes state changes),
**Then** `PATCH /api/v1/appointments/{id}` sets `status = 'completed'` or `status = 'no-show'`.
**And** for `no-show`: no WhatsApp message is sent (patient did not show up — messaging them may be unexpected).
**And** audit log entry written.
**And** Dashboard counters update via Pusher in real time (Story 8.1).

### Slot Blocking

**Given** a Receptionist clicks on an empty time slot in the Day View calendar,
**When** the slot context menu or quick-action popover opens,
**Then** one of the options is "Block this slot" with a lock icon.

**Given** the Receptionist selects "Block this slot",
**When** the block slot form opens,
**Then** it shows:
- Reason field (text input, optional): e.g. "Lunch", "CME", "Emergency"
- Doctor selector (if multi-doctor clinic; defaults to all doctors for the time range)
- Recurrence selector: "One-time" (default) | "Daily" | "Weekly (every {day})"
- Time range: auto-filled with the clicked slot's time; start/end time editable (15-min increments)
- "Block Slot" button (brand-primary)

**Given** the Receptionist confirms the block,
**When** the block is saved,
**Then** `POST /api/v1/slot-blocks` creates a `slot_blocks` record: `{ clinicId, doctorId (null = all), date, startTime, endTime, recurrence, reason }`.
**And** `computeAvailableSlots()` already excludes blocked ranges — no separate action required; WhatsApp and Web Booking Link reflect the block immediately.
**And** the blocked time range appears as a greyed-out, hatched card in the Day View calendar (UX-DR18): label shows reason if provided, or "Blocked" if not.
**And** Pusher `slot.blocked` event published → any open booking sessions see slots disappear in real time.
**And** audit log: `{ action: 'slot-block', doctorId, startTime, endTime, recurrence, actorId }`.

**Given** a Receptionist clicks on a blocked slot card in the calendar,
**When** the block detail popover opens,
**Then** it shows: time range, reason, recurrence, who blocked it.
**And** an "Unblock" button removes the `slot_blocks` record.
**And** on unblock: Pusher `slot.unblocked` event published → slots reappear in booking flows.
**And** audit log: `{ action: 'slot-unblock', actorId, timestamp }`.

**Given** a recurring block is created (daily or weekly),
**When** the Receptionist views a future day in the calendar,
**Then** the recurring block is shown on the applicable future days.
**And** unblocking a recurring block shows: "Remove this occurrence only" | "Remove all future occurrences" (radio choice).

### Activity Log

**Given** any appointment or slot modification occurs,
**When** the Clinic Owner navigates to Settings → Activity Log,
**Then** a paginated list of audit entries is shown, most recent first.
**And** each entry shows: Timestamp (IST), Action type, Actor name + role, Summary (e.g. "Rescheduled Patient Ravi Kumar's appointment from 10:00 to 11:00 AM").
**And** the log is read-only — no edit or delete controls.
**And** entries are filterable by date range and action type.

## UX Design Reference

**EXPERIENCE.md — Reschedule/cancel confirmation dialogs (UX-DR22):**
> Dialogs are modal (not inline). Backdrop dims to bg-black/40. Dialog is centred on desktop, bottom sheet on mobile. Max-width: 400px. Primary destructive action (Cancel Appointment) is red-filled. Secondary (Keep / Close) is ghost. Keyboard: Enter = primary action, Escape = dismiss.

**DESIGN.md — Slot blocking (UX-DR18):**
- Blocked slot card: `bg-neutral-100`, `border-neutral-300` dashed border, hatched background pattern (CSS repeating-linear-gradient 45deg, neutral-200)
- Blocked card label: 12px Inter neutral-500 italic; lock icon (16px neutral-400) left of label
- Unblock hover: card border turns amber with "Click to unblock" tooltip

**EXPERIENCE.md — Drag-to-reschedule (UX-DR20):**
> @dnd-kit/core, pointer sensor only. Draggable: appointment cards in Day View time grid. Drop targets: empty slot cells. Occupied cells reject drops (visual red border flash + shake). Blocked cells reject drops silently (no drop indicator shown). Drag preview: appointment card ghost at 80% opacity, 2px blue border. On successful drop: confirmation dialog before DB write — the drag is optimistic only in preview, not committed.

## File Locations

```
apps/web/
  src/
    app/
      api/
        v1/
          appointments/
            [id]/
              route.ts                    ← PATCH: reschedule / cancel / mark status
          slot-blocks/
            route.ts                      ← POST: create block; GET: list for date range
            [id]/
              route.ts                    ← DELETE: remove block (single or recurring)
    components/
      appointments/
        ReschedulePanel.tsx               ← Sub-panel: slot grid for new slot selection
        CancelDialog.tsx                  ← Confirmation modal for cancellation
        BlockSlotForm.tsx                 ← Block slot form (reason, recurrence, time range)
        BlockSlotCard.tsx                 ← Hatched blocked slot card in calendar
        ActivityLog.tsx                   ← Settings → Activity Log table
    lib/
      dnd/
        useCalendarDnD.ts                 ← @dnd-kit setup: sensors, drag overlay, drop validation
    inngest/
      functions/
        appointment-cancellation-send.ts  ← WhatsApp cancellation acknowledgment
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | Reschedule: old slot released + new slot locked in same transaction | 100% |
| Unit | Cancel: status = 'cancelled' + cancellation notification enqueued | 100% |
| Unit | Slot block: computeAvailableSlots excludes blocked ranges | 100% |
| Unit | Recurring block: daily / weekly recurrence expansion logic | 100% |
| Unit | Drag-to-reschedule: occupied slot drop rejected | 100% |
| Integration | PATCH /api/v1/appointments/{id}: reschedule — audit log written in same transaction | 100% |
| Integration | PATCH /api/v1/appointments/{id}: cancel — Pusher event published | 100% |
| Integration | POST /api/v1/slot-blocks: block created; WhatsApp booking flow excludes blocked slot | 100% |
| Integration | DELETE /api/v1/slot-blocks/{id}: recurring — single vs all-future removal | 100% |
| Playwright (E2E) | Reschedule: open detail panel → reschedule → dialog → confirm → calendar updates | Core path |
| Playwright | Cancel: cancel dialog → confirm → appointment shows strikethrough | Core path |
| Playwright | Block slot: click empty slot → block form → confirm → hatched card appears | Core path |
| Playwright | Drag-to-reschedule: drag card to new slot → dialog → confirm → updated in calendar | Desktop UJ |
