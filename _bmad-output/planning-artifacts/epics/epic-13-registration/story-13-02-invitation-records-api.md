---
story: 13.2
epic: 13
title: Invitation Records API
status: done
created: 2026-06-10
requirements:
  fr: [FR-6, FR-7]
  nfr: [NFR-5, NFR-6]
---

# Story 13.2: Invitation Records API

## User Story

As a developer,
I want POST /api/v1/events/[eventId]/invite to store invitation records and enqueue the WhatsApp blast Inngest job,
So that each invited patient has a tracked record and the blast is processed asynchronously.

## Context

This API creates `event_invitations` rows (one per patient) and fires an Inngest event that triggers the WhatsApp blast function (Story 13.3). The Inngest function runs asynchronously — the API returns immediately with HTTP 202. Duplicate patient IDs are silently ignored (upsert pattern).

## Acceptance Criteria

**Given** an authenticated staff session
**When** `POST /api/v1/events/[eventId]/invite` with `{ patientIds: ['uuid1', 'uuid2', ...] }`
**Then** for each patientId, an `event_invitations` row is created (or ignored if already exists for this event+patient) with `delivery_status='pending'`
**And** Inngest event fired: `{ name: 'event/invitation.blast', data: { eventId, clinicId, patientIds } }` with idempotency key `${eventId}:invite:${Date.now()}`
**And** HTTP 202: `{ data: { invited: N, alreadyInvited: M } }` (N = new rows, M = skipped duplicates)

**Given** `patientIds` is empty array
**Then** HTTP 400: `{ error: { code: 'VALIDATION_ERROR', message: 'patientIds must not be empty' } }`

**Given** the event doesn't exist or belongs to another clinic
**Then** HTTP 404

**Given** unauthenticated request
**Then** HTTP 403

## Technical Notes

### File to create
`apps/web/src/app/api/v1/events/[eventId]/invite/route.ts`

### Upsert pattern
```sql
INSERT INTO "clinic_${clinicId}".event_invitations (event_id, patient_id, delivery_status, created_at)
VALUES ($1, $2, 'pending', NOW())
ON CONFLICT (event_id, patient_id) DO NOTHING
RETURNING id
```
Count `RETURNING id` rows to determine N (new) vs M (skipped).

### Inngest event
```ts
import { inngest } from '@/lib/inngest'
await inngest.send({
  name: 'event/invitation.blast',
  data: { eventId, clinicId, patientIds },
  id: `${eventId}:invite:${Date.now()}`, // idempotency key
})
```

### Validation
Max patientIds per request: 500 (to prevent abuse). Use Zod.

## File Locations

```
apps/web/src/app/api/v1/events/[eventId]/invite/route.ts   ← CREATE
```

## Test Coverage Requirements

| Test type | What to cover |
|---|---|
| Integration | Creates N records; duplicate patientIds skipped; Inngest event fired once |
| Integration | 404 for wrong clinic; 400 for empty patientIds |
