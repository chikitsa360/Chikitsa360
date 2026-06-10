---
story: 14.2
epic: 14
title: 24h Event Reminder
status: Not Started
created: 2026-06-10
requirements:
  fr: [FR-14]
  nfr: [NFR-3, NFR-4]
  tech: [TECH-5]
---

# Story 14.2: 24h Event Reminder

## User Story

As a registered patient,
I want to receive a WhatsApp reminder 24 hours before the event,
So that I don't forget to attend.

## Context

Mirrors the appointment reminder pattern from Epic 07 (`appointment-reminder-24h` Inngest function). The scheduled reminder is queued when the registration confirmation runs (Story 14.1). Respects the clinic's `eventReminder24hEnabled` toggle and patient's `whatsapp_opt_out` flag.

**WhatsApp template needed:** `event_reminder_24h` — variables: `{{event_name}}`, `{{date_time}}`, `{{venue_or_link}}`, `{{reference_number}}`.

## Acceptance Criteria

**Given** a registration is confirmed
**When** Story 14.1's `event-registration-confirm` function completes
**Then** it schedules an Inngest event: `{ name: 'event/reminder.24h', data: { registrationId, clinicId }, ts: eventStartTime - 86400000 }`
**And** `ts` is a number (epoch ms, NOT a Date object) — critical: matches existing reminder pattern in Epic 07

**Given** the `event/reminder.24h` Inngest event fires 24h before the event
**When** `event-reminder-24h` function runs
**Then** it checks: registration status = 'registered' (skip if cancelled/attended/no_show)
**And** checks: clinic's `eventReminder24hEnabled = true`
**And** checks: patient's `whatsapp_opt_out = false`
**And** if all pass: sends WA reminder with event name, date/time, venue/link, reference number
**And** on WA failure: SMS fallback via `sendSms()`
**And** idempotency key: `${registrationId}:reminder-24h`

**And** Settings → Notifications page shows a new toggle: "Event Reminder (24h before)"
**And** PATCH /api/v1/clinics/settings accepts `{ eventReminder24hEnabled: boolean }` (alongside existing `reminder24hEnabled`, `reminder2hEnabled`)
**And** `Clinic` Prisma model has `eventReminder24hEnabled Boolean @default(true)` added

## Technical Notes

### Prisma model update
```prisma
// prisma/schema.prisma — add to Clinic model:
eventReminder24hEnabled Boolean @default(true)
```
Run `pnpm prisma generate` and `pnpm prisma migrate dev` after schema change.

### Schedule reminder in Story 14.1
Add to `event-registration-confirm.ts`:
```ts
await step.run('schedule-reminder', async () => {
  const reminderTs = new Date(event.start_time).getTime() - 86400000
  if (reminderTs > Date.now()) { // only schedule if in the future
    await inngest.send({
      name: 'event/reminder.24h',
      data: { registrationId, clinicId },
      ts: reminderTs,
      id: `${registrationId}:reminder-24h`,
    })
  }
})
```

### Inngest function
`apps/web/src/inngest/functions/event-reminder-24h.ts`
Pattern is near-identical to `apps/web/src/inngest/functions/appointment-reminder-24h.ts` — read that file before implementing.

### Settings UI
`apps/web/src/app/(dashboard)/settings/notifications/page.tsx` — add the new toggle alongside existing reminder toggles. Reuse `NotificationsClient.tsx` pattern — add `eventReminder24hEnabled` to the settings state and PATCH call.

## File Locations

```
apps/web/src/inngest/functions/event-reminder-24h.ts           ← CREATE
apps/web/src/inngest/functions/event-registration-confirm.ts   ← MODIFY: add schedule step
apps/web/src/inngest/functions/index.ts                        ← MODIFY: export
prisma/schema.prisma                                           ← MODIFY: add eventReminder24hEnabled
apps/web/src/app/(dashboard)/settings/notifications/page.tsx   ← MODIFY: add toggle
```

## Test Coverage Requirements

| Test type | What to cover |
|---|---|
| Unit | Function skips when registration status != registered |
| Unit | Function skips when clinic toggle is false |
| Unit | Function skips when patient opt_out is true |
| Unit | ts is epoch ms (number), not a Date object |
