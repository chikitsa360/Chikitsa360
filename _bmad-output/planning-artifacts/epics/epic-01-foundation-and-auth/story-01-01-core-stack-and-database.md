---
story: 1.1
epic: 1
title: Core Stack Installation & Database Schema
status: review
created: 2026-06-07
baseline_commit: d8174b38e545265d7e7f04c6f5009c2dfbbdd15c
requirements:
  arch: [ARCH-1, ARCH-4, ARCH-5, ARCH-6, ARCH-7, ARCH-12, ARCH-14]
  compliance: [CR-4, CR-5, CR-8, CR-12, CR-14]
  nfr: [NFR-7, NFR-8, NFR-9, NFR-21]
---

# Story 1.1: Core Stack Installation & Database Schema

## User Story

As a developer,
I want the core stack installed and the initial database schema created with multi-tenant isolation,
So that all feature development has a working, secure foundation without infrastructure friction.

## Context

The monorepo already has: Turborepo + pnpm, Next.js 15 App Router, Tailwind CSS v4, `@chikitsa360/ui`, `@chikitsa360/branding`. This story adds the data and infrastructure layers on top.

**Key architectural decisions:**
- PostgreSQL 16 on Neon (dev) / AWS RDS ap-south-1 (prod) — India data residency (DPDP CR-4)
- Shared DB, separate schema per clinic (`clinic_{clinicId}`) — multi-tenancy via PostgreSQL RLS
- Upstash Redis — AOF persistence, used for conversation state, OTP attempts, rate limiting
- Inngest — serverless job runner (Vercel Free Tier compatible; no persistent workers needed)
- Pusher Channels — managed WebSocket service for MVP real-time (→ Socket.io Phase 1)
- Zod schemas in `packages/core/src/schemas/` — shared server + client validation
- API response envelope: `{ data, error, meta }` on all `/api/v1/` routes

## Acceptance Criteria

**Given** the monorepo with existing Next.js 15 setup,
**When** `pnpm install` is run after adding new packages,
**Then** the following packages are installed with no peer-dependency errors:
- `prisma` + `@prisma/client` (in `apps/web`)
- `next-auth` v5 (in `apps/web`)
- `next-intl` (in `apps/web`)
- `inngest` (in `apps/web`)
- `pusher` + `pusher-js` (server + client SDKs in `apps/web`)
- `@upstash/redis` + `@upstash/ratelimit` (in `apps/web`)
- `msw` (in `apps/web` devDependencies)
- `testcontainers` (in `apps/web` devDependencies)
- `zod` (in `packages/core`)

**Given** Prisma is installed and `prisma/schema.prisma` is configured,
**When** `prisma migrate deploy` runs against a fresh PostgreSQL 16 database,
**Then** the migration creates all of the following in the `public` schema:
- `clinics` table: id, name, slug, plan, trial_ends_at, created_at
- `users` table: id, phone, name, role, clinic_id, created_at
- `sessions` table: id, user_id, expires_at, device_fingerprint, created_at
- `otp_attempts` table: id, phone, attempts, locked_until, created_at
- `staff_invites` table: id, clinic_id, phone, role, token, status, expires_at, created_at
And creates a separate `audit` schema with:
- `audit_logs` table: id, clinic_id, user_id, action, resource_type, resource_id, metadata (JSONB), created_at
- Application role has INSERT only on `audit_logs` — no UPDATE, DELETE, or TRUNCATE privileges

**Given** a new Clinic signs up (signup handler runs),
**When** the tenant provisioning function is called with a `clinicId`,
**Then** a new PostgreSQL schema `clinic_{clinicId}` is created and a baseline migration creates the following clinic-scoped tables within it:
- `appointments` (id, patient_id, doctor_id, slot_id, status, token_number, booking_source, created_at, updated_at)
- `patients` (id, phone, name, dob, gender, first_visit_reason, created_at, updated_at)
- `doctors` (id, user_id, name, speciality, default_fee, created_at)
- `slots` (id, doctor_id, start_time, end_time, status, date, created_at)
- `slot_blocks` (id, doctor_id, start_time, end_time, reason, recurrence, created_at)
- `visit_notes` (id, appointment_id, doctor_id, note, created_at, updated_at)
- `billing_records` (id, appointment_id, fee_amount, payment_status, created_at, updated_at)
- `whatsapp_conversations` (id, patient_id, messages (JSONB), opt_out_at, created_at)
- `working_hours` (id, doctor_id, day_of_week, start_time, end_time, is_active)
- `notification_settings` (id, clinic_id, reminder_24h_enabled, reminder_2h_enabled)

**Given** multiple clinics exist in the database,
**When** Clinic A's Prisma middleware sets `search_path = clinic_A, public` and runs a query,
**Then** PostgreSQL RLS policies ensure Clinic A cannot read Clinic B's tables — verified by an integration test using a real PostgreSQL 16 container (testcontainers-node) that asserts cross-tenant queries return 0 rows.

**Given** an authenticated API request arrives with a valid session containing `clinicId`,
**When** the Prisma request middleware runs,
**Then** `SET search_path TO clinic_{clinicId}, public` is executed before any Prisma query within that request context.

**Given** the API layer is configured,
**When** any route handler in `apps/web/src/app/api/v1/` sends a response,
**Then** it follows the standard envelope:
  - Success: `{ data: <payload>, meta: { timestamp, version: 'v1' } }`
  - Error: `{ error: { code: string, message: string, details?: unknown } }`

**Given** `next.config.ts` is configured,
**When** any page or API response is served,
**Then** the following HTTP headers are present: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.

**Given** Upstash Redis is configured via environment variables (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`),
**When** `lib/redis.ts` is imported and a Redis command runs,
**Then** the command succeeds; the Redis client is a singleton exported from `apps/web/src/lib/redis.ts`.

**Given** Inngest is configured with `INNGEST_EVENT_KEY` environment variable,
**When** the Inngest route handler at `/api/inngest` is hit by the Inngest dev server,
**Then** registered Inngest functions are listed; test events can be triggered from the Inngest dashboard.

**Given** Pusher is configured via environment variables (`PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`),
**When** a server-side Pusher trigger fires on channel `clinic-{clinicId}`,
**Then** a subscribed Pusher client receives the event within 2 seconds.

**Given** Zod is installed in `packages/core`,
**When** any DTO or shared schema is defined,
**Then** it lives in `packages/core/src/schemas/` and is exported via the package's index; it can be imported in `apps/web` API routes and react-hook-form resolvers without duplication.

**Given** Upstash Rate Limit is configured at 100 req/s per clinicId,
**When** a `clinicId` exceeds 100 requests in 1 second,
**Then** the API middleware returns HTTP 429 with `Retry-After` header; requests under the limit succeed normally.

## Technical Notes

- Schema provisioning runs in a Next.js Server Action triggered at clinic signup completion
- Use `prisma.$executeRaw` for `SET search_path` — not supported by Prisma middleware natively
- RLS policies: use `current_setting('app.clinic_id')` to enforce row isolation; set via `SET app.clinic_id = '{clinicId}'` before queries
- Prisma client is a singleton in `apps/web/src/lib/db.ts`
- Audit schema: create via a raw SQL migration (not Prisma models) — the `audit_logs` table must not appear in Prisma's default schema to avoid accidental access
- Redis key namespacing convention: `{clinicId}:{patientPhone}:conversation`, `otp:{phone}:attempts`, `ratelimit:{clinicId}`

## File Locations

```
apps/web/
  prisma/
    schema.prisma           ← Prisma schema (public schema models)
    migrations/             ← Prisma migration files
    baseline/               ← Tenant schema baseline SQL (run on clinic_* schema creation)
  src/
    app/api/v1/             ← All API routes under /api/v1/
    app/api/inngest/        ← Inngest route handler
    lib/
      db.ts                 ← Prisma singleton
      redis.ts              ← Upstash Redis singleton
      pusher.ts             ← Pusher server + client config
      rate-limit.ts         ← Upstash Rate Limit config
      tenant.ts             ← Schema provisioning + search_path middleware
      audit.ts              ← Audit log writer helper
packages/core/
  src/schemas/              ← Zod DTOs (appointments, patients, clinics, auth)
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Integration (testcontainers) | RLS cross-tenant isolation; schema provisioning; migration idempotency | 100% of scenarios |
| Integration | Redis set/get/expire; rate limit enforcement | Core paths |
| Unit | Zod schema validation (valid + invalid inputs) | ≥ 90% |

## Compliance Notes

- **CR-4:** Prisma DATABASE_URL for production points to AWS RDS ap-south-1 (Mumbai). Must not use non-India regions.
- **CR-12:** `audit_logs` table in `audit` schema with INSERT-only application privileges. 5-year retention enforced via AWS RDS automated backup lifecycle policy (configured in infrastructure).
- **CR-14:** No code, comment, or documentation references "HIPAA compliant" — AWS HIPAA-eligible services are used for security best practices only.
- **NFR-8:** AES-256 at rest — enabled at AWS RDS level (storage encryption). No application-level encryption needed for MVP.
- **NFR-7:** TLS 1.3 in transit — enforced by Vercel (HTTPS only) and AWS RDS (SSL required).
