---
story: 12.1
epic: 12
title: Tenant DB Schema — Events Tables
status: done
created: 2026-06-10
requirements:
  fr: []
  nfr: [NFR-5]
  tech: [TECH-1]
---

# Story 12.1: Tenant DB Schema — Events Tables

## User Story

As a developer,
I want the tenant database schema to include events, event_series, event_registrations, event_waiting_list, and event_invitations tables,
So that all downstream stories (12.2 through 15.4) have the correct data layer in place.

## Context

All event data lives in the `clinic_{clinicId}` tenant schema, matching the existing pattern where appointments, patients, billing etc. also live in per-clinic schemas. The tenant schema SQL is maintained in `apps/web/src/db/tenant-schema.sql` and applied via `$queryRawUnsafe` when provisioning a new clinic. For existing clinics, a migration must also be applied.

**Critical pattern:** Never add new tables to Prisma's `schema.prisma` for tenant schema tables. All tenant-schema tables use raw SQL via `db.$queryRawUnsafe`. This is the established pattern from Epic 01 Story 1.1.

## Acceptance Criteria

**Given** `apps/web/src/db/tenant-schema.sql` is updated and applied to a fresh tenant schema
**When** the SQL runs
**Then** the following tables are created:

**`events` table:**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `clinic_id TEXT NOT NULL` (redundant for isolation clarity)
- `series_id UUID REFERENCES event_series(id) ON DELETE SET NULL` (nullable)
- `title TEXT NOT NULL` (max 120 chars enforced in API)
- `description TEXT`
- `start_time TIMESTAMPTZ NOT NULL`
- `end_time TIMESTAMPTZ NOT NULL`
- `venue TEXT`
- `meeting_link TEXT`
- `max_seats INTEGER NOT NULL CHECK (max_seats > 0 AND max_seats <= 500)`
- `seats_registered INTEGER NOT NULL DEFAULT 0 CHECK (seats_registered >= 0)`
- `registration_deadline TIMESTAMPTZ`
- `fee_paise INTEGER CHECK (fee_paise >= 0)` (nullable; NULL = free)
- `status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','cancelled','completed'))`
- `slug TEXT NOT NULL`
- `created_by TEXT NOT NULL` (userId of creator)
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `UNIQUE (slug)` — unique per tenant schema (not globally)

**`event_series` table:**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `clinic_id TEXT NOT NULL`
- `recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('daily','weekly'))`
- `recurrence_day_of_week INTEGER CHECK (recurrence_day_of_week >= 0 AND recurrence_day_of_week <= 6)` (nullable; used for weekly)
- `total_occurrences INTEGER NOT NULL CHECK (total_occurrences >= 2 AND total_occurrences <= 52)`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

**`event_registrations` table:**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE`
- `patient_id UUID NOT NULL`
- `reference_number TEXT NOT NULL UNIQUE`
- `status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','attended','no_show','cancelled'))`
- `cancellation_token TEXT UNIQUE` (nullable after cancellation)
- `token_expires_at TIMESTAMPTZ`
- `registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

**`event_waiting_list` table:**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE`
- `patient_id UUID NOT NULL`
- `position INTEGER NOT NULL`
- `status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','promoted','removed'))`
- `joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

**`event_invitations` table:**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE`
- `patient_id UUID NOT NULL`
- `sent_at TIMESTAMPTZ` (nullable until blast runs)
- `delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending','sent','failed'))`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `UNIQUE (event_id, patient_id)` — prevent duplicate invitation records

**And** the following indexes are created:
- `CREATE INDEX ON events(clinic_id, status)`
- `CREATE INDEX ON events(slug)`
- `CREATE INDEX ON events(series_id)` WHERE series_id IS NOT NULL
- `CREATE INDEX ON event_registrations(event_id)`
- `CREATE INDEX ON event_registrations(event_id, patient_id)`
- `CREATE INDEX ON event_registrations(cancellation_token)` WHERE cancellation_token IS NOT NULL
- `CREATE INDEX ON event_waiting_list(event_id, position)`
- `CREATE INDEX ON event_invitations(event_id)`

**And** existing tables (appointments, patients, billing etc.) are untouched — no regressions.

**And** a Vitest integration test creates a test tenant schema, runs the SQL, and asserts all 5 tables + indexes exist.

## Technical Notes

### File to modify
`apps/web/src/db/tenant-schema.sql` — append the 5 new `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` blocks after existing tables.

Use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` so the SQL is idempotent (re-runnable without error).

For existing clinics, the same SQL additions must be applied. The tenant-schema.sql is applied in full on new clinic provisioning in `lib/tenant.ts`. For existing clinics, add a migration helper or document a manual step.

### Slug generation
Slug is set at event creation time (Story 12.2). The `slug` column just stores the value — no DB-level auto-generation needed.

### No Prisma models
Do NOT add Prisma models for these tables. All queries use `db.$queryRawUnsafe()`. The Prisma `schema.prisma` file only contains public-schema models (clinics, users, sessions etc.).

### Reference number format
`EVT-{eventId.substring(0,4).toUpperCase()}-{sequentialCount.toString().padStart(3,'0')}` — generated in the API layer (Story 12.2+), not the DB.

## File Locations

```
apps/web/src/db/tenant-schema.sql   ← MODIFY: append 5 new tables + indexes
```

## Test Coverage Requirements

| Test type | What to cover |
|---|---|
| Integration (Vitest) | Apply SQL to test schema; assert all 5 tables exist; assert indexes exist; assert UNIQUE constraints reject duplicates |
| Integration | Assert `seats_registered >= 0` CHECK constraint prevents negative values |
| Integration | Assert existing tables are not modified (spot-check appointments + patients columns) |
