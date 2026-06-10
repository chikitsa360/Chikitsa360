---
story: 13.5
epic: 13
title: Registration API — Seat Allocation & Waiting List
status: Not Started
created: 2026-06-10
requirements:
  fr: [FR-8, FR-9, FR-10, FR-11, FR-12]
  nfr: [NFR-1, NFR-2]
---

# Story 13.5: Registration API — Seat Allocation & Waiting List

## User Story

As a developer,
I want POST /api/v1/events/[slug]/register to handle seat allocation with race-safety and waiting list fallback,
So that concurrent registrations never double-book and patients are properly queued when seats are full.

## Context

This is the most critical API in the Events module. Race-safe allocation uses `SELECT ... FOR UPDATE` in a DB transaction — the same pattern used for appointment slot locking in `lib/whatsapp/slot-lock.ts` (Epic 03). The endpoint is public (no auth). Fires an Inngest stub for registration confirmation (Epic 14 implements the consumer).

## Acceptance Criteria

**Given** a public POST to `/api/v1/events/[slug]/register` with `{ name: "Anita", phone: "9876543210" }`
**When** seats are available
**Then** the DB transaction:
  1. SELECT events row FOR UPDATE (locks the row)
  2. Check seats_registered < max_seats
  3. INSERT into event_registrations (status='registered', reference_number generated, cancellation_token = UUID)
  4. UPDATE events SET seats_registered = seats_registered + 1
  5. COMMIT
**And** HTTP 200: `{ data: { status: 'registered', referenceNumber: 'EVT-0002-023' } }`
**And** Inngest event fired: `{ name: 'event/registration.confirm', data: { registrationId, clinicId } }`

**Given** concurrent registrations with exactly 1 seat remaining
**When** two requests arrive simultaneously
**Then** exactly one succeeds (status=registered); the other receives `{ status: 'seats_full' }` (not an error — the front-end handles this as a waitlist offer)

**Given** `{ name, phone, joinWaitlist: true }` and seats are full
**When** the request arrives
**Then** INSERT into event_waiting_list with position = COUNT(existing waiting entries) + 1
**And** HTTP 200: `{ data: { status: 'waitlisted', position: 4 } }`

**Given** the same phone number is already registered for this event
**When** POST is called again
**Then** HTTP 409: `{ error: { code: 'ALREADY_REGISTERED', referenceNumber: 'EVT-0002-023' } }`

**Given** event status != 'published' OR registration_deadline has passed
**When** POST is called
**Then** HTTP 422: `{ error: { code: 'REGISTRATION_CLOSED' } }`

**And** this endpoint is added to `PUBLIC_API_PATHS` in middleware

## Technical Notes

### File to create
`apps/web/src/app/api/v1/events/[slug]/register/route.ts`

### Also add to PUBLIC_API_PATHS
```ts
'/api/v1/events/', // covers /api/v1/events/[slug]/register
```

### Patient resolution
```ts
// Find clinic_id via public.event_slugs first, then:
const existingPatient = await db.$queryRawUnsafe(
  `SELECT id FROM "clinic_${clinicId}".patients WHERE phone = $1 LIMIT 1`, phone
)
const patientId = existingPatient[0]?.id ?? await createPatient({ clinicId, name, phone })
```

### Reference number generation
```ts
// EVT-{eventId first 4 chars uppercased}-{sequential 3-digit padded}
// Sequential count: SELECT COUNT(*) FROM event_registrations WHERE event_id = $1
const seqCount = (existingCount + 1).toString().padStart(3, '0')
const refNum = `EVT-${eventId.substring(0,4).toUpperCase()}-${seqCount}`
```

### SELECT FOR UPDATE transaction
```ts
await db.$queryRawUnsafe(`BEGIN`)
try {
  const [event] = await db.$queryRawUnsafe(
    `SELECT id, seats_registered, max_seats FROM "clinic_${clinicId}".events WHERE id = $1 FOR UPDATE`,
    eventId
  )
  if (event.seats_registered >= event.max_seats) {
    await db.$queryRawUnsafe('ROLLBACK')
    return NextResponse.json({ data: { status: 'seats_full' } })
  }
  // INSERT registration + UPDATE seats_registered
  await db.$queryRawUnsafe('COMMIT')
} catch (e) {
  await db.$queryRawUnsafe('ROLLBACK')
  throw e
}
```

### Cancellation token
```ts
import { randomUUID } from 'crypto'
const cancellationToken = randomUUID()
const tokenExpiresAt = new Date(event.start_time) // expires at event start
```

### Inngest stub (consumer in Epic 14)
```ts
await inngest.send({
  name: 'event/registration.confirm',
  data: { registrationId: newReg.id, clinicId },
  id: `${newReg.id}:reg-confirm`,
})
```

### Rate limiting (abuse prevention)
Apply Upstash rate limit: 60 requests/min per IP. Reuse `apps/web/src/lib/rate-limit.ts`.

## File Locations

```
apps/web/src/app/api/v1/events/[slug]/register/route.ts   ← CREATE
apps/web/src/middleware.ts                                  ← MODIFY: add /api/v1/events/ to PUBLIC_API_PATHS
```

## Test Coverage Requirements

| Test type | What to cover |
|---|---|
| Integration | Successful registration: registration row created, seats_registered incremented, Inngest event fired |
| Integration | Race condition: two concurrent requests with 1 seat remaining — exactly one succeeds, one gets seats_full |
| Integration | Duplicate registration: 409 with existing referenceNumber |
| Integration | Waitlist: joinWaitlist=true inserts waiting entry with correct position |
| Integration | Closed registration: 422 for non-published event |
