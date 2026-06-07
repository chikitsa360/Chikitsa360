---
story: 7.2
epic: 7
title: Reminder Settings & Clinic Toggle
status: Not Started
created: 2026-06-07
requirements:
  functional: [FR-25]
  nfr: [NFR-10]
  ux: [UX-DR27]
---

# Story 7.2: Reminder Settings & Clinic Toggle

## User Story

As a Clinic Owner,
I want to enable or disable automated appointment reminders from the Settings page,
So that I can control whether patients receive 24h and 2h reminders based on the clinic's operational needs.

## Context

**FR-25:** Owner enables/disables each reminder type (24h, 2h) per Clinic in Settings. Default: both enabled on Clinic creation. Changes apply to future appointments only (existing scheduled Inngest jobs check the toggle at execution time).

**Settings location:** Settings → Notifications (new section within the existing Settings area from Epic 2).

**Execution-time check:** The reminder Inngest jobs (Story 7.1) read `clinic.reminder_24h_enabled` and `clinic.reminder_2h_enabled` at the moment of execution — not at scheduling time. This means:
- Disabling 24h reminders today will suppress ALL future 24h reminder job executions, including ones already scheduled for existing appointments
- Re-enabling restores sends for all upcoming jobs

## Acceptance Criteria

**Given** a Clinic Owner navigates to Settings → Notifications,
**When** the page loads,
**Then** the page shows two toggle sections:
  - "24-Hour Appointment Reminder" — toggle (ON by default), description: "Sent 24 hours before the appointment. Includes a cancel option for the patient."
  - "2-Hour Appointment Reminder" — toggle (ON by default), description: "Sent 2 hours before the appointment as a final reminder."
**And** each toggle section also shows: WhatsApp template name + approval status badge (`Approved` in green / `Pending` in amber / `Rejected` in red).
**And** the current opt-out count is shown as a read-only metric: "X patients have opted out of WhatsApp messages" (count of patients with `whatsapp_opt_out_at IS NOT NULL` for this clinic).

**Given** the Clinic Owner toggles "24-Hour Appointment Reminder" to OFF,
**When** the toggle is clicked,
**Then** a confirmation dialog appears: "Disable 24-hour reminders? Patients with upcoming appointments will no longer receive this reminder. Already sent reminders are unaffected." with "Disable" (amber-filled) and "Keep Enabled" (ghost) buttons.
**And** on "Disable": `PATCH /api/v1/clinics/{clinicId}/settings` with `{ reminder_24h_enabled: false }`.
**And** the toggle updates to OFF state.
**And** a success toast: "24-hour reminders disabled. Changes apply to future reminder sends."
**And** audit log: `{ action: 'settings-change', field: 'reminder_24h_enabled', oldValue: true, newValue: false, actorId }`.

**Given** the Clinic Owner toggles "24-Hour Appointment Reminder" back to ON,
**When** the toggle is clicked (no confirmation dialog needed for enabling),
**Then** `PATCH /api/v1/clinics/{clinicId}/settings` with `{ reminder_24h_enabled: true }`.
**And** success toast: "24-hour reminders enabled."

**Given** the `appointment/reminder-24h.send` Inngest job runs for an appointment,
**When** the job checks `clinic.reminder_24h_enabled`,
**Then** if `false` → the job exits without sending (no WhatsApp, no SMS fallback, no delivery_failures entry).
**And** `appointments.reminder_24h_sent_at` is NOT updated (so a toggle re-enable cannot retrigger a past job — the Inngest job has already completed).

**Given** both toggles are disabled,
**When** the Notifications settings page renders,
**Then** both toggles show OFF state with a subtle amber info banner: "All automated reminders are currently disabled for this clinic."

**Given** the WhatsApp template approval status for a reminder type is "Pending" or "Rejected",
**When** the settings page renders,
**Then** the toggle for that reminder type is shown but with a warning label: "Template not yet approved by Meta — reminders will not send even if enabled."
**And** the toggle is still operable (Owner can pre-configure it to ON; sends will begin once the template is approved).

**Given** the clinic was just created (Story 2.1),
**When** the clinic record is initialised,
**Then** `reminder_24h_enabled = true` and `reminder_2h_enabled = true` are set as defaults in the DB.

## UX Design Reference

**EXPERIENCE.md — Notifications settings (UX-DR27):**
> Settings → Notifications page structure:
>
> Section header: "Automated WhatsApp Reminders"
> Each reminder row:
> - Toggle (left) — ON/OFF, brand-primary when ON, neutral-300 when OFF
> - Label + description (centre): bold label (15px) + description (13px neutral-500)
> - Template status badge (right): `Approved` green chip / `Pending` amber chip / `Rejected` red chip
>
> Opt-out metric row (non-interactive): "X patients opted out of WhatsApp" — neutral-500 italic, 13px. Link: "View opted-out patients" (navigates to filtered Patient Directory).
>
> Amber info banner (conditional): shown when all reminders disabled. Dismissible per session but not persistent (always shows when page loads with all disabled).

**DESIGN.md — Settings toggle rows:**
- Toggle component: 44px wide × 24px tall, brand-primary when on, `--color-neutral-300` when off, 200ms transition
- Row: padding 16px, `border-bottom: 1px --color-border`
- Template status chip: 12px Inter semibold, `rounded-full px-2 py-0.5`; colours: `bg-green-100 text-green-700` / `bg-amber-100 text-amber-700` / `bg-red-100 text-red-600`
- Amber info banner: `bg-amber-50 border border-amber-200 rounded-md p-3` with warning icon

## File Locations

```
apps/web/
  src/
    app/
      (portal)/
        settings/
          notifications/
            page.tsx                      ← Settings → Notifications page (RSC)
            NotificationsClient.tsx       ← Client: toggles + confirmation dialog
      api/
        v1/
          clinics/
            [clinicId]/
              settings/
                route.ts                  ← PATCH: update clinic settings (reminder toggles)
    components/
      settings/
        ReminderToggleRow.tsx             ← Toggle + label + template status badge
        OptOutMetric.tsx                  ← Read-only opted-out count
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | Reminder job: toggle false → job exits, no send | 100% |
| Unit | Clinic creation: reminder_24h_enabled + reminder_2h_enabled default to true | 100% |
| Integration | PATCH /api/v1/clinics/{id}/settings: toggle saved + audit log written | 100% |
| Integration | PATCH: Owner-only (Receptionist/Doctor → 403) | 100% |
| Playwright (E2E) | Toggle OFF → confirmation dialog → "Disable" → toggle shows OFF + toast | Core path |
| Playwright | Toggle ON → no dialog → toggle shows ON + toast | Core path |
| Playwright | Template status badge renders correctly for each approval state | Core path |
