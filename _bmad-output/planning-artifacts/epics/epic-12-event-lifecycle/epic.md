---
epic: 12
title: Event Lifecycle & Admin Portal
status: Not Started
created: 2026-06-10
stories: 8
---

# Epic 12: Event Lifecycle & Admin Portal

## Goal

Clinic staff can create, configure, publish, edit, and cancel events — including recurring series — and view them in the admin portal with full status tracking, series grouping, and seat availability at a glance.

## User Outcome

After this epic is complete:
- Staff can create single events or recurring daily/weekly series via a 2-step modal
- Each event can be saved as draft, published, edited (with series scope selector), or cancelled
- The admin portal shows an Events page in the sidebar with stat cards, filter tabs, series expand/collapse, and a seats progress bar
- Each event has a detail page with an Overview tab showing all info and edit/cancel actions
- The DB schema (events, event_series, event_registrations, event_waiting_list, event_invitations tables) is ready for Epics 13–15

## Requirements Covered

| Category | Items |
|---|---|
| Functional | FR-1 (event creation), FR-2 (recurrence), FR-3 (edit with series scope), FR-4 (publish), FR-5 (cancel), FR-19 (admin events list), FR-20a (event detail overview tab) |
| NFRs | NFR-5 (tenant isolation), NFR-7 (audit log) |
| Technical | TECH-1 (DB tables), TECH-2 (sidebar nav) |
| UX Design | UX-1 (sidebar nav), UX-2 (events list), UX-3 (overview tab), UX-4 (modal step 1), UX-7 (series grouping), UX-8 (status badges) |

## Stories

| # | Title | Status |
|---|---|---|
| [12.1](story-12-01-tenant-db-schema.md) | Tenant DB Schema — Events Tables | Not Started |
| [12.2](story-12-02-event-creation-api.md) | Event Creation API | Not Started |
| [12.3](story-12-03-new-event-modal-step1.md) | New Event Modal — Step 1 (Event Details Form) | Not Started |
| [12.4](story-12-04-admin-events-list-page.md) | Admin Events List Page | Not Started |
| [12.5](story-12-05-events-list-api.md) | Events List API | Not Started |
| [12.6](story-12-06-event-detail-overview-tab.md) | Event Detail Page — Overview Tab | Not Started |
| [12.7](story-12-07-edit-event.md) | Edit Event | Not Started |
| [12.8](story-12-08-publish-and-cancel-event.md) | Publish and Cancel Event | Not Started |

## Dependencies

Epic 12 is the foundation for all Events module work. Epics 13, 14, and 15 depend on the DB schema (Story 12.1) being in place first.

## Key Technical Decisions

- **DB tables:** All 5 event tables live in `clinic_{clinicId}` tenant schema; added to `apps/web/src/db/tenant-schema.sql`
- **Slug generation:** Reuse `generateSlug()` from `apps/web/src/lib/slug.ts`
- **Recurrence:** Generates N independent Event records linked by `series_id`; each event is independently editable after generation
- **Series edit scope:** "This and future" creates a series split (new series_id from that point); "All events" updates all sharing the current series_id
- **Status machine:** `draft → published → cancelled | completed` (no backward transitions)
- **Inngest stub:** Cancel action fires `event/cancel.notify` Inngest event; the Inngest function is implemented in Epic 14
- **Audit:** All create/edit/cancel/publish actions written to audit_log with `writeAuditLog()` from `lib/audit.ts`
