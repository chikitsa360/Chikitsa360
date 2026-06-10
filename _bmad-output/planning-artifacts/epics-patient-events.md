---
stepsCompleted: [1, 2]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-Cliniqly-2026-06-10/prd.md
  - _bmad-output/planning-artifacts/prds/prd-Cliniqly-2026-06-10/.decision-log.md
  - _bmad-output/planning-artifacts/ux-designs/ux-Cliniqly-2026-06-07/mockups/events-list.html
  - _bmad-output/planning-artifacts/ux-designs/ux-Cliniqly-2026-06-07/mockups/event-detail.html
  - _bmad-output/planning-artifacts/ux-designs/ux-Cliniqly-2026-06-07/mockups/new-event.html
  - _bmad-output/planning-artifacts/ux-designs/ux-Cliniqly-2026-06-07/mockups/event-registration.html
---

# Cliniqly — Patient Events Module: Epic Breakdown

## Overview

This document provides the epic and story breakdown for the Patient Events Module (Epics 12–15), decomposing requirements from the Events PRD, UX mockups, and existing architecture patterns into implementable stories.

**Output structure:**
```
_bmad-output/planning-artifacts/epics/
  epic-12-event-lifecycle/
    epic.md
    story-12-01-...
  epic-13-registration/
    epic.md
    story-13-01-...
  epic-14-notifications/
    epic.md
    story-14-01-...
  epic-15-attendance/
    epic.md
    story-15-01-...
```

---

## Requirements Inventory

### Functional Requirements (23 FRs)

```
FR-1:  Event creation — title, description, date/time, venue or meeting link, max seats,
       optional registration deadline, optional fee (display only). All roles can create.

FR-2:  Recurrent events — daily or weekly recurrence, N occurrences (up to 52). Generates N
       independent Event records linked by series_id. Each event independently editable after
       generation.

FR-3:  Edit event — single event, this-and-future (series split), or all events in series.
       Only draft/published events are editable. Locked fields after first registration (seat
       reduction below registered count blocked).

FR-4:  Publish event — draft → published state transition. Published events become visible
       on the public registration page.

FR-5:  Cancel event — sets status = cancelled. Triggers cancellation notifications to all
       confirmed registrants (FR-16).

FR-6:  Patient selection for invitation — multi-select from clinic patient directory.
       Filter by name/phone. Show last-visit date. Selection stored as event_invitations.

FR-7:  WhatsApp invitation blast — sends WA template message to all selected patients
       with event details + registration link. Inngest job, rate-capped ≤100/min.

FR-8:  Public registration page — /events/[slug], no auth required. Shows event details,
       seat availability, and registration form (name + phone). Matches patient by phone
       to existing patient record; creates new patient if not found.

FR-9:  Seat allocation — SELECT FOR UPDATE transaction. Confirmed = seats_registered++.
       Returns SEATS_FULL if capacity reached. No double-booking.

FR-10: Duplicate registration prevention — same phone number on same event returns
       "already registered" with existing reference number.

FR-11: Waiting list — when seats_full, offer waiting list opt-in. Position shown.
       Waiting list entry status = waiting.

FR-12: Waiting list auto-promotion — on registration cancellation (patient or staff),
       first waiting list entry promoted to confirmed. Seat counter unchanged.
       Promotion triggers FR-13 confirmation to promoted registrant.

FR-13: Registration confirmation — WhatsApp message sent on successful seat allocation
       (direct or via auto-promotion). Contains: event name, date/time, venue, reference
       number (EVT-{eventId padded 4}-{seq 3}), cancellation token link.

FR-14: 24h event reminder — WhatsApp reminder sent 24h before event start_time.
       Respects clinic reminder toggle (Settings → Notifications). Respects patient
       WhatsApp opt-out. Uses Inngest scheduled job.

FR-15: Change notification — when published event details are edited (date/time, venue,
       meeting link changed), send WA notification to all confirmed registrants with
       updated details.

FR-16: Event cancellation notification — when event is cancelled, send WA notification
       to all confirmed + waiting list registrants.

FR-17: Self-cancellation confirmation — WhatsApp sent to patient confirming their
       cancellation. Triggers FR-12 auto-promotion for next waiting list entry.

FR-18: Patient self-cancellation — two methods:
       (a) Token URL in confirmation message: single-use, expires at event start_time.
       (b) WhatsApp keyword: CANCEL_EVENT_REG:{registrationId} parsed in webhook
           before general keyword detection.

FR-19: Admin events list — sidebar Events entry. Filterable by status (All / Published /
       Draft / Completed / Cancelled). Series grouped with expand/collapse. Table columns:
       event title, date/time, status badge, seats progress bar, waiting count, actions.
       Stat cards: total / published / upcoming / this-week counts.

FR-20: Admin event detail — 4 tabs:
       (a) Overview: event info, edit/cancel actions.
       (b) Registrants: table with name, phone, reg-time, status (registered/attended/
           no_show/cancelled), attendance actions.
       (c) Waiting List: position, name, phone, joined-time, promote/remove actions.
       (d) Invitations: invited patients list, sent-at, delivery status.

FR-21: Manual management — staff can remove a registrant (triggers FR-17 + FR-12),
       promote waiting list entry manually, or move registrant to waiting list.

FR-22: Attendance marking — per registrant: Mark Attended / Mark No-Show. Enabled only
       after event start_time. Bulk mark-all attended. Auto-transition event to
       completed 24h after end_time if not manually closed.

FR-23: Fee display — optional event fee shown on public registration page and in admin
       portal. Informational only; no payment processing.
```

### Non-Functional Requirements (8 NFRs)

```
NFR-1: Race-safe seat allocation — SELECT FOR UPDATE in DB transaction. Mirrors Epic 03
       slot locking. Exactly one concurrent registration succeeds when one seat remains.

NFR-2: Public routes — /events/[slug] registration page added to PUBLIC_API_PATHS.
       No auth cookie required.

NFR-3: WhatsApp template pre-approval — 5 new templates required (invitation, confirmation,
       24h-reminder, change-notification, cancel-notification). Must be submitted to Meta
       before go-live. SMS fallback plan for all 5.

NFR-4: SMS fallback — all 5 WA notification types fall back to MSG91 SMS on delivery
       failure. Mirrors existing appointment SMS fallback pattern.

NFR-5: Tenant isolation — all event tables in clinic_{clinicId} schema. No cross-clinic
       data access.

NFR-6: Invitation rate cap — Inngest batch sends ≤100 WA messages/min per WhatsApp
       Business API rate limits.

NFR-7: Audit log — all staff management actions (create/edit/cancel event, remove
       registrant, mark attendance) written to audit_log table.

NFR-8: Token expiry — cancellation tokens are single-use and expire at event start_time.
```

### Technical Requirements

```
TECH-1: New tenant DB tables (clinic_{clinicId} schema):
        events, event_series, event_registrations, event_waiting_list, event_invitations

TECH-2: Sidebar nav — Events entry added between Billing and Reports.

TECH-3: PUBLIC_API_PATHS — extend for /api/v1/events/by-slug/, /api/v1/events/[slug]/register,
        /events/[slug] route group.

TECH-4: Inngest functions — invitation-blast, registration-confirmation, event-reminder-24h,
        event-change-notification, event-cancel-notification.

TECH-5: Settings → Notifications — event reminder toggle (mirrors appointment reminder toggle).

TECH-6: Reuse patterns: WhatsApp template sender (meta-whatsapp.ts), SMS fallback
        (sms/msg91.ts), Inngest scheduling, audit log (lib/audit.ts), SELECT FOR UPDATE
        transaction, PUBLIC_API_PATHS middleware.

TECH-7: CANCEL_EVENT_REG:{registrationId} parsed in whatsapp-message-received.ts BEFORE
        keyword detection (mirrors CANCEL_APPOINTMENT pattern from Epic 07).
```

### UX Design Requirements (8 UX-DRs)

```
UX-1: Sidebar nav — Events icon + label, same design as other nav items.
UX-2: Events list — stat cards, filter tabs, series expand/collapse, seats progress bar.
UX-3: Event detail — 4-tab layout matching appointment detail pattern.
UX-4: New event modal — 2-step stepper (Event Details → Invite Patients).
UX-5: Public registration page — clinic-branded header, 3 states (form / waitlist / confirmation).
UX-6: Attendance marking UI — enabled post-start_time, bulk action bar on multi-select.
UX-7: Series grouping — parent row + indented child rows with expand/collapse chevron.
UX-8: Status badges — Published (blue), Draft (slate), Completed (green), Cancelled (red),
      Today (amber chip on date).
```

---

## Epic List

### Epic 12: Event Lifecycle & Admin Portal
Staff can create, configure, publish, edit, and cancel events — and view them in the admin portal with full status tracking.
**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-19, FR-20a
**UX-DRs:** UX-1, UX-2, UX-3 (overview tab), UX-4 (step 1), UX-7, UX-8

### Epic 13: Patient Invitation & Public Registration
Staff can invite selected patients via WhatsApp blast, and patients can register via public link with seat management and waiting list.
**FRs covered:** FR-6, FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-23, FR-20b/c/d
**UX-DRs:** UX-4 (step 2), UX-5

### Epic 14: Notifications & Patient Self-Cancellation
Registrants receive WhatsApp confirmations, 24h reminders, and change/cancel alerts; patients can self-cancel via token link or WhatsApp keyword.
**FRs covered:** FR-13, FR-14, FR-15, FR-16, FR-17, FR-18

### Epic 15: Attendance Tracking & Manual Management
Staff can mark attendance post-event per registrant, bulk-mark all attended, and manually manage registrants and waiting list entries.
**FRs covered:** FR-21, FR-22
**UX-DRs:** UX-6

---

## FR Coverage Map

| FR | Epic | Description |
|---|---|---|
| FR-1 | Epic 12 | Event creation form |
| FR-2 | Epic 12 | Recurrence generation |
| FR-3 | Epic 12 | Edit event / series |
| FR-4 | Epic 12 | Publish event |
| FR-5 | Epic 12 | Cancel event |
| FR-6 | Epic 13 | Patient selection UI |
| FR-7 | Epic 13 | WhatsApp invitation blast |
| FR-8 | Epic 13 | Public registration page |
| FR-9 | Epic 13 | Race-safe seat allocation |
| FR-10 | Epic 13 | Duplicate registration check |
| FR-11 | Epic 13 | Waiting list entry |
| FR-12 | Epic 13 | Auto-promotion from waiting list |
| FR-13 | Epic 14 | Registration confirmation WA |
| FR-14 | Epic 14 | 24h reminder |
| FR-15 | Epic 14 | Change notification |
| FR-16 | Epic 14 | Event cancellation notification |
| FR-17 | Epic 14 | Self-cancel confirmation WA |
| FR-18 | Epic 14 | Self-cancellation (token URL + WA keyword) |
| FR-19 | Epic 12 | Admin events list |
| FR-20a | Epic 12 | Event detail — Overview tab |
| FR-20b/c/d | Epic 13 | Event detail — Registrants + Waiting List + Invitations tabs |
| FR-21 | Epic 15 | Manual registrant management |
| FR-22 | Epic 15 | Attendance marking |
| FR-23 | Epic 13 | Fee display on public page + admin portal |

---

## Stories

### Epic 12: Event Lifecycle & Admin Portal

#### Story 12.1: Tenant DB Schema — Events Tables

As a developer,
I want the tenant database schema to include events, event_series, event_registrations, event_waiting_list, and event_invitations tables,
So that all downstream stories have the data layer ready.

**Acceptance Criteria:**

**Given** a clinic tenant schema exists in `clinic_{clinicId}`
**When** the tenant schema migrations are applied
**Then** the following tables are created:
- `events` — id, clinic_id, series_id (nullable FK → event_series), title, description, start_time TIMESTAMPTZ, end_time TIMESTAMPTZ, venue TEXT, meeting_link TEXT, max_seats INTEGER, seats_registered INTEGER DEFAULT 0, registration_deadline TIMESTAMPTZ nullable, fee_paise INTEGER nullable, status TEXT DEFAULT 'draft' (draft | published | cancelled | completed), slug TEXT UNIQUE, created_by TEXT, created_at, updated_at
- `event_series` — id, clinic_id, recurrence_type TEXT (daily | weekly), recurrence_day_of_week INTEGER nullable (0–6), total_occurrences INTEGER, created_at
- `event_registrations` — id, event_id FK, patient_id FK, reference_number TEXT UNIQUE, status TEXT (registered | attended | no_show | cancelled), cancellation_token TEXT UNIQUE, token_expires_at TIMESTAMPTZ, registered_at, updated_at
- `event_waiting_list` — id, event_id FK, patient_id FK, position INTEGER, status TEXT (waiting | promoted | removed), joined_at, updated_at
- `event_invitations` — id, event_id FK, patient_id FK, sent_at TIMESTAMPTZ nullable, delivery_status TEXT DEFAULT 'pending' (pending | sent | failed), created_at

**And** `events.slug` is unique per clinic and generated from title + short suffix (reuse generateSlug pattern from lib/slug.ts)
**And** `events.seats_registered` is never decremented below 0 (DB CHECK constraint)
**And** all tables have appropriate indexes: events(clinic_id, status), events(slug), event_registrations(event_id, patient_id), event_registrations(cancellation_token), event_waiting_list(event_id, position)
**And** the schema additions are added to `apps/web/src/db/tenant-schema.sql`
**And** existing tenant schema tests still pass

---

#### Story 12.2: Event Creation API

As a clinic staff member (OWNER, DOCTOR, or RECEPTIONIST),
I want a POST /api/v1/events endpoint to create a new event,
So that the event is saved as a draft and ready for configuration.

**Acceptance Criteria:**

**Given** an authenticated staff session
**When** POST /api/v1/events is called with: `{ title, description, startTime, endTime, venue?, meetingLink?, maxSeats, registrationDeadline?, feePaise?, recurrence? }` where `recurrence` is `{ type: 'daily'|'weekly', dayOfWeek?: number, occurrences: number }`
**Then** if no recurrence: a single Event record is created with status=draft and a generated slug
**And** if recurrence is provided: an event_series record is created, then N Event records are generated (N = occurrences, max 52) each linked to the series_id, all with status=draft
**And** the response returns `{ event } or { series, events[] }` with HTTP 201
**And** input validation: title required (max 120 chars), startTime < endTime, maxSeats 1–500, feePaise >= 0 if provided, occurrences 2–52 for recurrence
**And** 400 is returned for validation failures with a field-specific error message
**And** 403 is returned for unauthenticated requests
**And** the action is written to the clinic audit_log with action=EVENT_CREATED
**And** tenant isolation: clinicId is read from the session, never from the request body

---

#### Story 12.3: New Event Modal — Step 1 (Event Details Form)

As a clinic staff member,
I want a "New Event" button on the Events list page that opens a 2-step modal with an Event Details form,
So that I can fill in the event information before saving as draft.

**Acceptance Criteria:**

**Given** I am on the /events page
**When** I click the "New Event" button
**Then** a modal overlay opens with a 2-step stepper (Step 1: Event Details, Step 2: Invite Patients)
**And** Step 1 contains fields: Title (required), Description (textarea), Date (required), Start Time (required), End Time (required), Registration Deadline (optional date+time), Venue (text, optional), Meeting Link (URL, optional), Max Seats (number, required), Fee (₹ prefixed number input, optional)
**And** a Recurrence toggle is shown; when ON, it reveals: daily/weekly radio, day-of-week picker (weekly only), occurrence count input (2–52)
**And** when recurrence is ON and configured, a preview row shows "N events · [frequency]" below the form
**And** "Save as Draft" button calls POST /api/v1/events and closes the modal on success
**And** "Next: Invite Patients" button validates required fields then advances to Step 2 (implemented in Epic 13)
**And** form validation messages appear inline for required fields
**And** on success, the new event(s) appear in the events list without full page reload
**And** the modal design matches the mockup at `ux-designs/.../mockups/new-event.html` (2-step stepper header, field layout, recurrence section)

---

#### Story 12.4: Admin Events List Page

As a clinic staff member,
I want a /events page in the admin portal with a filterable list of events,
So that I can see all events at a glance with their status and seat availability.

**Acceptance Criteria:**

**Given** I navigate to /events (Events entry in sidebar, between Billing and Reports)
**When** the page loads
**Then** I see 4 stat cards: Total Events, Published, Upcoming (start_time in future), This Week (start_time within current IST week)
**And** a filter tab bar shows: All | Published | Draft | Completed | Cancelled — default All
**And** the events table has columns: Event (title + date chip if today), Date/Time, Status badge, Seats (progress bar: registered/max), Waiting List count, Actions (View, Edit, Cancel)
**And** series events are grouped: parent row shows series title with a chevron; clicking expands/collapses child event rows (indented)
**And** status badges: Published=blue, Draft=slate, Completed=green, Cancelled=red/muted
**And** today's events show an amber "TODAY" chip next to the date
**And** GET /api/v1/events returns the full list, filterable by `?status=` query param, with series grouping data (`series_id`, `series_position`)
**And** the sidebar nav shows "Events" with the correct icon between Billing and Reports (UX-1)
**And** the page design matches `ux-designs/.../mockups/events-list.html`

---

#### Story 12.5: Events List API

As a developer,
I want GET /api/v1/events to return a paginated list of clinic events with series metadata,
So that the admin events list page can render correctly.

**Acceptance Criteria:**

**Given** an authenticated staff session
**When** GET /api/v1/events is called with optional `?status=&page=&limit=`
**Then** returns `{ events: Event[], total, page, limit }` for the session's clinic only
**And** each event record includes: id, title, slug, start_time, end_time, status, max_seats, seats_registered, waiting_count (COUNT from event_waiting_list WHERE status=waiting), series_id (nullable), series_position (order within series, 1-based)
**And** results are ordered by start_time ASC
**And** filtering by `?status=published|draft|completed|cancelled` works correctly
**And** 403 is returned for unauthenticated requests
**And** cross-clinic isolation: only events for the session clinic are returned

---

#### Story 12.6: Event Detail Page — Overview Tab

As a clinic staff member,
I want an /events/[eventId] page with an Overview tab,
So that I can view full event details and access edit/cancel actions.

**Acceptance Criteria:**

**Given** I click "View" on an event in the events list
**When** the /events/[eventId] page loads
**Then** I see a page header with: event title, status badge, TODAY chip (if applicable), breadcrumb (Events > Event Title)
**And** 5 stat blocks: Total Seats, Registered, Remaining (max_seats - seats_registered), Waiting List count, Invitations sent count
**And** the Overview tab shows: description, date/time, venue or meeting link, registration deadline (if set), fee (if set), series info (if part of series: "Part of weekly series — 8 events")
**And** an "Edit" button is shown for draft/published events; a "Cancel Event" button for published events
**And** 4 tabs are rendered: Overview (active), Registrants, Waiting List, Invitations (last 3 tabs are empty/stub for now — populated in Epic 13 and 15)
**And** GET /api/v1/events/[eventId] returns full event detail including all 5 stat counts
**And** the page design matches `ux-designs/.../mockups/event-detail.html`

---

#### Story 12.7: Edit Event

As a clinic staff member,
I want to edit an event's details via the Edit modal,
So that I can correct or update event information before or after publishing.

**Acceptance Criteria:**

**Given** I click "Edit" on an event with status=draft or status=published
**When** the edit modal opens
**Then** the form is pre-filled with all existing event fields
**And** for a non-series event, editing saves changes to that single event only
**And** for a series event, I am shown a scope selector: "This event only" | "This and future events" | "All events in series"
**And** "This and future events" creates a new series_id from the selected event forward (series split) and updates those events
**And** "All events in series" updates all events sharing the current series_id
**And** if the event has at least 1 confirmed registration, reducing `max_seats` below `seats_registered` is blocked with error "Cannot reduce seats below current registrations (N)"
**And** PATCH /api/v1/events/[eventId] accepts `{ ...fields, scope: 'single'|'this-and-future'|'all' }` and applies the correct update
**And** 422 is returned if trying to edit a cancelled or completed event
**And** the action is written to audit_log with action=EVENT_UPDATED

---

#### Story 12.8: Publish and Cancel Event

As a clinic staff member,
I want to publish a draft event and cancel a published event,
So that I can control when registration opens and close events that won't proceed.

**Acceptance Criteria:**

**Given** an event with status=draft
**When** I click "Publish" (shown in the Overview tab header actions)
**Then** PATCH /api/v1/events/[eventId] with `{ action: 'publish' }` sets status=published
**And** the status badge updates to Published (blue) immediately
**And** the public registration page becomes accessible at /events/[slug]

**Given** an event with status=published
**When** I click "Cancel Event" and confirm the confirmation dialog
**Then** PATCH /api/v1/events/[eventId] with `{ action: 'cancel' }` sets status=cancelled
**And** the status badge updates to Cancelled
**And** the action triggers the `event/cancel.notify` Inngest event (stub — full implementation in Epic 14)
**And** the action is written to audit_log with action=EVENT_CANCELLED
**And** 422 is returned if trying to publish/cancel an event already in a terminal state (cancelled/completed)

---

### Epic 13: Patient Invitation & Public Registration

#### Story 13.1: New Event Modal — Step 2 (Invite Patients)

As a clinic staff member,
I want Step 2 of the New Event modal to let me search and select patients to invite,
So that I can target relevant patients for the event.

**Acceptance Criteria:**

**Given** I am on Step 2 (Invite Patients) of the New Event modal
**When** the step loads
**Then** I see a search input with placeholder "Search by name or phone…"
**And** typing 3+ characters queries GET /api/v1/patients/search?q= and shows matching patients with name, phone, and last-visit date
**And** clicking a patient adds them to a "Selected" list shown below the search
**And** a "Select All Results" option selects all search results at once
**And** selected patients show a checkmark and can be removed via ×
**And** the count of selected patients is shown: "12 patients selected"
**And** clicking "Send Invitations & Publish" calls POST /api/v1/events/[eventId]/invite with the selected patient IDs, then triggers the invitation blast Inngest job (Story 13.3)
**And** clicking "Skip for now" closes the modal without sending invitations (event stays as created)
**And** "Back" returns to Step 1 with all fields preserved
**And** a loading state is shown while the invitation batch is queued

---

#### Story 13.2: Invitation Records API

As a developer,
I want POST /api/v1/events/[eventId]/invite to store invitation records and return a job ID,
So that the invitation blast can be tracked and displayed in the Invitations tab.

**Acceptance Criteria:**

**Given** an authenticated staff session
**When** POST /api/v1/events/[eventId]/invite is called with `{ patientIds: string[] }`
**Then** for each patientId, an event_invitations record is created with delivery_status='pending'
**And** duplicate patientIds (already invited) are skipped (upsert, no error)
**And** the `event/invitation.blast` Inngest event is sent with `{ eventId, clinicId, patientIds }` and idempotency key `${eventId}:invite:${Date.now()}`
**And** the response returns `{ invited: number, jobId: string }` with HTTP 202
**And** 403 is returned for unauthenticated requests
**And** 404 is returned if the event does not belong to the session's clinic

---

#### Story 13.3: WhatsApp Invitation Blast Inngest Job

As a developer,
I want an Inngest function `event-invitation-blast` that sends WhatsApp invitations to selected patients,
So that all invited patients receive the registration link without overwhelming the WhatsApp API rate limits.

**Acceptance Criteria:**

**Given** the `event/invitation.blast` Inngest event is received
**When** the function runs
**Then** it loads the event and clinic details from the tenant DB
**And** it iterates through patientIds in batches of 100, sleeping 60 seconds between batches (≤100 msgs/min NFR-6)
**And** for each patient, it sends a WhatsApp template message using `sendTemplateMessage()` from lib/meta-whatsapp.ts with: event name, date/time, venue/meeting link, registration URL (`/events/[slug]`), fee (if set), available seats
**And** on successful send, it updates event_invitations.delivery_status='sent' and sent_at=now()
**And** on WhatsApp delivery failure, it falls back to MSG91 SMS using the same message content and updates delivery_status='failed' after both fail
**And** the function is registered in /api/inngest/route.ts
**And** the function uses idempotency key `${eventId}:invite-blast` to prevent duplicate blasts on retry

---

#### Story 13.4: Public Registration Page

As a patient who received an event invitation,
I want to open the event registration link in my browser and see the event details,
So that I can decide whether to register.

**Acceptance Criteria:**

**Given** I open /events/[slug] in a browser (no login required)
**When** the page loads
**Then** I see: clinic name header with "Powered by Chikitsa360" footer, event title, date/time, venue or meeting link, description, fee (if set) or "Free", series label if applicable
**And** a seat availability block shows: Max Seats, Registered, Remaining — with a progress bar
**And** if status=draft or status=cancelled or status=completed, a message explains "This event is not open for registration" (no form shown)
**And** if registration_deadline is set and has passed, "Registration closed" message is shown
**And** GET /api/v1/events/by-slug/[slug] returns public event data (no auth needed — added to PUBLIC_API_PATHS)
**And** the page matches `ux-designs/.../mockups/event-registration.html` State A (form state)

---

#### Story 13.5: Registration API — Seat Allocation & Waiting List

As a developer,
I want POST /api/v1/events/[slug]/register to handle seat allocation with race-safety and waiting list fallback,
So that no double-booking occurs and patients on waiting list are properly queued.

**Acceptance Criteria:**

**Given** a public POST /api/v1/events/[slug]/register request with `{ name, phone, joinWaitlist?: boolean }`
**When** the handler runs
**Then** it resolves or creates the patient: if phone matches existing patient record in the clinic schema, use that patient; else create a new patient record
**And** duplicate check: if patient_id already has a registration (status=registered/attended) for this event, return HTTP 409 `{ code: 'ALREADY_REGISTERED', referenceNumber }`
**And** if joinWaitlist=true (and seats are full), create an event_waiting_list entry, compute position (COUNT existing waiting entries + 1), return HTTP 200 `{ status: 'waitlisted', position }`
**And** if joinWaitlist=false and seats < max_seats: in a single DB transaction with SELECT FOR UPDATE on the events row, increment seats_registered and create an event_registrations record with status=registered, a generated reference_number (EVT-{eventId:04d}-{seq:03d}), and a cancellation_token (UUID)
**And** on successful registration, send `event/registration.confirm` Inngest event (stub — full notifications in Epic 14)
**And** if the SELECT FOR UPDATE finds seats_registered >= max_seats on re-check (race), return HTTP 200 `{ status: 'seats_full' }` (no error — front-end shows waitlist offer)
**And** this endpoint is added to PUBLIC_API_PATHS (no auth required)
**And** the endpoint is rate-limited to 60 requests/min per IP to prevent abuse

---

#### Story 13.6: Registration Flow UI — Form, Waitlist, and Confirmation States

As a patient,
I want the registration page to show the appropriate state (form, seats full + waitlist offer, or confirmation),
So that I always know the outcome of my registration attempt.

**Acceptance Criteria:**

**Given** I am on /events/[slug] with seats available
**When** I fill in Name and Phone and click "Register"
**Then** the form submits to POST /api/v1/events/[slug]/register
**And** on success (status=registered), the page transitions to State C: Confirmation — showing reference number (EVT-XXXX-XXX), event name, date/time, venue, and a note "A WhatsApp confirmation will be sent to your number"
**And** a "Cancel Registration" link is shown (using the cancellation token URL — stub for now, full cancel in Epic 14)

**Given** seats are full when the form submits
**When** the API returns `{ status: 'seats_full' }`
**Then** the page transitions to State B: Seats Full — showing the waiting list offer with position estimate
**And** a "Join Waiting List" button calls POST again with `{ joinWaitlist: true }`
**And** on waitlist success, confirmation shows "You're #N on the waiting list"

**Given** I try to register with a phone already registered
**When** the API returns `{ code: 'ALREADY_REGISTERED' }`
**Then** an inline error shows "You're already registered (ref: EVT-XXXX-XXX)"

**And** all 3 states match the mockup at `ux-designs/.../mockups/event-registration.html`
**And** phone input accepts 10-digit Indian mobile numbers only (same validation as booking page)

---

#### Story 13.7: Event Detail — Registrants, Waiting List, and Invitations Tabs

As a clinic staff member,
I want the Registrants, Waiting List, and Invitations tabs on the event detail page to show live data,
So that I can monitor registrations as they come in.

**Acceptance Criteria:**

**Given** I am on /events/[eventId]
**When** I click the "Registrants" tab
**Then** I see a table of all event registrations with: patient name, phone, registered-at, status badge (Registered=blue, Attended=green, No-Show=amber, Cancelled=muted)
**And** each row shows the reference number

**When** I click the "Waiting List" tab
**Then** I see a table with: position, patient name, phone, joined-at, status (Waiting=violet, Promoted=green, Removed=muted)

**When** I click the "Invitations" tab
**Then** I see a table with: patient name, phone, sent-at, delivery status badge (Sent=green, Pending=slate, Failed=red)

**And** GET /api/v1/events/[eventId]/registrants returns `{ registrations[], waitingList[], invitations[] }` — all scoped to clinic
**And** 403 is returned for unauthenticated or cross-clinic requests
**And** the tabs match `ux-designs/.../mockups/event-detail.html`

---

### Epic 14: Notifications & Patient Self-Cancellation

#### Story 14.1: Registration Confirmation WhatsApp

As a patient who just registered for an event,
I want to receive a WhatsApp message confirming my seat,
So that I have the event details and a reference number on my phone.

**Acceptance Criteria:**

**Given** the `event/registration.confirm` Inngest event is received with `{ registrationId, clinicId }`
**When** the `event-registration-confirm` Inngest function runs
**Then** it loads the registration, event, patient, and clinic from the tenant DB
**And** it sends a WhatsApp template message to the patient's phone containing: event title, date/time, venue or meeting link, reference number (EVT-XXXX-XXX), fee or "Free", cancellation token URL (`/events/[slug]/cancel?token=...`)
**And** the cancellation token URL is constructed from the registration's cancellation_token field
**And** on WhatsApp failure, falls back to MSG91 SMS with the same content
**And** the function is idempotent with key `${registrationId}:reg-confirm`
**And** the function is registered in /api/inngest/route.ts

---

#### Story 14.2: 24h Event Reminder

As a registered patient,
I want to receive a WhatsApp reminder 24 hours before the event,
So that I don't forget to attend.

**Acceptance Criteria:**

**Given** a registration is confirmed (status=registered)
**When** the registration confirmation is processed
**Then** an Inngest scheduled event `event/reminder.24h` is created with `ts: eventStartTime - 24h` (as milliseconds), idempotency key `${registrationId}:reminder-24h`

**Given** the scheduled event fires
**When** the `event-reminder-24h` Inngest function runs
**Then** it checks: registration status is still 'registered' (skip if cancelled/attended/no_show)
**And** checks: clinic's event_reminder_24h_enabled toggle is true (from Settings → Notifications)
**And** checks: patient's whatsapp_opt_out is false
**And** if all checks pass, sends a WhatsApp reminder with: event name, date/time, venue/link, reference number
**And** on WhatsApp failure, falls back to SMS
**And** the clinic event reminder toggle is added to Settings → Notifications page (alongside existing appointment reminder toggles)
**And** the function is registered in /api/inngest/route.ts

---

#### Story 14.3: Event Change Notification

As a registered patient,
I want to receive a WhatsApp notification if the event details change after I registered,
So that I'm not caught off guard by a new date, time, or venue.

**Acceptance Criteria:**

**Given** a published event with at least 1 confirmed registration is edited
**When** PATCH /api/v1/events/[eventId] is called and the edit changes start_time, end_time, venue, or meeting_link
**Then** the `event/change.notify` Inngest event is sent with `{ eventId, clinicId, changedFields[] }`

**Given** the Inngest `event-change-notification` function receives the event
**When** it runs
**Then** it loads all event_registrations with status=registered for this event
**And** sends a WhatsApp template message to each registrant: "Updated event details" with the new date/time, new venue/link, and reference number
**And** on WhatsApp failure per patient, falls back to SMS
**And** the function processes in batches if more than 100 registrants (same rate-cap pattern as invitation blast)
**And** the function is registered in /api/inngest/route.ts

---

#### Story 14.4: Event Cancellation Notification

As a registered patient,
I want to receive a WhatsApp notification if the event is cancelled,
So that I know not to attend.

**Acceptance Criteria:**

**Given** an event is cancelled via PATCH /api/v1/events/[eventId] `{ action: 'cancel' }`
**When** the `event/cancel.notify` Inngest event is received by the `event-cancel-notification` function
**Then** it loads all registrations with status=registered AND all waiting list entries with status=waiting
**And** sends a WhatsApp cancellation message to each person: event name, original date/time, "This event has been cancelled"
**And** on WhatsApp failure, falls back to SMS
**And** processes in batches if > 100 recipients
**And** the function is registered in /api/inngest/route.ts

---

#### Story 14.5: Patient Self-Cancellation via Token URL

As a registered patient,
I want to cancel my event registration via the link in my confirmation message,
So that I can free up my seat without calling the clinic.

**Acceptance Criteria:**

**Given** I open /events/[slug]/cancel?token=... in my browser
**When** the page loads
**Then** if the token is valid (exists in event_registrations.cancellation_token, not yet used, event start_time is in the future), I see the event details and a "Cancel Registration" button
**And** if the token is expired (event start_time has passed) or already used, I see "This cancellation link has expired"
**And** if the token is invalid (not found), I see "Invalid cancellation link"

**Given** I click "Cancel Registration"
**When** POST /api/v1/events/[slug]/cancel with `{ token }` is called
**Then** the registration status is set to cancelled, cancellation_token is cleared (single-use)
**And** seats_registered is decremented by 1 (with SELECT FOR UPDATE guard against race)
**And** the `event/registration.cancelled` Inngest event is sent to trigger FR-12 auto-promotion and FR-17 confirmation
**And** the page shows "Your registration has been cancelled"
**And** this endpoint is added to PUBLIC_API_PATHS (no auth required)

---

#### Story 14.6: Patient Self-Cancellation via WhatsApp Keyword + Auto-Promotion

As a registered patient,
I want to cancel by replying CANCEL_EVENT_REG:{id} on WhatsApp,
So that I can cancel directly from my phone without opening a link.

**Acceptance Criteria:**

**Given** the WhatsApp webhook receives a message
**When** the message body matches the pattern `CANCEL_EVENT_REG:{registrationId}` (case-insensitive)
**Then** this is parsed in `whatsapp-message-received.ts` BEFORE the existing keyword detection (same pattern as CANCEL_APPOINTMENT from Epic 07)
**And** the handler looks up the registration by id, verifying patient phone matches the sender phone (security check)
**And** if valid and not already cancelled: registration status → cancelled, seats_registered decremented
**And** the `event/registration.cancelled` Inngest event is sent

**Given** the `event/registration.cancelled` Inngest event is received by `event-registration-cancelled` function
**When** it runs
**Then** it sends a WhatsApp confirmation to the patient: "Your registration for [event] has been cancelled (ref: EVT-XXXX-XXX)"
**And** it checks the event_waiting_list for the first entry with status=waiting ordered by position ASC
**And** if found: promotes it to registered (creates event_registrations record), increments seats_registered, sends `event/registration.confirm` for the promoted patient (triggering Story 14.1)
**And** if no waitlist: no further action
**And** the function is registered in /api/inngest/route.ts

---

### Epic 15: Attendance Tracking & Manual Management

#### Story 15.1: Attendance Marking API

As a developer,
I want PATCH /api/v1/events/[eventId]/registrations/[registrationId] to support attendance actions,
So that staff can mark registrants as attended or no-show.

**Acceptance Criteria:**

**Given** an authenticated staff session (OWNER, DOCTOR, or RECEPTIONIST)
**When** PATCH /api/v1/events/[eventId]/registrations/[registrationId] is called with `{ action: 'mark-attended' | 'mark-no-show' }`
**Then** if the event's start_time is in the future, return 422 `{ code: 'EVENT_NOT_STARTED', message: 'Attendance can only be marked after the event has started' }`
**And** if the registration status is not 'registered', return 422 `{ code: 'INVALID_STATUS' }`
**And** on success, the registration status is updated to 'attended' or 'no_show' with updated_at
**And** the action is written to audit_log with action=ATTENDANCE_MARKED
**And** 403 is returned for cross-clinic or unauthenticated requests

---

#### Story 15.2: Attendance Marking UI

As a clinic staff member,
I want to mark attendance for each registrant in the Registrants tab after the event starts,
So that I can record who actually attended.

**Acceptance Criteria:**

**Given** I am on the event detail Registrants tab
**When** the event's start_time has passed
**Then** each row with status=registered shows two action buttons: "Mark Attended" (green) and "No-Show" (amber)
**And** rows with status=attended or no_show show a read-only badge instead of buttons
**And** rows with status=cancelled do not show action buttons

**When** I check multiple rows using the row checkboxes
**Then** a bulk action bar appears at the top of the table: "N selected — [Mark All Attended] [Mark All No-Show]"
**And** the bulk action calls the API for each selected registration sequentially

**Given** the event's start_time has NOT passed
**Then** the attendance buttons are disabled with a tooltip "Available after event starts"

**And** after marking, the row status badge updates immediately without page reload
**And** the UI matches `ux-designs/.../mockups/event-detail.html` (attendance banner + bulk action bar)

---

#### Story 15.3: Manual Registrant Management

As a clinic staff member,
I want to manually remove a registrant or promote a waiting list entry,
So that I can handle edge cases like patient requests or no-shows before the event.

**Acceptance Criteria:**

**Given** I am on the Registrants tab
**When** I click "Remove" on a registrant row (available for status=registered only)
**Then** a confirmation dialog appears: "Remove [name] from event? This will free their seat."
**And** on confirm, PATCH /api/v1/events/[eventId]/registrations/[registrationId] with `{ action: 'remove' }` sets status=cancelled, decrements seats_registered
**And** the removal triggers the same auto-promotion flow as self-cancellation (send `event/registration.cancelled` Inngest event)
**And** the row moves to cancelled status in the table

**Given** I am on the Waiting List tab
**When** I click "Promote" on a waiting list entry (available when seats_remaining > 0)
**Then** PATCH /api/v1/events/[eventId]/waiting-list/[entryId] with `{ action: 'promote' }` promotes the entry: creates a registration record, increments seats_registered, updates waiting list status to 'promoted'
**And** the `event/registration.confirm` Inngest event is sent for the promoted patient
**And** the entry moves to the Registrants tab

**Given** I click "Remove" on a waiting list entry
**When** confirmed
**Then** the entry status is set to 'removed' and disappears from the waiting list

**And** all actions are written to audit_log with appropriate action codes
**And** 403 is returned for unauthenticated or cross-clinic requests

---

#### Story 15.4: Event Auto-Completion

As a developer,
I want events to automatically transition to 'completed' status 24 hours after end_time,
So that the events list reflects accurate lifecycle state without manual staff intervention.

**Acceptance Criteria:**

**Given** an Inngest cron job `event-auto-complete` runs every hour
**When** it runs
**Then** it queries all events with status=published WHERE end_time < NOW() - INTERVAL '24 hours' across all clinic schemas
**And** for each matching event, sets status=completed
**And** events that are already cancelled or completed are skipped

**Note:** Implementation uses a global (non-tenant) query across clinics or a per-clinic sweep approach matching existing patterns.
**And** the Inngest cron function is registered in /api/inngest/route.ts with id='event-auto-complete', cron='0 * * * *' (every hour)
**And** the auto-completion is written to audit_log with action=EVENT_AUTO_COMPLETED per event processed

---

