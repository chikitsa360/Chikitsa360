---
epic: 13
title: Patient Invitation & Public Registration
status: Not Started
created: 2026-06-10
stories: 7
---

# Epic 13: Patient Invitation & Public Registration

## Goal

Staff can select and invite clinic patients via a WhatsApp blast directly from the event creation modal, and patients can register via the public link with race-safe seat allocation, duplicate detection, and waiting list fallback — with full visibility in the event detail tabs.

## User Outcome

After this epic is complete:
- Step 2 of the New Event modal lets staff search/select patients and send WhatsApp invitations
- Invited patients receive a WhatsApp message with the registration link
- Patients can open /events/[slug] (no login required) and register in 3 steps: fill form → seat allocated → confirmation shown
- When seats are full, patients can join the waiting list and see their position
- If a patient cancels, the next waitlist person is auto-promoted and notified (stub — full WA confirm in Epic 14)
- Admin event detail page shows live Registrants, Waiting List, and Invitations tabs

## Requirements Covered

| Category | Items |
|---|---|
| Functional | FR-6 (patient selection), FR-7 (WA blast), FR-8 (public registration page), FR-9 (seat allocation), FR-10 (duplicate check), FR-11 (waiting list), FR-12 (auto-promotion), FR-23 (fee display), FR-20b/c/d (registrants + waiting list + invitations tabs) |
| NFRs | NFR-1 (race-safe SELECT FOR UPDATE), NFR-2 (PUBLIC_API_PATHS), NFR-6 (rate cap ≤100/min) |
| Technical | TECH-3 (PUBLIC_API_PATHS), TECH-4 (Inngest invitation-blast), TECH-6 (reuse WA sender + rate cap) |
| UX Design | UX-4 (modal step 2), UX-5 (public registration 3 states) |

## Stories

| # | Title | Status |
|---|---|---|
| [13.1](story-13-01-invite-patients-modal-step2.md) | New Event Modal — Step 2 (Invite Patients) | Not Started |
| [13.2](story-13-02-invitation-records-api.md) | Invitation Records API | Not Started |
| [13.3](story-13-03-whatsapp-invitation-blast.md) | WhatsApp Invitation Blast Inngest Job | Not Started |
| [13.4](story-13-04-public-registration-page.md) | Public Registration Page | Not Started |
| [13.5](story-13-05-registration-api-seat-allocation.md) | Registration API — Seat Allocation & Waiting List | Not Started |
| [13.6](story-13-06-registration-flow-ui.md) | Registration Flow UI — Form, Waitlist, and Confirmation States | Not Started |
| [13.7](story-13-07-event-detail-registrants-tabs.md) | Event Detail — Registrants, Waiting List, and Invitations Tabs | Not Started |

## Dependencies

Depends on Epic 12 (DB schema must exist). Epics 14 and 15 depend on this epic (registrations must exist for notifications and attendance).

## Key Technical Decisions

- **Race-safe allocation:** `BEGIN; SELECT ... FOR UPDATE on events row; check seats; INSERT registration; UPDATE seats_registered; COMMIT` — mirrors Epic 03 slot locking in `lib/whatsapp/slot-lock.ts`
- **Patient resolution:** Phone lookup in tenant `patients` table; create new patient if not found (same pattern as Epic 04 booking API)
- **Invitation blast:** Inngest function with `step.sleep('60s')` between batches of 100; idempotency key `${eventId}:invite-blast`
- **Public routes:** Add `/api/v1/events/by-slug/`, `/api/v1/events/[slug]/register` to `PUBLIC_API_PATHS` in middleware
- **Duplicate check:** Return 409 with existing `referenceNumber` if same patient_id + event_id already registered
- **Waiting list position:** `COUNT(*) WHERE event_id = ? AND status = 'waiting'` + 1
