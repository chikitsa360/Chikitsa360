---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: complete
completedAt: '2026-06-07'
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-Cliniqly-2026-06-07/prd.md
  - _bmad-output/planning-artifacts/prds/prd-Cliniqly-2026-06-07/addendum.md
  - _bmad-output/planning-artifacts/ux-designs/ux-Cliniqly-2026-06-07/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-Cliniqly-2026-06-07/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-Cliniqly-2026-06-07/.decision-log.md
  - docs/project-context.md
  - docs/monorepo-structure.md
  - docs/multi-tenant-branding.md
workflowType: architecture
project_name: Chikitsa360 / Cliniqly
user_name: Priyanka
date: '2026-06-07'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

45+ functional requirements across 11 feature domains:

| Domain | FRs | Core Purpose |
|---|---|---|
| WhatsApp Booking Flow | FR-1–6b | Patient sends "Hi" → confirmed appointment in < 60s |
| Web Booking Link | FR-7–9 | Public URL per clinic; no account required |
| Manual Appointment Entry | FR-10–12 | Walk-ins, phone bookings, receptionist corrections |
| Calendar & Slot Management | FR-13–16 | Working hours config, day/week view, no double-booking |
| Patient Database | FR-17–20 | Profile, visit history, search, deduplication |
| WhatsApp Automation | FR-21–25 | Confirmation, 24h/2h reminders, SMS fallback |
| Clinic Dashboard | FR-26–30 | Real-time today summary + weekly toggle |
| Basic Billing | FR-31–32 | Fee recording, paid/unpaid status, daily revenue |
| Multi-Role Access | FR-33–35 | Phone OTP login, RBAC (Owner/Doctor/Receptionist) |
| Clinic Onboarding | FR-36–37 | Guided setup wizard, sample appointment |
| Reports & Exports | FR-38–45b | 6 report types, screen + PDF + CSV, async fallback |

The **WhatsApp Booking Flow (FR-1–6b)** is the system's critical path. Everything else is supporting infrastructure for the core value proposition: a patient sends "Hi" and has a confirmed appointment in under 60 seconds.

**Non-Functional Requirements:**

| Category | Key NFRs |
|---|---|
| Performance | p95 < 3s webhook response (NFR-1) · < 2s dashboard load (NFR-3) · < 1s patient search (NFR-4) |
| Availability | 99.5% monthly uptime MVP (NFR-5) · 99.9% Phase 1 target |
| Security | TLS 1.3 in transit (NFR-7) · AES-256 at rest (NFR-8) · PostgreSQL RLS tenant isolation (NFR-9) · HMAC-SHA256 webhook validation (NFR-11) |
| i18n | Full English + Hindi bilingual from Day 1 — not retrofittable (NFR-12) |
| Accessibility | WCAG 2.1 AA (NFR-15) · 44px touch targets (NFR-16) |
| Connectivity | 3G capable core features (NFR-16) · < 5s web booking on 3G (NFR-17) |
| Reliability | RTO < 4h (NFR-19) · RPO < 1h (NFR-19) · Planned maintenance outside 8am–9pm IST (NFR-6) |
| Audit | 5-year immutable audit log on all staff actions to patient data (CR-12) |
| Reports | < 3s for ≤ 3-month ranges · < 8s for ≤ 12-month ranges · async fallback beyond 8s (FR-45b) |

**Scale & Complexity:**

- Primary domain: Full-stack web (Next.js) + event-driven backend (webhooks, job scheduler) + third-party API (Meta)
- Complexity level: **High** — real-time requirements, external API state machine, multi-tenancy, bilingual, compliance, async pipelines, and Vercel Free Tier deployment constraint
- MVP target: 10 clinics · 50 doctors · 5,000 patients · 500 appointments/day
- Phase 2 trigger (100+ clinics): Elasticsearch extraction · microservice consideration
- Long-term: 500+ clinics · 1M+ patient records · multi-region

### Technical Constraints & Dependencies

1. **Deployment**: Vercel Free Tier (MVP) → Vercel Pro → AWS migration path required without major rewrites
2. **Meta WhatsApp Cloud API**: Direct integration (no BSP); Meta Business verification is the longest external lead-time item (~5–10 business days total including number registration + template approval)
3. **Monorepo**: Existing Turborepo + pnpm; Next.js 15 App Router; `packages/branding/` already implemented
4. **Database**: PostgreSQL 16 on AWS RDS ap-south-1 (Mumbai) — India data residency is mandatory (DPDP CR-4)
5. **Redis**: Required for WhatsApp conversation state with AOF persistence (FR-6b); must survive pod restarts
6. **i18n**: Must be architected from Week 1 — `next-intl` or `i18next` installed before first feature is built (NFR-12)
7. **SMS Fallback**: MSG91 as WhatsApp delivery fallback, triggered within 5 minutes of WhatsApp failure (FR-24)
8. **Compliance**: DPDP Act 2023 · IT Act 2000 · WhatsApp Business Policy — patient consent, data residency, opt-out, erasure, and audit all mandatory from Day 1

### Pre-Resolved Architecture Decisions (from addendum.md)

These decisions were made prior to this architecture document and are treated as locked constraints:

| Decision | Selection | Rationale |
|---|---|---|
| WhatsApp API | Direct Meta Cloud API (no BSP) | Full control, lowest cost, no third-party dependency |
| Conversation state | Redis with AOF persistence | Durability across pod restarts; 30-min TTL per clinic+phone key |
| Real-time updates | Socket.io (WebSocket) | Portal reflects new appointments within 5s of patient confirmation |
| Backend architecture | Modular monolith for MVP | Microservice extraction deferred to Phase 2 (250+ clinics) |
| Full-text search | PostgreSQL `tsvector` | Sufficient for ≤ 10K records at MVP; Elasticsearch at Phase 2 |
| Time-series | Standard PostgreSQL + indexed timestamps | Analytics load trivial at MVP scale |
| Multi-tenancy | Shared DB, Separate Schema | Correct choice; row-level security enforces isolation |
| Data residency | AWS ap-south-1 Mumbai | Mandatory for DPDP Act 2023 compliance |
| Frontend | Next.js 15 + React 19 + Tailwind v4 | Existing monorepo; Server Components improve load performance |

### Cross-Cutting Concerns Identified

| Concern | Scope | Weight |
|---|---|---|
| Multi-tenancy (PostgreSQL RLS) | All data, all APIs, all reports, all exports | Critical |
| RBAC (Owner / Doctor / Receptionist) | Every API endpoint + every UI surface | Critical |
| Stateful WhatsApp state machine (Redis) | Webhook handler + conversation state | High |
| Real-time updates (Socket.io) | Dashboard counters, calendar, revenue | High |
| Async job scheduling | Reminder pipeline (24h/2h) + report generation | High |
| i18n (English + Hindi) | All UI copy + all WhatsApp templates | High |
| Race condition prevention | Slot reservation + optimistic locking | High |
| Immutable audit logging | All staff actions on patient data (5-year retention) | High |
| DPDP / IT Act compliance | Patient consent, erasure, opt-out, data residency | Critical |
| Observability | Webhook processing + job pipeline + uptime | Medium |

### Testing Framework

Testing is a first-class architectural concern for Chikitsa360, given the healthcare context where data integrity, slot booking correctness, RBAC enforcement, and WhatsApp flow reliability are directly patient-impacting.

**Unit Testing**

| Tool | Role |
|---|---|
| **Vitest** | Primary unit test runner for all TypeScript packages — fast, native ESM, Vite-compatible, works seamlessly in the Turborepo monorepo |
| **React Testing Library** | Component testing for `packages/ui/` and `apps/web/` — tests behaviour, not implementation |
| **@testing-library/user-event** | Realistic user interaction simulation for form flows, calendar interactions, and role-gated UI |
| **MSW (Mock Service Worker)** | API mocking in unit/component tests — intercepts fetch/axios at the network level without modifying source code |

Scope: Business logic (slot availability, token assignment, RBAC enforcement, conversation state transitions), UI components, utility functions, i18n string completeness.

**Integration Testing**

| Tool | Role |
|---|---|
| **Vitest** (with real DB) | Integration tests against a real PostgreSQL instance (via Docker) — validates RLS policies, multi-tenant isolation, optimistic locking on slot reservation |
| **Supertest** | HTTP-layer integration tests for Next.js API Routes — validates request/response contracts, auth middleware, rate limiting |
| **testcontainers-node** | Spins up PostgreSQL + Redis containers per test suite — reproducible, isolated, no shared state |
| **ioredis mock / real Redis** | Conversation state management tests — validates TTL expiry, AOF-safe state transitions, concurrent state writes |

Scope: WhatsApp booking flow end-to-end (webhook → Redis state → PostgreSQL appointment → Socket.io event), slot race condition (concurrent booking attempts), RBAC enforcement at API layer, reminder scheduling pipeline, report query correctness, RLS cross-tenant isolation.

**End-to-End Testing**

| Tool | Role |
|---|---|
| **Playwright** | E2E browser tests covering complete user journeys — Receptionist walk-in registration, Doctor appointment review, Clinic Owner report export, bilingual UI |

Scope: Critical user journeys (UJ-1 through UJ-5), role-based access gate validation, mobile viewport (360px) + desktop (1440px) breakpoints, PDF/CSV export flows.

**Test Coverage Targets**

| Layer | Target |
|---|---|
| Business logic (slot, token, RBAC, state machine) | ≥ 90% line coverage |
| API routes (unit + integration) | ≥ 80% |
| UI components | ≥ 70% |
| Critical user journeys (E2E) | 100% of named UJ-1–UJ-5 paths |

**CI Integration**

- Unit + integration tests run on every PR (Vitest with testcontainers)
- E2E tests run on merge to `main` (Playwright in CI — headed mode disabled)
- Coverage reports uploaded to Codecov or equivalent on every PR
- Database migrations tested in CI against a fresh PostgreSQL container before any merge to `main`

**Test file conventions (monorepo)**

```
packages/*/src/**/__tests__/*.test.ts   # unit tests co-located with source
apps/web/src/**/__tests__/*.test.ts     # component + API route tests
apps/web/e2e/**/*.spec.ts              # Playwright E2E specs
```

---

## Starter Template Evaluation

### Primary Technology Domain

Full-stack Next.js (App Router) monorepo — already initialized. Evaluation focused on backend library stack layered on top of existing infrastructure.

### Already Decided (Locked — No Re-evaluation)

| Decision | Selection |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 strict |
| Styling | Tailwind CSS v4 |
| Component library | @chikitsa360/ui (custom) |
| Branding | @chikitsa360/branding (multi-tenant) |
| Monorepo | Turborepo + pnpm@11.5.2 |
| Runtime | Node.js v22 |

### Selected Stack — Open Decisions Resolved

| Layer | Selection | Rationale |
|---|---|---|
| ORM | **Prisma** | Type-safe migrations, Prisma Studio debugger, strong Next.js ecosystem; RLS added at PostgreSQL layer directly |
| Auth | **next-auth v5** (Auth.js) | App Router native, HttpOnly cookie sessions, custom Credentials provider for phone OTP via MSG91 |
| Job scheduling | **BullMQ** (Redis-backed) | Redis already required; shared instance with conversation state; supports 24h/2h reminder delays, retries, async report generation |
| Real-time (MVP) | **Pusher Channels** | Vercel Free Tier does not support persistent WebSocket; client uses `usePusherChannel()` hook — swappable without component changes |
| Real-time (Phase 1) | **Standalone Socket.io server** (`apps/realtime/`) | Migrates when moving to Railway/AWS; same hook interface |
| i18n | **next-intl** | App Router native, server component support, compile-time messages, excellent TypeScript |
| Testing | Vitest + RTL + Playwright | Documented in Step 2 — Testing Framework section |

### Full Stack Summary

```
Framework:       Next.js 15 (App Router) — existing
Language:        TypeScript 5 strict — existing
Styling:         Tailwind CSS v4 — existing
Components:      @chikitsa360/ui (custom) — existing
ORM:             Prisma (PostgreSQL 16 on AWS RDS ap-south-1)
Auth:            next-auth v5 + custom OTP credentials provider
Jobs:            BullMQ (Redis — shared with WhatsApp conversation state)
Real-time MVP:   Pusher Channels (Vercel Free compatible)
Real-time P1:    Socket.io standalone server (apps/realtime/)
i18n:            next-intl
Testing:         Vitest + React Testing Library + Playwright (see Step 2)
Linting:         ESLint (@chikitsa360/eslint-config) — existing
```

**Note:** The first implementation story installs Prisma, next-auth v5, next-intl, BullMQ, and Pusher into the monorepo and configures the base project structure.

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Prisma ORM + PostgreSQL RLS (tenant isolation foundation)
- next-auth v5 OTP + RBAC middleware (all authenticated features depend on this)
- next-intl i18n (must precede any UI component)
- Multi-tenant schema provisioning on signup
- Inngest job worker (replaces BullMQ on Vercel Free; reminders and async reports depend on this)

**Important Decisions (Shape Architecture):**
- React Query + Zustand state management split
- Server Components vs Client Components boundary
- Pusher Channels → Socket.io migration path
- Zod as single schema source (shared server + client)
- `/api/v1/` versioning from Day 1

**Deferred Decisions (Post-MVP):**
- Elasticsearch FTS (Phase 2 when any clinic exceeds 50K patients)
- TimescaleDB (Phase 2 analytics)
- Microservice extraction (Phase 2 at 250+ clinics)
- Socket.io standalone server (Phase 1 when leaving Vercel Free)
- Razorpay payment integration (Phase 1)

### Data Architecture

**ORM:** Prisma (PostgreSQL 16). RLS policies written directly in PostgreSQL — not via Prisma. Schema-switching middleware reads `clinicId` from the authenticated session and sets `search_path` per request.

**Validation:** Zod schemas defined in `packages/core/src/schemas/` — imported by both API routes (server validation) and react-hook-form resolvers (client validation). Single source of truth for all DTOs.

**Migrations:** `prisma migrate dev` (local), `prisma migrate deploy` (CI/CD before every production deployment). Tenant schema provisioned via a baseline migration that runs on clinic signup.

**Caching:**
- Redis: WhatsApp conversation state (TTL 30m) + Inngest job queues
- Next.js Data Cache (`revalidateTag`): dashboard summaries and slot availability — invalidated on appointment mutations
- No caching for patient PII or billing data

**Slot Race Condition:** `SELECT ... FOR UPDATE SKIP LOCKED` on slot reservation row. 5-minute hold enforced by Inngest delayed job that releases the slot if confirmation is not received.

### Authentication & Security

**Auth flow:** Phone number → MSG91 OTP (6-digit, 10-min validity) → next-auth v5 Credentials provider → HttpOnly session cookie (30-day). Redis tracks failed OTP attempts per phone; 3 failures = 15-minute lockout.

**RBAC:** JWT session payload carries `{ clinicId, userId, role }`. API middleware enforces role + clinicId before any DB query. PostgreSQL RLS is the second enforcement layer. UI conditionally renders by role (defense-in-depth only — never the sole guard).

**Webhook security:** HMAC-SHA256 validation + timestamp check (reject if > 5 minutes old) on every inbound Meta webhook before processing.

**API security:** Upstash Rate Limit (100 req/s per clinicId). Signed S3 URLs (15-min TTL) for all patient files. Security headers via Next.js config (CSP, HSTS, X-Frame-Options).

**Audit logging:** Immutable `audit` schema (separate from tenant schemas). Every staff action on patient data written synchronously before response. 5-year retention via RDS lifecycle policy.

### API & Communication Patterns

**Design:** Next.js Route Handlers, RESTful, versioned at `/api/v1/`. Response envelope: `{ data, error, meta }`. Errors: `{ error: { code, message, details? } }`.

**Webhook processing:** Immediate 200 ACK to Meta (< 200ms) → enqueue Inngest job → worker processes asynchronously. Retry: 3 attempts with exponential backoff. Dead-letter queue for permanently failed jobs.

**Real-time:** Pusher event → client `invalidateQueries` → React Query refetch from DB. Events carry no state — they are notifications only. See Implementation Patterns for full reliability guarantee.

**Server Actions vs Route Handlers:** Server Actions for form mutations (create appointment, record payment, update patient). Route Handlers for webhooks, report generation, background worker callbacks.

### Frontend Architecture

**State split:** React Query (TanStack v5) owns all server state. Zustand owns UI-only ephemeral state (sidebar, command palette, active filters). No Redux.

**Component boundary:** Server Components by default (data-fetching pages, static layouts). Client Components (`'use client'`) for interactive islands only — calendar, real-time counters, forms, command palette.

**Routing:** Route groups `(auth)/`, `(dashboard)/`, `(booking)/`. Middleware enforces auth on `(dashboard)/*`. `clinicId` from session — not URL — for single-clinic routes.

**Performance:** `next/font` for Plus Jakarta Sans + Inter (zero FOUT). `loading.tsx` skeletons via App Router streaming. Suspense boundaries around heavy async components (reports, patient history).

**Forms:** `react-hook-form` + `@hookform/resolvers/zod` everywhere. Same Zod schema as server. Optimistic submit pattern. All datetime inputs display in IST; stored as UTC.

### Infrastructure & Deployment

**MVP (Vercel Free):**
- Web: Vercel Free | DB: Neon (serverless PostgreSQL, branch per PR) | Redis: Upstash | Jobs: Inngest | Real-time: Pusher Channels | SMS: MSG91 | Email: AWS SES | Storage: AWS S3 ap-south-1

**Inngest replaces BullMQ on Vercel Free:** BullMQ requires a persistent worker process incompatible with Vercel serverless. Inngest is serverless-native, runs job steps as HTTP callbacks. Same job interface — migrate to BullMQ at Phase 1 by swapping the job producer/consumer only.

**Phase 1 migration triggers:** 50+ clinics → AWS RDS; Redis throughput limit → ElastiCache; cost/latency → Socket.io standalone server; infra control → Railway/AWS container deployment.

**CI/CD:** PR → type-check + lint + Vitest (testcontainers) + Prisma migrate test + Vercel preview. Merge to main → all PR checks + Playwright E2E + `prisma migrate deploy` + Vercel production.

**Monitoring:** Sentry (errors), Better Uptime (synthetic uptime), Axiom (structured logs via Vercel Log Drains), Vercel Analytics (Core Web Vitals), Inngest dashboard (job monitoring).

### Decision Impact Analysis

**Implementation sequence (dependency order):**
1. Prisma schema + migrations + RLS policies
2. next-auth v5 OTP flow + RBAC middleware
3. next-intl i18n setup
4. Multi-tenant schema provisioning on clinic signup
5. WhatsApp webhook handler + Redis conversation state + Inngest worker
6. Pusher Channels + React Query setup
7. Feature development (booking flows, dashboard, reports)

**Cross-component dependencies:**
- Prisma schema ← RBAC middleware ← every API route
- Redis ← WhatsApp state machine ← Inngest jobs ← reminder pipeline
- Pusher ← React Query invalidation ← dashboard real-time counters
- Zod schemas ← react-hook-form ← all forms ← all mutations
- next-intl ← all UI components ← bilingual compliance (NFR-12)

---

## Implementation Patterns & Consistency Rules

### Real-Time Reliability Pattern (Critical)

**Your question: "How do we ensure all updates are real-time and no events are missed?"**

The core principle that solves this is:

> **Events are notifications, not state. The database is always the source of truth.**

This means Pusher events never carry appointment data in their payload. They carry only a signal: "something changed for clinic X." The client responds by asking the server for the current truth. This makes the system resilient to:
- Missed events (client was offline)
- Duplicate events (reconnect fires a spurious event)
- Out-of-order events (Pusher does not guarantee ordering)
- Corrupted payloads (payload is irrelevant — we refetch anyway)

**The complete reliability stack (layered, each layer compensates for the one above failing):**

```
Layer 1 — Push (fast path, happy path)
  Server mutation occurs
    → Server emits Pusher event to channel `private-clinic-{clinicId}`
    → Pusher delivers to all connected clients within ~200ms
    → Client React Query: invalidateQueries(['appointments', clinicId])
    → React Query refetches from /api/v1/clinics/{id}/appointments
    → UI updates with fresh server data

Layer 2 — Reconnection recovery (client was briefly offline)
  Pusher connection restored
    → Client fires onReconnect callback
    → invalidateQueries(['*']) — full cache invalidation
    → All active queries refetch immediately
    → No missed event can leave stale data after reconnect

Layer 3 — Polling fallback (Pusher is down or degraded)
  usePusherChannel() hook tracks connection state
    → If Pusher disconnects and stays disconnected > 3s:
        enablePolling = true
    → React Query refetchInterval: 10_000 (10s) activates
    → Data stays at most 10s stale during a Pusher outage
    → When Pusher reconnects: disable polling + full invalidation

Layer 4 — Optimistic updates (perceived zero-latency)
  User action (mark appointment complete, record payment)
    → React Query mutate with optimistic update
    → UI reflects change instantly before server responds
    → If server confirms: optimistic state accepted
    → If server rejects: optimistic state rolled back with error toast
    → Either way: revalidation triggered after mutation settles
```

**WhatsApp webhook reliability (inbound events from Meta):**

```
Meta fires webhook POST /api/webhooks/whatsapp
  → Handler validates HMAC signature (reject if invalid)
  → Handler validates timestamp (reject if > 5 min old)
  → Handler returns HTTP 200 immediately (< 200ms)
  → Handler enqueues Inngest job: processWhatsAppMessage

If Cliniqly does not return 200:
  → Meta retries: 5s, 30s, 5m, 30m, 2h (exponential)
  → Inngest job is idempotent (messageId deduplication key)
  → Duplicate retries produce no duplicate appointments

Inngest job processing:
  → Load Redis conversation state for {clinicId}:{phoneNumber}
  → Advance state machine step
  → Write PostgreSQL (appointment / patient) if flow completes
  → Emit Pusher event to clinic channel
  → Send WhatsApp reply via Meta API
  → If Meta API fails: Inngest retries up to 3 times (exponential backoff)
  → If permanently failed: dead-letter queue + internal Sentry alert
```

**Reminder pipeline reliability (outbound scheduled jobs):**

```
On appointment confirmation:
  → Inngest schedules two jobs:
      sendReminder24h — runs at (appointmentTime - 24h)
      sendReminder2h  — runs at (appointmentTime - 2h)
  → Both jobs carry appointmentId as idempotency key

At send time:
  → Job checks appointment status in DB
  → If status is `cancelled` or `no-show`: job exits silently (no send)
  → If status is `confirmed`: sends WhatsApp via Meta API
  → If WhatsApp delivery fails: triggers sendSMSFallback job (MSG91) within 5 min
  → If SMS also fails: logs failure against appointment, no further retry
  → All delivery attempts (success/fail) written to appointment audit trail

On backend restart / Inngest outage:
  → Inngest persists scheduled jobs in its own durable store
  → Jobs are not lost on Vercel function cold starts
  → Inngest guarantees at-least-once execution with idempotency keys
```

**Idempotency rules — all agents must follow:**

| Operation | Idempotency Key | Consequence of duplicate |
|---|---|---|
| WhatsApp inbound message | `messageId` from Meta payload | Duplicate ignored |
| Send WhatsApp message | `appointmentId + templateName` | Second send suppressed |
| Send SMS fallback | `appointmentId + 'sms'` | Second SMS suppressed |
| Create appointment | `clinicId + slotId + patientPhone` (slot lock) | Second booking gets "slot taken" |
| Pusher event handler | None needed | `invalidateQueries` is idempotent |
| Reminder job | `appointmentId + reminderType` | Duplicate job exits after DB status check |

### Naming Patterns

**Database (PostgreSQL — snake_case throughout):**
- Tables: `plural_snake_case` — `appointments`, `patients`, `clinic_slots`, `audit_logs`
- Columns: `snake_case` — `clinic_id`, `created_at`, `booking_source`
- Foreign keys: `{table_singular}_id` — `patient_id`, `doctor_id`, `clinic_id`
- Indexes: `idx_{table}_{column(s)}` — `idx_appointments_clinic_id_date`
- Tenant schemas: `tenant_{clinic_id}` (UUID with underscores replacing hyphens)

**API endpoints (kebab-case, plural nouns):**
```
GET    /api/v1/clinics/{clinicId}/appointments
POST   /api/v1/clinics/{clinicId}/appointments
PATCH  /api/v1/clinics/{clinicId}/appointments/{appointmentId}
GET    /api/v1/clinics/{clinicId}/patients
GET    /api/v1/clinics/{clinicId}/reports/revenue-summary
POST   /api/webhooks/whatsapp
```

**TypeScript (camelCase variables, PascalCase types/components):**
- Variables/functions: `camelCase` — `clinicId`, `getAppointments`, `usePusherChannel`
- Types/interfaces: `PascalCase` — `Appointment`, `ClinicOwner`, `BookingSource`
- Zod schemas: `PascalCaseSchema` — `AppointmentSchema`, `CreatePatientSchema`
- React components: `PascalCase` files and exports — `AppointmentCard.tsx`
- Next.js route files: lowercase — `page.tsx`, `layout.tsx`, `route.ts`

**Pusher events (dot-separated, noun.past-verb):**
```
appointment.created
appointment.updated
appointment.cancelled
slot.released
payment.recorded
```

**Inngest job names (dot-separated):**
```
whatsapp/message.received
reminder/24h.send
reminder/2h.send
report/generate.async
sms/fallback.send
```

### Structure Patterns

**Monorepo layout (confirmed):**
```
apps/
  web/
    src/
      app/                        # Next.js App Router
        (auth)/                   # Login, onboarding
        (dashboard)/              # Authenticated clinic app
          layout.tsx              # Auth guard + clinic context
          page.tsx                # Dashboard
          appointments/
          patients/
          reports/
          settings/
        (booking)/                # Public web booking link
          [clinicSlug]/
        api/
          v1/
            clinics/[clinicId]/   # All clinic-scoped endpoints
          webhooks/
            whatsapp/
      components/                 # App-level client components
      hooks/                      # usePusherChannel, useClinicSession
      lib/                        # Server utilities, auth config
      __tests__/                  # Component + API route tests
    e2e/                          # Playwright specs
packages/
  core/
    src/
      schemas/                    # Zod schemas (shared server + client)
      types/                      # Shared TypeScript types
      utils/                      # Pure utility functions
  ui/                             # @chikitsa360/ui components
  branding/                       # @chikitsa360/branding themes
  config/
    eslint/
    typescript/
```

**Co-location rule:** Tests live next to source in `__tests__/` subdirectory. E2E specs live in `apps/web/e2e/`.

### Format Patterns

**API response envelope (all routes must use this):**
```typescript
// Success
{ data: T, meta?: { page, total, ... } }

// Error
{ error: { code: string, message: string, details?: unknown } }
```

**Error codes (use these strings — no raw HTTP status in client code):**
```
VALIDATION_ERROR       // 400 — Zod validation failed
UNAUTHORIZED           // 401 — No valid session
FORBIDDEN              // 403 — Role insufficient
NOT_FOUND              // 404 — Resource does not exist
CONFLICT               // 409 — Slot taken, duplicate phone
RATE_LIMITED           // 429 — Tenant rate limit exceeded
INTERNAL_ERROR         // 500 — Unexpected server error
```

**Dates:** Always UTC in DB and API JSON (`ISO 8601: "2026-06-07T10:30:00.000Z"`). Always displayed in IST in UI (`new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata' })`). Never store or send IST strings to/from the API.

**JSON field naming:** `camelCase` in API responses (Prisma default). DB columns are `snake_case`; Prisma maps automatically.

### Process Patterns

**Error handling (all agents must follow):**
```typescript
// API route — always use this wrapper
export async function GET(req: Request) {
  try {
    await validateSession(req)     // throws AuthError if invalid
    await validateRole(req, ['owner', 'receptionist'])
    const data = await getAppointments(clinicId)
    return Response.json({ data })
  } catch (err) {
    return handleApiError(err)     // central handler maps errors to envelope
  }
}

// Never: return Response.json({ message: 'something went wrong' }, { status: 500 })
// Always: throw typed errors, let handleApiError() format the response
```

**Loading states (three states, always handle all three):**
```typescript
// React Query pattern — agents must handle isLoading, isError, and data
const { data, isLoading, isError } = useQuery(...)
if (isLoading) return <AppointmentListSkeleton />   // skeleton matches layout
if (isError)   return <ErrorState retry={refetch} />
return <AppointmentList data={data} />
// Never: render null during loading, never show raw error messages to users
```

**Mutations (always optimistic where applicable):**
```typescript
const mutation = useMutation({
  mutationFn: markAppointmentComplete,
  onMutate: async (vars) => {
    await queryClient.cancelQueries(['appointments', clinicId])
    const prev = queryClient.getQueryData(['appointments', clinicId])
    queryClient.setQueryData(['appointments', clinicId], optimisticUpdate(vars))
    return { prev }
  },
  onError: (err, vars, ctx) => {
    queryClient.setQueryData(['appointments', clinicId], ctx.prev)
    toast.error(formatError(err))
  },
  onSettled: () => {
    queryClient.invalidateQueries(['appointments', clinicId])
  },
})
```

**i18n (all UI strings must use next-intl — no hardcoded strings in components):**
```typescript
// Server component
const t = await getTranslations('appointments')
// Client component
const t = useTranslations('appointments')
// Usage
<Button>{t('markComplete')}</Button>
// Never: <Button>Mark Complete</Button>
```

### Enforcement Guidelines

**All agents MUST:**
1. Use the `{ data, error }` API response envelope — never return raw objects
2. Use `handleApiError()` in every route handler — never catch-and-swallow
3. Use next-intl `t()` for every user-visible string — never hardcode English
4. Use the Zod schema from `packages/core/src/schemas/` — never define local validation
5. Emit Pusher events after every appointment mutation — never skip the real-time notification
6. Check idempotency key before processing any job — never assume a job runs exactly once
7. Store and return dates as UTC — never store IST strings
8. Apply RBAC middleware before any DB query — never trust URL parameters for tenant scoping

**Anti-patterns (explicitly forbidden):**
- `console.log` in production code — use `logger.info/warn/error` (structured JSON)
- `any` type in TypeScript — use `unknown` + type guard or proper types
- Direct DB access from React components — all DB queries go through API routes or Server Component data functions
- Hardcoded `clinicId` in any query — always from authenticated session
- Pusher events that carry appointment data in payload — events are notifications only
- Polling as primary mechanism — polling is fallback only (Layer 3 in reliability stack)

---

## Architecture Validation Results

### Coherence Validation

**Decision compatibility:** All technology choices confirmed compatible. Next.js 15 App Router + next-auth v5 + next-intl + Prisma + Tailwind v4 all support React 19 and App Router. Upstash Redis works in Vercel serverless via HTTP SDK. Inngest is purpose-built for serverless environments. No conflicts.

**Clarification applied:** Inngest is the MVP job runner (Vercel-compatible). BullMQ is the Phase 1 target when a persistent worker is available. Both share the same job interface — no implementation conflict, same abstraction boundary.

**Pattern consistency:** Server Components + Route Handlers split correctly. React Query + Pusher `invalidateQueries` is coherent. Zod in `packages/core/schemas/` shared across server and client eliminates schema drift.

**Structure alignment:** Every FR domain maps to specific files. Route Handlers match API design patterns from Step 4. Layer rule (Route Handler → Service → Repository → Prisma) is respected throughout the tree.

### Requirements Coverage Validation

**Functional requirements:** All 45+ FRs across 11 domains are architecturally supported. WhatsApp Booking (FR-1–6b), Web Booking (FR-7–9), Manual Entry (FR-10–12), Calendar/Slots (FR-13–16), Patient DB (FR-17–20), Automation (FR-21–25), Dashboard (FR-26–30), Billing (FR-31–32), RBAC/Auth (FR-33–35), Onboarding (FR-36–37), Reports (FR-38–45b) — all covered.

**Non-functional requirements:** All 25 NFRs addressed — performance (caching, Server Components, slot locking), availability (synthetic monitoring), security (TLS, RLS, HMAC, rate limiting), i18n (next-intl Week 1), accessibility (WCAG 2.1 AA), reliability (Inngest at-least-once, PITR backups).

**Compliance requirements:** All 14 CRs addressed — DPDP consent in WhatsApp flow, data residency (ap-south-1), immutable audit log (5-year), opt-out handling, no HIPAA claims.

### Implementation Readiness Validation

All critical decisions documented with rationale and version context. No ambiguous TBD decisions remain. Eight mandatory rules and six explicit anti-patterns with code examples. Real-time reliability specified at the architectural level with a 4-layer guarantee model.

### Gap Analysis

**Critical gaps:** None.

**Important gaps (first implementation stories):**
1. Prisma `schema.prisma` with all models, RLS policies, and tenant schema structure — Story 1
2. WhatsApp message template content (`apt_confirmation`, `apt_reminder_24h`, `apt_reminder_2h`, `apt_cancellation`) must be submitted to Meta in Week 1 — operational, not implementation
3. `messages/en.json` and `messages/hi.json` translation keys to be defined before components are built

**Nice-to-have (post-MVP):** Database ER diagram, Prisma RLS policy examples, Storybook for `packages/ui/`.

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (MVP → Phase 2 → Long-term)
- [x] Technical constraints identified (Vercel Free, Neon, Meta API lead time)
- [x] Cross-cutting concerns mapped (10 concerns, all addressed)

**Architectural Decisions**
- [x] Critical decisions documented with versions and rationale
- [x] Technology stack fully specified (all layers, MVP and Phase 1)
- [x] Integration patterns defined (Meta API, Pusher, Inngest, MSG91, S3)
- [x] Performance considerations addressed (caching, Server Components, slot locking)

**Implementation Patterns**
- [x] Naming conventions established (DB, API, TypeScript, events, jobs)
- [x] Structure patterns defined (layer rule, co-location, route groups)
- [x] Communication patterns specified (4-layer real-time, webhook ACK, idempotency)
- [x] Process patterns documented (error handling, loading states, mutations, i18n)

**Project Structure**
- [x] Complete directory structure defined (all files named)
- [x] Component boundaries established (Server vs Client, services vs repositories)
- [x] Integration points mapped (webhook → Inngest → Pusher → React Query)
- [x] Requirements to structure mapping complete (FR-1 through FR-45b, all NFRs, all CRs)

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level: High**

**Key strengths:**
- Real-time reliability solved at architectural level — 4-layer guarantee, no single failure causes stale UI
- Multi-tenancy enforced at two independent layers (middleware + PostgreSQL RLS)
- Vercel Free constraints fully accommodated with explicit Phase 1 migration triggers — no surprise rewrites
- i18n, RBAC, audit logging, and compliance are Day 1 concerns, not retrofits
- Idempotency specified for every async operation — safe under retries and restarts

**Areas for future enhancement (Phase 1+):**
- Replace Inngest with BullMQ + persistent worker for finer retry control
- Add Socket.io standalone server (`apps/realtime/`) for sub-200ms real-time
- Add Elasticsearch FTS when any clinic exceeds 50K patient records
- Add Storybook for `packages/ui/` component documentation

### Implementation Handoff

**Story 1 — Prisma foundation:**
```bash
cd apps/web && npx prisma init
# Write schema.prisma: Clinic, Doctor, Patient, Appointment,
# Slot, StaffInvite, AuditLog, ConversationState + RLS policies
npx prisma migrate dev --name init
```

**Story 2 — Base stack install:**
```bash
pnpm add next-auth@beta @auth/prisma-adapter \
  next-intl \
  @tanstack/react-query \
  inngest \
  pusher pusher-js \
  @upstash/redis @upstash/ratelimit \
  zod react-hook-form @hookform/resolvers \
  --filter @chikitsa360/web
```

**All agents must reference this document before writing any code. This document supersedes framework defaults where conflicts exist.**

---

## Project Structure & Boundaries

### Complete Project Directory Structure

```
Cliniqly/
├── .github/
│   └── workflows/
│       ├── ci.yml                                 # PR: typecheck, lint, Vitest, Prisma migrate test, Vercel preview
│       └── e2e.yml                                # merge to main: Playwright E2E + prisma migrate deploy + prod deploy
├── apps/
│   └── web/                                       # @chikitsa360/web
│       ├── prisma/
│       │   ├── schema.prisma                      # Clinic, Doctor, Patient, Appointment, Slot, AuditLog, StaffInvite
│       │   ├── seed.ts                            # Dev seed: sample clinic + appointments
│       │   └── migrations/
│       ├── messages/
│       │   ├── en.json                            # English UI strings (NFR-12)
│       │   └── hi.json                            # Hindi UI strings (NFR-12)
│       ├── public/icons/
│       ├── e2e/                                   # Playwright E2E specs
│       │   ├── fixtures/test-clinic.ts
│       │   ├── auth.spec.ts                       # Login, OTP, session expiry (FR-34)
│       │   ├── appointments.spec.ts               # UJ-1, UJ-4 (FR-1–12)
│       │   ├── dashboard.spec.ts                  # UJ-3, UJ-5 (FR-26–30)
│       │   ├── patients.spec.ts                   # Patient search, 360 profile (FR-17–20)
│       │   ├── booking.spec.ts                    # UJ-2 web booking link (FR-7–9)
│       │   ├── reports.spec.ts                    # All 6 report types + PDF/CSV exports (FR-38–45b)
│       │   └── rbac.spec.ts                       # Role gates — 403 enforcement
│       └── src/
│           ├── middleware.ts                      # Auth guard on (dashboard)/* + RBAC enforcement
│           ├── i18n/
│           │   ├── request.ts                     # next-intl server config
│           │   └── routing.ts                     # Locale routing config
│           ├── app/
│           │   ├── globals.css
│           │   ├── layout.tsx                     # Root layout — font loading (Plus Jakarta Sans + Inter)
│           │   ├── not-found.tsx
│           │   ├── (auth)/
│           │   │   ├── layout.tsx                 # Unauthenticated shell
│           │   │   ├── login/page.tsx             # Phone OTP login (FR-34)
│           │   │   └── onboarding/
│           │   │       ├── page.tsx               # Wizard steps 1–3: clinic, doctor, hours (FR-36)
│           │   │       └── whatsapp/page.tsx      # Step 4: Meta Cloud API setup (FR-36)
│           │   ├── (dashboard)/
│           │   │   ├── layout.tsx                 # Auth guard + Pusher channel subscription
│           │   │   ├── page.tsx                   # Dashboard (FR-26–30)
│           │   │   ├── loading.tsx                # Dashboard skeleton
│           │   │   ├── appointments/
│           │   │   │   ├── page.tsx               # Calendar + agenda view (FR-13–16)
│           │   │   │   ├── loading.tsx
│           │   │   │   └── [id]/page.tsx          # Appointment detail panel
│           │   │   ├── patients/
│           │   │   │   ├── page.tsx               # Patient list + search (FR-17–20)
│           │   │   │   ├── loading.tsx
│           │   │   │   └── [id]/page.tsx          # Patient 360 profile
│           │   │   ├── reports/
│           │   │   │   ├── page.tsx               # Reports index
│           │   │   │   ├── daily/page.tsx         # FR-38
│           │   │   │   ├── revenue/page.tsx       # FR-40
│           │   │   │   ├── no-show/page.tsx       # FR-41
│           │   │   │   ├── doctor-wise/page.tsx   # FR-42
│           │   │   │   └── patient-trend/page.tsx # FR-43
│           │   │   └── settings/
│           │   │       ├── page.tsx
│           │   │       ├── clinic/page.tsx
│           │   │       ├── team/page.tsx          # Staff invite + management (FR-35)
│           │   │       ├── schedule/page.tsx      # Working hours + slot config (FR-13)
│           │   │       ├── reminders/page.tsx     # 24h/2h reminder toggles (FR-25)
│           │   │       ├── whatsapp/page.tsx      # Meta verification status
│           │   │       ├── billing/page.tsx       # Default fees per doctor (FR-31)
│           │   │       └── appearance/page.tsx    # Theme switcher (Light/Dark/HC)
│           │   ├── (booking)/
│           │   │   └── book/[clinicSlug]/
│           │   │       ├── page.tsx               # Public slot browser (FR-7–8)
│           │   │       └── confirm/page.tsx       # Booking confirmation (FR-9)
│           │   └── api/
│           │       ├── v1/
│           │       │   ├── auth/
│           │       │   │   ├── [...nextauth]/route.ts
│           │       │   │   └── otp/route.ts       # POST send OTP via MSG91
│           │       │   ├── clinics/
│           │       │   │   ├── route.ts           # POST create clinic (signup)
│           │       │   │   └── [clinicId]/
│           │       │   │       ├── route.ts
│           │       │   │       ├── dashboard/route.ts
│           │       │   │       ├── appointments/
│           │       │   │       │   ├── route.ts
│           │       │   │       │   └── [id]/
│           │       │   │       │       ├── route.ts
│           │       │   │       │       ├── complete/route.ts
│           │       │   │       │       └── cancel/route.ts
│           │       │   │       ├── patients/
│           │       │   │       │   ├── route.ts
│           │       │   │       │   └── [id]/
│           │       │   │       │       ├── route.ts
│           │       │   │       │       └── export/route.ts  # PDF (FR-39)
│           │       │   │       ├── slots/
│           │       │   │       │   ├── route.ts
│           │       │   │       │   └── [id]/
│           │       │   │       │       ├── reserve/route.ts # FR-4 — SELECT FOR UPDATE
│           │       │   │       │       └── block/route.ts   # FR-16
│           │       │   │       ├── reports/
│           │       │   │       │   ├── daily/route.ts
│           │       │   │       │   ├── revenue/route.ts
│           │       │   │       │   ├── no-show/route.ts
│           │       │   │       │   ├── doctor-wise/route.ts
│           │       │   │       │   ├── patient-trend/route.ts
│           │       │   │       │   └── async/route.ts       # FR-45b async status
│           │       │   │       ├── team/
│           │       │   │       │   ├── route.ts
│           │       │   │       │   └── [memberId]/route.ts
│           │       │   │       └── settings/
│           │       │   │           ├── route.ts
│           │       │   │           ├── schedule/route.ts
│           │       │   │           └── whatsapp/route.ts
│           │       │   └── booking/[clinicSlug]/
│           │       │       ├── route.ts           # GET public clinic + slots (FR-7)
│           │       │       └── confirm/route.ts   # POST book (FR-8–9)
│           │       └── webhooks/
│           │           ├── whatsapp/route.ts      # Meta Cloud API inbound (FR-1)
│           │           └── inngest/route.ts       # Inngest job callbacks
│           ├── components/
│           │   ├── shell/
│           │   │   ├── Sidebar.tsx
│           │   │   ├── Topbar.tsx
│           │   │   ├── BottomTabBar.tsx           # Mobile — 5 tabs + FAB
│           │   │   ├── CommandPalette.tsx         # Global search (⌘K / Ctrl+K)
│           │   │   └── QuickActionFAB.tsx
│           │   ├── appointments/
│           │   │   ├── AppointmentCalendar.tsx    # Day/week grid (FR-14)
│           │   │   ├── AppointmentCard.tsx
│           │   │   ├── AppointmentDetail.tsx
│           │   │   ├── NewAppointmentForm.tsx     # Manual entry (FR-10)
│           │   │   ├── WalkinForm.tsx             # Walk-in (FR-11)
│           │   │   ├── RescheduleModal.tsx        # FR-12
│           │   │   └── StatusBadge.tsx
│           │   ├── patients/
│           │   │   ├── PatientSearch.tsx          # FR-19
│           │   │   ├── PatientProfile.tsx         # 360 view tabs
│           │   │   ├── PatientTimeline.tsx        # Visit history (FR-18)
│           │   │   ├── VisitNoteForm.tsx          # Doctor/Owner only (FR-18)
│           │   │   └── PatientForm.tsx
│           │   ├── dashboard/
│           │   │   ├── StatCard.tsx              # Wraps @chikitsa360/ui StatCard
│           │   │   ├── UpcomingFeed.tsx          # FR-29 — real-time via Pusher
│           │   │   ├── RevenueCounter.tsx        # FR-28 — real-time
│           │   │   └── WeeklyToggle.tsx          # FR-30
│           │   ├── billing/
│           │   │   ├── RecordPaymentForm.tsx     # FR-31
│           │   │   └── PaymentStatusBadge.tsx
│           │   ├── reports/
│           │   │   ├── ReportDatePicker.tsx      # FR-45
│           │   │   ├── RevenueBarChart.tsx       # FR-40
│           │   │   ├── PatientTrendChart.tsx     # FR-43
│           │   │   ├── ReportDataTable.tsx       # Sortable, filterable
│           │   │   └── ExportButtons.tsx         # PDF + CSV
│           │   ├── settings/
│           │   │   ├── WorkingHoursForm.tsx      # FR-13
│           │   │   ├── InviteStaffForm.tsx       # FR-35
│           │   │   ├── WhatsAppSetupWizard.tsx   # FR-36 step 4
│           │   │   └── ThemeSwitcher.tsx         # DESIGN.md theme presets
│           │   └── booking/
│           │       ├── SlotPicker.tsx            # FR-8
│           │       ├── BookingForm.tsx
│           │       └── BookingConfirmation.tsx
│           ├── hooks/
│           │   ├── usePusherChannel.ts           # 4-layer real-time reliability
│           │   ├── useClinicSession.ts           # Session + clinicId from next-auth
│           │   ├── useAppointments.ts            # TanStack Query wrappers
│           │   ├── usePatients.ts
│           │   ├── useSlots.ts
│           │   ├── useDashboard.ts
│           │   └── useReports.ts
│           ├── lib/
│           │   ├── auth.ts                       # next-auth v5 config + OTP credentials
│           │   ├── prisma.ts                     # Prisma client singleton + tenant schema middleware
│           │   ├── redis.ts                      # Upstash Redis client
│           │   ├── pusher-server.ts              # Pusher server-side trigger
│           │   ├── pusher-client.ts              # Pusher browser client
│           │   ├── inngest.ts                    # Inngest client + all job definitions
│           │   ├── msg91.ts                      # SMS send wrapper
│           │   ├── meta-whatsapp.ts              # Meta Cloud API send + HMAC validate
│           │   ├── pdf.ts                        # Report PDF generation
│           │   ├── s3.ts                         # AWS S3 signed URL generation (NFR-22)
│           │   ├── rate-limit.ts                 # Upstash rate limiter (NFR-21)
│           │   ├── api-error.ts                  # Error types + handleApiError()
│           │   ├── audit.ts                      # Immutable audit log writer (CR-12)
│           │   └── tenant.ts                     # schema-switch middleware per request
│           ├── jobs/                             # Inngest job handlers
│           │   ├── whatsapp-flow.ts             # processWhatsAppMessage (FR-1–6)
│           │   ├── reminders.ts                 # send24hReminder, send2hReminder (FR-22–23)
│           │   ├── sms-fallback.ts              # sendSMSFallback (FR-24)
│           │   └── reports.ts                   # generateAsyncReport (FR-45b)
│           ├── services/                         # Business logic — no direct DB access
│           │   ├── appointments.ts              # Token assignment, slot reservation, cancellation
│           │   ├── patients.ts                  # Deduplication, profile management
│           │   ├── slots.ts                     # Availability query, blocking, race-condition guard
│           │   ├── whatsapp-flow.ts            # Conversation state machine (FR-1–6b)
│           │   ├── reminders.ts                # Schedule / cancel reminder jobs
│           │   ├── billing.ts                  # Fee recording, revenue aggregation
│           │   ├── reports.ts                  # Query orchestration + PDF/CSV generation
│           │   ├── auth.ts                     # OTP generation, rate-limit check, session
│           │   └── onboarding.ts               # Wizard step completion, sample appointment
│           └── repositories/                   # DB access — Prisma only, no business logic
│               ├── appointments.ts
│               ├── patients.ts
│               ├── slots.ts
│               ├── clinics.ts
│               ├── staff.ts
│               └── audit.ts
├── packages/
│   ├── core/                                   # @chikitsa360/core
│   │   └── src/
│   │       ├── schemas/                        # Zod DTOs — shared server + client
│   │       │   ├── appointment.ts
│   │       │   ├── patient.ts
│   │       │   ├── clinic.ts
│   │       │   ├── slot.ts
│   │       │   ├── staff.ts
│   │       │   ├── billing.ts
│   │       │   └── report.ts
│   │       ├── types/
│   │       │   ├── appointment.ts              # AppointmentStatus, BookingSource enums
│   │       │   ├── patient.ts
│   │       │   └── roles.ts                    # Role enum
│   │       └── utils/
│   │           ├── dates.ts                    # UTC ↔ IST display helpers
│   │           ├── tokens.ts                   # Daily token sequence logic
│   │           └── phone.ts                    # Indian phone number validation
│   ├── branding/                               # @chikitsa360/branding — existing
│   ├── ui/                                     # @chikitsa360/ui — existing + new components
│   └── config/                                 # eslint + typescript — existing
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### Architectural Boundaries

**API access tiers:**

| Tier | Routes | Auth | Role check |
|---|---|---|---|
| Public | `/api/v1/booking/*`, `/api/webhooks/whatsapp` | None | None |
| Any authenticated | `/api/v1/clinics/[id]/appointments` GET, patients GET | Session | clinicId match |
| Owner + Doctor | Patient export, visit notes | Session | role = owner \| doctor |
| Owner only | Revenue reports, settings, team management | Session | role = owner |

**Layer rule (strict — no skipping):**
```
Route Handler → Service → Repository → Prisma → PostgreSQL
```
Repositories only do DB access. Services only do business logic. Route Handlers only do HTTP concerns.

### Requirements to Structure Mapping

| FR Domain | Primary files |
|---|---|
| WhatsApp Booking (FR-1–6b) | `jobs/whatsapp-flow.ts`, `services/whatsapp-flow.ts`, `lib/redis.ts`, `lib/meta-whatsapp.ts` |
| Web Booking Link (FR-7–9) | `app/(booking)/book/[clinicSlug]/`, `api/v1/booking/[clinicSlug]/` |
| Manual Entry / Walk-in (FR-10–12) | `components/appointments/NewAppointmentForm.tsx`, `WalkinForm.tsx`, `services/appointments.ts` |
| Calendar & Slots (FR-13–16) | `components/appointments/AppointmentCalendar.tsx`, `services/slots.ts`, `repositories/slots.ts` |
| Patient Database (FR-17–20) | `components/patients/`, `services/patients.ts`, `repositories/patients.ts` |
| WhatsApp Automation (FR-21–25) | `jobs/reminders.ts`, `jobs/sms-fallback.ts`, `lib/msg91.ts` |
| Dashboard (FR-26–30) | `app/(dashboard)/page.tsx`, `components/dashboard/`, `hooks/useDashboard.ts` |
| Billing (FR-31–32) | `components/billing/RecordPaymentForm.tsx`, `services/billing.ts` |
| Auth + RBAC (FR-33–35) | `middleware.ts`, `lib/auth.ts`, `lib/rate-limit.ts` |
| Onboarding (FR-36–37) | `app/(auth)/onboarding/`, `services/onboarding.ts` |
| Reports (FR-38–45b) | `app/(dashboard)/reports/`, `components/reports/`, `services/reports.ts`, `jobs/reports.ts` |
| Audit (CR-12) | `lib/audit.ts`, `repositories/audit.ts` |
| i18n (NFR-12) | `messages/en.json`, `messages/hi.json`, `i18n/request.ts` |
| Multi-tenancy (NFR-9) | `lib/tenant.ts`, `prisma/schema.prisma` (RLS) |
| Real-time (FR-5, FR-14) | `lib/pusher-server.ts`, `lib/pusher-client.ts`, `hooks/usePusherChannel.ts` |
