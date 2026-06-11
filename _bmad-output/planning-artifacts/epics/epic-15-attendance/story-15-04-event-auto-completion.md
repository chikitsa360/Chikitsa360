---
story: 15.4
epic: 15
title: Event Auto-Completion
status: done
created: 2026-06-10
requirements:
  fr: [FR-22]
  nfr: [NFR-7]
---

# Story 15.4: Event Auto-Completion

## User Story

As a developer,
I want events to automatically transition to 'completed' status 24 hours after end_time,
So that the events list reflects accurate lifecycle state without requiring manual staff action.

## Context

An Inngest cron function runs every hour, finds all published events where `end_time < NOW() - 24h`, and sets them to `completed`. This mirrors how appointments have auto-status patterns. The cron function must handle multi-tenant: either iterate all clinic schemas or use a global lookup table.

## Acceptance Criteria

**Given** an Inngest cron job configured to run every hour (`0 * * * *`)
**When** it runs
**Then** it finds all `events` with `status='published'` where `end_time < NOW() - INTERVAL '24 hours'`
**And** for each: updates `status = 'completed'`, `updated_at = NOW()`
**And** writes audit_log entry: action=`EVENT_AUTO_COMPLETED`, resource_id = event.id

**Given** an event with status='cancelled' or status='completed' or status='draft'
**Then** it is skipped (only 'published' events are auto-completed)

**Given** no qualifying events exist
**When** the cron runs
**Then** exits cleanly with no errors

**And** the function is registered in `/api/inngest/route.ts` as a cron function

## Technical Notes

### Multi-tenant query approach
Since events live in per-clinic schemas, use the `public.event_slugs` table (introduced in Story 13.4) to get all `clinic_id` values, then iterate:

```ts
// Get all clinic IDs that have events
const clinicIds = await db.$queryRaw`SELECT DISTINCT clinic_id FROM public.event_slugs`
for (const { clinic_id } of clinicIds) {
  await db.$queryRawUnsafe(
    `UPDATE "clinic_${clinic_id}".events
     SET status = 'completed', updated_at = NOW()
     WHERE status = 'published'
     AND end_time < NOW() - INTERVAL '24 hours'
     RETURNING id`,
  )
  // write audit log entries for each updated event
}
```

**Alternative:** If `public.event_slugs` doesn't cover all clinics (e.g., new clinics with no events yet don't appear), use `public.clinics` table instead:
```ts
const clinics = await prisma.clinic.findMany({ select: { id: true } })
```

Use the Prisma approach as it's more reliable.

### Inngest cron function
```ts
export const eventAutoComplete = inngest.createFunction(
  { id: 'event-auto-complete', retries: 1 },
  { cron: '0 * * * *' }, // every hour
  async ({ step }) => {
    const clinics = await step.run('load-clinics', async () =>
      prisma.clinic.findMany({ select: { id: true } })
    )
    for (const clinic of clinics) {
      await step.run(`complete-events-${clinic.id}`, async () => {
        // update + audit log
      })
    }
  }
)
```

### Audit log in cron context
The cron has no `userId` (no user session). Use a sentinel value:
```ts
await writeAuditLog(clinicId, 'system', 'EVENT_AUTO_COMPLETED', 'event', eventId, { automated: true })
```

## File Locations

```
apps/web/src/inngest/functions/event-auto-complete.ts   ← CREATE
apps/web/src/inngest/functions/index.ts                 ← MODIFY: export
apps/web/src/app/api/inngest/route.ts                   ← MODIFY: include (if not auto-imported)
```

## Test Coverage Requirements

| Test type | What to cover |
|---|---|
| Integration | Events with end_time > 24h ago are auto-completed; events ended < 24h ago are not |
| Integration | Draft/cancelled events are not affected |
| Unit | Audit log written with 'system' userId and automated: true |
