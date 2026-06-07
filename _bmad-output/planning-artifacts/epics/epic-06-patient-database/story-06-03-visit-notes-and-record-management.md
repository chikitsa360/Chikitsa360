---
story: 6.3
epic: 6
title: Visit Notes & Record Management
status: Not Started
created: 2026-06-07
requirements:
  functional: [FR-18]
  nfr: [NFR-10]
  ux: [UX-DR21, UX-DR45]
  compliance: [CR-12]
---

# Story 6.3: Visit Notes & Record Management

## User Story

As a Doctor,
I want to add a brief visit note to any completed appointment from the patient's profile,
So that I have a running clinical record of what was discussed or prescribed at each visit.

## Context

**FR-18:** Doctors and Owners can add plain-text visit note (500 chars max) to any `completed` appointment. Read-only for Receptionists.

**Scope:** MVP visit notes are plain text only — no rich text, no attachments, no structured SOAP fields. Clinical complexity (prescriptions, diagnoses, lab results) is a Phase 1 feature. This story focuses on the inline note editing experience and the permissions model.

**Entry points for note editing:**
1. Visit History timeline on Patient Profile (Story 6.2) — click to expand → note editor appears inline
2. Appointment Detail Panel (Story 5.1) — "Add Visit Note" link in the panel body

**Idempotency:** Notes can be edited multiple times. Each save overwrites the previous note; the audit log records every version (old value + new value + actor + timestamp).

## Acceptance Criteria

**Given** a Doctor or Owner views a `completed` appointment in the Visit History (patient profile) or Appointment Detail Panel,
**When** there is no visit note yet,
**Then** a "+ Add visit note" link is shown in 14px brand-primary (UX-DR45 inline editor trigger).

**Given** a Doctor or Owner views a `completed` appointment that already has a note,
**When** the note section renders,
**Then** the existing note text is shown in 14px Inter neutral-700 italic.
**And** an "Edit" pencil icon appears on hover (desktop) or is always visible (mobile).

**Given** a Doctor clicks "+ Add visit note" or the "Edit" icon,
**When** the inline editor opens,
**Then** the note text area replaces the display view inline (no modal, no navigation — UX-DR45).
**And** the text area is auto-focused, 4 rows tall (expandable), max 500 chars.
**And** a live character counter is shown: "X / 500" — turns amber at 450+, red at 490+.
**And** "Save Note" and "Cancel" buttons appear below the text area.
**And** "Save Note" is disabled when the text area is empty.

**Given** the Doctor types a note and clicks "Save Note",
**When** the save runs,
**Then** `PATCH /api/v1/appointments/{appointmentId}/note` is called with `{ note: "..." }`.
**And** the server validates: role must be `doctor` or `owner`; appointment must belong to this clinic; appointment status must be `completed`.
**And** the note is saved to `appointments.visit_note` (text, max 500 chars — truncated server-side if somehow exceeded).
**And** the audit log records: `{ action: 'visit-note-save', appointmentId, patientId, oldNote (null if first), newNote, actorId, actorRole, timestamp }`.
**And** the inline editor closes; the saved note text is displayed immediately (optimistic update).
**And** a success toast: "Visit note saved."

**Given** the Doctor clicks "Cancel" without saving,
**When** the editor closes,
**Then** any unsaved text is discarded.
**And** if a previous note existed, it is restored in the display.
**And** no API call is made.

**Given** a Receptionist opens the same appointment's detail panel or the patient profile visit history,
**When** the completed appointment section renders,
**Then** the visit note (if any) is displayed read-only — no edit icon, no "+ Add visit note" link.
**And** attempting `PATCH /api/v1/appointments/{appointmentId}/note` with a Receptionist session token returns 403.

**Given** a note is saved on a `completed` appointment,
**When** the patient's visit history renders (Story 6.2 VisitHistoryCard),
**Then** the first 100 chars of the note are shown as an excerpt in italic neutral-600.
**And** if the note exceeds 100 chars, an ellipsis and "see more" link expand the card to show the full note inline.

**Given** the clinic's language is set to Hindi (`hi`),
**When** a Doctor writes a visit note in Hindi (Devanagari script),
**Then** the note is stored and displayed correctly (Unicode UTF-8 — Prisma + PostgreSQL handle this natively).
**And** the character counter counts Unicode code points, not bytes.

**Given** a Doctor tries to add a visit note to an appointment with status `confirmed`, `cancelled`, or `no-show`,
**When** the request is made,
**Then** the API returns 422 with: "Visit notes can only be added to completed appointments."
**And** the UI does not expose the note editor for non-completed appointments (server-side guard + client-side RBAC hide).

## UX Design Reference

**EXPERIENCE.md — Inline note editor (UX-DR45):**
> The note editor must feel seamless — not like opening a form. On click, the static display morphs into an editable text area in the same spatial location. No modal, no navigation.
>
> Transition: static note text fades out (100ms); text area fades in (150ms) with same dimensions as the text area would occupy if the note were visible. Text area border: `--color-primary` 1.5px on focus.
>
> Character counter: right-aligned below text area. Colour states: neutral-400 (< 450) → amber-500 (450–489) → red-500 (490–500).
>
> Save / Cancel row: below text area, right-aligned. "Save Note" = brand-primary small button (36px). "Cancel" = ghost small (36px).

**DESIGN.md — Note display vs editor:**
- Note text display: 14px Inter italic neutral-700, line-height 1.6
- Note text area: same font as display (14px Inter), border `--color-border` default, `--color-primary` focused, `--radius-md`, padding 10px, min-height 80px
- "+ Add visit note": 14px Inter `--color-primary`, underline on hover
- "Edit" icon: 16px pencil SVG neutral-400, shows on row hover (desktop), always visible (mobile)
- Character counter: 12px Inter monospace

## File Locations

```
apps/web/
  src/
    app/
      api/
        v1/
          appointments/
            [appointmentId]/
              note/
                route.ts                  ← PATCH: save visit note (Doctor/Owner only)
    components/
      patients/
        VisitNoteEditor.tsx               ← Inline note editor (display ↔ edit toggle)
        VisitNoteDisplay.tsx              ← Read-only note display with excerpt + expand
    hooks/
      useVisitNote.ts                     ← Mutation hook: PATCH /api/v1/appointments/{id}/note
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | Character counter: colour states at 450, 490, 500 chars | 100% |
| Unit | Devanagari character counting (Unicode code points, not bytes) | 100% |
| Unit | RBAC: PATCH note → 403 for receptionist session | 100% |
| Unit | Status guard: PATCH note → 422 for non-completed appointment | 100% |
| Integration | PATCH /api/v1/appointments/{id}/note: note saved + audit log with oldNote/newNote | 100% |
| Integration | PATCH note: 403 when clinicId does not match session | 100% |
| Playwright (E2E) | Doctor: click "+ Add note" → type note → save → note displayed in visit history | Core path |
| Playwright | Doctor: edit existing note → save → updated note displayed | Core path |
| Playwright | Receptionist: note visible; no edit controls present | Core path |
| Playwright | Character counter turns amber at 450+, red at 490+ | Core path |
| Playwright | Cancel: typed text discarded; previous note restored | Core path |
