---
story: 13.4
epic: 13
title: Public Registration Page
status: done
created: 2026-06-10
requirements:
  fr: [FR-8, FR-23]
  nfr: [NFR-2]
  tech: [TECH-3]
---

# Story 13.4: Public Registration Page

## User Story

As a patient who received an event invitation,
I want to open the /events/[slug] link and see event details with seat availability,
So that I can decide whether to register.

## Context

This is a public page — no authentication required. It lives in a separate route group `(event-registration)` similar to how `(booking)` is used for the web booking link (Epic 04). The actual registration form interaction is Story 13.6; this story creates the page shell and the public API endpoint for fetching event data.

**UX reference:** `_bmad-output/planning-artifacts/ux-designs/ux-Cliniqly-2026-06-07/mockups/event-registration.html`

## Acceptance Criteria

**Given** I open `/events/[slug]` in a browser (no login)
**When** the page loads for a published event
**Then** I see:
- Clinic name header (fetched from clinic record) with "Powered by Chikitsa360" footer text
- Event title as H1
- Series label (e.g., "Part of weekly series") if applicable
- Meta chips: formatted date/time, venue or meeting link, fee ("₹150") or "Free"
- Seat availability block: Max Seats, Registered, Remaining — with a progress bar
- Registration form area (populated in Story 13.6)

**Given** the event has `status=draft`
**When** the page loads
**Then** shows "This event is not open for registration yet." (no form)

**Given** the event has `status=cancelled`
**When** the page loads
**Then** shows "This event has been cancelled."

**Given** the event has `status=completed`
**When** the page loads
**Then** shows "This event has ended."

**Given** `registration_deadline` is set and has passed
**When** the page loads (event still published)
**Then** shows "Registration is closed." (no form)

**Given** no event exists with this slug
**When** the page loads
**Then** Next.js `notFound()` — standard 404 page

**And** `GET /api/v1/events/by-slug/[slug]` is public (no auth), returns event data + clinic name + seat counts
**And** this endpoint is added to `PUBLIC_API_PATHS` in middleware

## Technical Notes

### Route group
`apps/web/src/app/(event-registration)/events/[slug]/page.tsx` — no sidebar, no auth. Similar to `app/(booking)/book/[slug]/`.

### Middleware PUBLIC_API_PATHS
`apps/web/src/middleware.ts` — add to the `PUBLIC_API_PATHS` array:
```ts
'/api/v1/events/by-slug/',
```

### Public API endpoint
`apps/web/src/app/api/v1/events/by-slug/[slug]/route.ts`
```ts
// No auth check — public endpoint
// Fetch clinic by slug lookup: SELECT clinic_id FROM events WHERE slug = $1 across all tenant schemas
// OR: require clinicId as query param: GET /api/v1/events/by-slug/[slug]?clinicId=...
```
**Implementation choice:** Since events are in per-tenant schemas, the by-slug lookup needs to identify the clinic. Options:
1. Add a global `public.event_slugs (slug TEXT, clinic_id TEXT)` table populated on event creation (preferred for performance)
2. Pass clinicId in the URL as query param (simpler but less clean)

**Recommended:** Option 1 — create a `public.event_slugs` table in the Prisma migration (Story 12.1 can be retroactively updated, or add here). Add `INSERT INTO public.event_slugs (slug, clinic_id) VALUES ($1, $2) ON CONFLICT DO NOTHING` on event creation (Story 12.2).

### Page layout (no sidebar)
The `(event-registration)` route group has its own `layout.tsx` without `DashboardShell` — just a minimal page wrapper:
```tsx
// apps/web/src/app/(event-registration)/layout.tsx
export default function EventRegistrationLayout({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-background">{children}</main>
}
```

### IST datetime formatting
```ts
const formattedDate = new Date(start_time).toLocaleDateString('en-IN', {
  timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
})
```

## File Locations

```
apps/web/src/app/(event-registration)/layout.tsx                     ← CREATE
apps/web/src/app/(event-registration)/events/[slug]/page.tsx         ← CREATE
apps/web/src/app/api/v1/events/by-slug/[slug]/route.ts              ← CREATE
apps/web/src/middleware.ts                                            ← MODIFY: add public path
prisma/migrations/ (or tenant-schema.sql)                            ← MODIFY: add public.event_slugs if option 1
```

## Test Coverage Requirements

| Test type | What to cover |
|---|---|
| Integration | GET /api/v1/events/by-slug/[slug] returns event + clinic for published; 404 for unknown slug |
| Integration | No auth required — request without session cookie succeeds |
| Unit (RTL) | Correct message shown for draft/cancelled/completed/deadline-passed states |
