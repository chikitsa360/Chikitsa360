---
story: 13.3
epic: 13
title: WhatsApp Invitation Blast Inngest Job
status: done
created: 2026-06-10
requirements:
  fr: [FR-7]
  nfr: [NFR-3, NFR-4, NFR-6]
---

# Story 13.3: WhatsApp Invitation Blast Inngest Job

## User Story

As a developer,
I want an Inngest function that sends WhatsApp invitation messages to all selected patients in rate-capped batches,
So that patients receive event invitations without exceeding the WhatsApp Business API rate limit of 100 messages/min.

## Context

This mirrors the bulk notification patterns from Epic 07. Reuses `sendTemplateMessage()` from `lib/meta-whatsapp.ts` and `sendSms()` from `lib/sms/msg91.ts` as fallback. Processes in batches of 100 with a 60-second sleep between batches.

**WhatsApp template needed (submit to Meta before go-live):** `event_invitation` — template name to confirm with business team. Contains: `{{event_name}}`, `{{date_time}}`, `{{venue_or_link}}`, `{{registration_url}}`, `{{fee_or_free}}`, `{{seats_available}}`.

## Acceptance Criteria

**Given** the `event/invitation.blast` Inngest event is received with `{ eventId, clinicId, patientIds }`
**When** the function runs
**Then** it loads the event details from the tenant DB
**And** processes patientIds in batches of 100
**And** for each patient in a batch: fetches phone from patients table; sends WA template message with event details and registration URL (`{baseUrl}/events/{slug}`)
**And** on successful WA send: updates `event_invitations` row: `delivery_status='sent'`, `sent_at=NOW()`
**And** on WA failure: falls back to SMS via `sendSms()`; if SMS also fails: updates `delivery_status='failed'`
**And** after each batch of 100, sleeps 60 seconds before the next batch (`await step.sleep('rate-limit-pause', '60s')`)
**And** the function completes without throwing (errors per-patient are caught, not bubbled)
**And** idempotency: if re-run with same data, already-sent invitations (delivery_status=sent) are skipped

**And** the function is registered in `apps/web/src/inngest/functions/` and exported from the Inngest index

## Technical Notes

### File to create
`apps/web/src/inngest/functions/event-invitation-blast.ts`

### Inngest function structure
```ts
export const eventInvitationBlast = inngest.createFunction(
  { id: 'event-invitation-blast', retries: 2 },
  { event: 'event/invitation.blast' },
  async ({ event, step }) => {
    const { eventId, clinicId, patientIds } = event.data
    const eventData = await step.run('load-event', async () => { /* fetch event */ })
    const batches = chunk(patientIds, 100)
    for (let i = 0; i < batches.length; i++) {
      await step.run(`send-batch-${i}`, async () => { /* send batch */ })
      if (i < batches.length - 1) await step.sleep('rate-limit-pause', '60s')
    }
  }
)
```

### Reuse existing patterns
```ts
import { sendTemplateMessage } from '@/lib/meta-whatsapp'
import { sendSms } from '@/lib/sms/msg91'
```
Template variables: match the `event_invitation` template structure. Until Meta approval, the function can log what would be sent.

### Registration URL
```ts
const registrationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/events/${eventData.slug}`
```

### Idempotency: skip already-sent
```ts
const pendingPatientIds = patientIds.filter(id => !alreadySentIds.has(id))
// fetch alreadySentIds from event_invitations WHERE delivery_status = 'sent'
```

### Register in inngest index
`apps/web/src/inngest/functions/index.ts` — add `eventInvitationBlast` to the exported array.

## File Locations

```
apps/web/src/inngest/functions/event-invitation-blast.ts   ← CREATE
apps/web/src/inngest/functions/index.ts                    ← MODIFY: export new function
apps/web/src/app/api/inngest/route.ts                      ← MODIFY: include new function (if not auto-imported via index)
```

## Test Coverage Requirements

| Test type | What to cover |
|---|---|
| Unit | Batches array of 250 patientIds into 3 batches (100, 100, 50) |
| Unit | Already-sent patients (delivery_status=sent) are skipped on re-run |
| Integration | Function processes batch; updates delivery_status on success/failure |
