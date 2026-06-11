---
story: 14.1
epic: 14
title: Registration Confirmation WhatsApp
status: done
created: 2026-06-10
requirements:
  fr: [FR-13]
  nfr: [NFR-3, NFR-4]
---

# Story 14.1: Registration Confirmation WhatsApp

## User Story

As a registered patient,
I want to receive a WhatsApp confirmation immediately after my seat is allocated,
So that I have the event details and a reference number on my phone.

## Context

The `event/registration.confirm` Inngest event is already fired from Story 13.5 (registration API). This story implements the Inngest consumer function. Follows the same pattern as `appointment-confirmation-send` from Epic 03 (`lib/notifications/schedule-confirmation.ts`).

**WhatsApp template needed:** `event_confirmation` — submit to Meta. Variables: `{{event_name}}`, `{{date_time}}`, `{{venue_or_link}}`, `{{reference_number}}`, `{{fee_or_free}}`, `{{cancellation_url}}`.

## Acceptance Criteria

**Given** the `event/registration.confirm` Inngest event is received with `{ registrationId, clinicId }`
**When** the `event-registration-confirm` function runs
**Then** it loads registration, event, patient, and clinic from the tenant DB
**And** sends a WhatsApp template message to the patient's phone with: event title, date/time (IST), venue or meeting link, reference number, fee ("₹150" or "Free"), cancellation URL (`{baseUrl}/events/{slug}/cancel?token={cancellation_token}`)
**And** on WA failure, falls back to SMS via `sendSms()` with the same key details
**And** the function is idempotent: key `${registrationId}:reg-confirm` (set as Inngest function id)
**And** if the registration no longer exists or was cancelled before the job runs, the function exits cleanly (no error, no message sent)

**And** the public registration page (Story 13.6) confirmation state now shows the real cancellation URL (update the cancel link from the stub "#" to the actual token URL returned in the confirmation)

## Technical Notes

### File to create
`apps/web/src/inngest/functions/event-registration-confirm.ts`

```ts
export const eventRegistrationConfirm = inngest.createFunction(
  { id: 'event-registration-confirm', retries: 3 },
  { event: 'event/registration.confirm' },
  async ({ event, step }) => {
    const { registrationId, clinicId } = event.data
    const data = await step.run('load-data', async () => {
      // load registration, event, patient, clinic
    })
    if (!data || data.registration.status === 'cancelled') return
    await step.run('send-confirmation', async () => {
      try {
        await sendTemplateMessage(/* ... */)
      } catch {
        await sendSms(data.patient.phone, buildConfirmationSmsText(data))
      }
    })
  }
)
```

### Cancellation URL in registration response
Update `POST /api/v1/events/[slug]/register` (Story 13.5) to return the `cancellationUrl` in the response:
```ts
const cancellationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/events/${slug}/cancel?token=${cancellationToken}`
return NextResponse.json({ data: { status: 'registered', referenceNumber, cancellationUrl } })
```
Then update `RegistrationForm.tsx` (Story 13.6) to use this URL for the "Cancel Registration" link.

### SMS fallback text
```ts
function buildConfirmationSmsText(data: { event, registration, clinic }) {
  return `${data.clinic.name}: Your seat is confirmed for ${data.event.title} on ${formatDate(data.event.start_time)}. Ref: ${data.registration.reference_number}. Cancel: ${cancellationUrl}`
}
```

## File Locations

```
apps/web/src/inngest/functions/event-registration-confirm.ts   ← CREATE
apps/web/src/inngest/functions/index.ts                        ← MODIFY: export
apps/web/src/app/api/v1/events/[slug]/register/route.ts        ← MODIFY: include cancellationUrl in response
apps/web/src/components/event-registration/RegistrationForm.tsx ← MODIFY: use real cancellationUrl
```

## Test Coverage Requirements

| Test type | What to cover |
|---|---|
| Unit | Function exits cleanly when registration not found or status=cancelled |
| Unit | WA failure triggers SMS fallback |
| Integration | Function sends WA with correct template variables |

## Review Findings

### Senior Developer Review (AI) — 2026-06-11

**Outcome:** Changes Requested
**Action Items:** 4 patch, 1 deferred

#### Action Items

- [x] [Review][Patch] Use `step.sendEvent()` instead of `inngest.send()` inside `step.run()` — calling `inngest.send()` inside a step bypasses Inngest's retry/dedup semantics; should be `await step.sendEvent('schedule-reminder', { name: 'event/reminder.24h', data: { registrationId, clinicId }, ts: reminderTs, id: \`${registrationId}:reminder-24h\` })` [event-registration-confirm.ts:138]
- [x] [Review][Patch] Cast `start_time` as `TIMESTAMPTZ` not `TIMESTAMP::text` — `start_time::text` from PostgreSQL loses timezone context; `new Date('2026-06-15 10:00:00')` is parsed as UTC by Node.js, shifting the reminder 5.5h; fix: `start_time AT TIME ZONE 'UTC' as start_time` or `start_time::timestamptz::text` [event-registration-confirm.ts:52]
- [x] [Review][Patch] Guard `clinic === null` in `load-data` step — if clinic row is deleted between registration and job execution, `clinic` is null but code proceeds; add `if (!clinic) return null` before the return statement [event-registration-confirm.ts:65]
- [x] [Review][Patch] No tests implemented — spec requires unit tests for early-exit and SMS fallback, plus integration test for WA send; add test file `event-registration-confirm.test.ts`
- [x] [Review][Defer] `'event/reminder.24h' as never` type cast — Inngest event type map not updated to include new event names; pre-existing pattern in codebase, not actionable in this story [event-registration-confirm.ts:141] — deferred, pre-existing
