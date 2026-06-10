---
story: 14.1
epic: 14
title: Registration Confirmation WhatsApp
status: Not Started
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
