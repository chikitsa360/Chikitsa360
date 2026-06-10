---
title: Cliniqly — Patient Events Module
status: draft
created: 2026-06-10
updated: 2026-06-10
---

# PRD: Patient Events Module

## 0. Document Purpose

This PRD defines the Patient Events module for the Cliniqly platform — a new, self-contained feature that lets clinic staff create and manage health events (camps, programs, awareness sessions), invite patients via WhatsApp, and track registrations through to post-event attendance. It is scoped for the Cliniqly SaaS platform and informs downstream UX design (bmad-ux), architecture, and epic/story breakdown. It does not duplicate existing appointment, notification, or booking-link architecture — it references and extends those patterns. Glossary terms defined in §3 are used verbatim throughout; FRs are numbered globally (FR-1 through FR-23) for stable downstream references.

## 1. Vision

Clinics run group health programs — weight management sessions, diabetes camps, wellness talks — but today there is no structured way to organize them within Cliniqly. Staff improvise with WhatsApp group broadcasts, spreadsheets, and manual follow-ups, leading to missed registrations, overbooked venues, and no post-event record.

The Patient Events module gives clinic staff a first-class workflow to create events, define seat limits, invite specific patients via WhatsApp, manage registrations (including a waiting list), and mark attendance after the event. Patients get a smooth self-service registration experience through a public link — no login, no friction — with WhatsApp confirmations and reminders that mirror the quality of the existing appointment flow.

The result: every event is accountable, seat-safe, and traceable; clinic staff spend less time coordinating and more time delivering care.

## 2. Target User

### 2.1 Jobs To Be Done

- **Create and publish** a health event with all relevant details (date, venue, capacity) without leaving Cliniqly.
- **Reach the right patients** quickly by selecting from the existing patient directory and sending a WhatsApp Invitation blast.
- **Prevent overbooking** without manual seat counting — the system enforces the seat limit and queues overflow on a Waiting List.
- **Know who is coming** before the event: a real-time Registrant list visible to all clinic staff.
- **Capture attendance** after the event to build a record of patient participation.
- **Handle the unexpected** — cancellations, venue changes, capacity adjustments — with automatic patient notifications.

### 2.2 Non-Users (v1)

- Patients do not need a Cliniqly account to register; this module is explicitly designed for non-authenticated patient interaction.
- External event platforms (Eventbrite, Meetup) — Cliniqly Events is clinic-internal, not a public discovery listing.

### 2.3 Key User Journeys

- **UJ-1. Dr. Mehta creates a weekly weight management program series.**
  - **Persona + context:** Dr. Mehta (DOCTOR role) runs an 8-week weight management program for her diabetic patients. She wants to schedule all 8 sessions at once and invite a curated list of 30 patients.
  - **Entry state:** Authenticated, on the dashboard. Navigates to Events → New Event.
  - **Path:** Fills in event title "Weight Management Program – Session 1", description, date/time, location (clinic hall), seats_total 30. Enables recurrence: weekly, 8 occurrences on Wednesdays. Reviews the generated series dates. Selects 30 patients from the directory. Publishes and sends WhatsApp Invitations.
  - **Climax:** All 30 patients receive a WhatsApp Invitation with event details and a Registration Link. Dr. Mehta sees the event in the Events list with "0 / 30 registered."
  - **Resolution:** Dr. Mehta returns to the event detail at any time to watch registrations grow in real time.
  - **Edge case:** She needs to change Session 3's venue — edits that occurrence only (not the whole series). Registered patients for that session receive a change notification automatically.

- **UJ-2. Patient Anita registers and gets confirmed — or lands on the Waiting List.**
  - **Persona + context:** Anita, a diabetic patient of Dr. Mehta, receives a WhatsApp Invitation. She is not a Cliniqly user.
  - **Entry state:** Opens the Registration Link on her phone browser. No login required.
  - **Path:** Sees event details (title, date, venue, seats remaining). Taps "Register." Enters her name and phone number. Submits.
  - **Climax (seats available):** Sees a "You're registered!" confirmation page with a Reference Number. Receives a WhatsApp confirmation with event details, Reference Number, and a cancellation link.
  - **Climax (seats full):** Sees "Event is fully booked — join the waiting list?" Confirms → joins Waiting List. Receives a WhatsApp message acknowledging her waiting list position.
  - **Resolution:** Anita receives a 24h reminder WhatsApp before the event. She can cancel via the link in her confirmation message at any time before the event starts.
  - **Edge case:** Anita tries to register a second time with the same phone — the system detects the duplicate and shows her existing Registration details instead of creating a new record.

- **UJ-3. Receptionist Riya marks attendance after the event.**
  - **Persona + context:** Riya (RECEPTIONIST) is at the venue as patients arrive for Session 1.
  - **Entry state:** Authenticated, on the Event detail page → Registrants tab.
  - **Path:** As each patient arrives, Riya taps "Mark Attended" against their name. Marks remaining patients as "No Show" at the end.
  - **Climax:** The attendance record for Session 1 is complete.
  - **Resolution:** The Event status transitions to Completed. The attendance data is available for future reporting.

## 3. Glossary

- **Event** — A scheduled group health session (camp, talk, program) created by clinic staff, with a defined date, time, capacity, and optional fee. Tenant-scoped to one Clinic.
- **Event Series** — A collection of recurring Events generated from a single recurrence rule. Each Event in a series is independently editable after generation.
- **Event Status** — Lifecycle state of an Event: `draft` | `published` | `cancelled` | `completed`.
- **Registration** — A patient's confirmed seat allocation for a specific Event. Has a unique Reference Number.
- **Registration Status** — State of a Registration: `registered` | `cancelled` | `attended` | `no_show`.
- **Registrant** — A patient who holds an active Registration for an Event.
- **Registration Link** — A public (no-auth) URL for a specific Event where patients can self-register.
- **Reference Number** — A unique, human-readable code assigned to each Registration (e.g., `EVT-0042-001`).
- **Seat** — One unit of capacity in an Event. `seats_remaining = seats_total − seats_registered`.
- **Waiting List Entry** — A patient's queued position for an Event that has reached its seat limit. Automatically promoted to a Registration when a seat opens.
- **Invitation** — A WhatsApp message sent to a specific patient containing an Event's Registration Link. Does not constitute a Registration.
- **Attendance** — The post-event record of whether a Registrant was present (`attended`) or absent (`no_show`).

## 4. Features

### 4.1 Event Creation and Scheduling

**Description:** Any authenticated clinic user (OWNER, DOCTOR, RECEPTIONIST) can create an Event by completing a form. Staff can optionally generate an Event Series via a recurrence rule (daily or weekly with a specific day). A newly created Event has `status: draft` until explicitly published. Realizes UJ-1.

**Functional Requirements:**

#### FR-1: Create single event

Any authenticated clinic user can create an Event with the following fields:
- **Required:** title, date, start time, end time, seats_total (integer ≥ 1).
- **Optional:** description, location (free text), meeting link (URL), registration deadline (datetime), event fee (INR integer ≥ 0, default 0), cover image. [ASSUMPTION: cover image is optional in v1 — UX will decide whether to include in the form]

**Consequences (testable):**
- Event saved with `status: draft`, `seats_registered: 0`, `seats_remaining: seats_total`.
- Event is tenant-scoped via `clinicId` from session — invisible to other clinics.
- Missing required fields return HTTP 422 with field-level errors.
- `end_time` must be after `start_time`; violation returns 422.

#### FR-2: Recurrence / series generation

When creating an Event, staff can enable recurrence by selecting a pattern (daily or weekly) and specifying: the day of week (for weekly), and an end condition (number of occurrences, max 52, or an end date).

**Consequences (testable):**
- System generates N individual Event records linked by a shared `series_id`.
- Each generated Event has its own independent date, `seats_total`, `seats_registered`, and `status`.
- A preview of all generated dates is shown before the user confirms creation.
- Series ID is stored on each Event record; individual events have no parent-child dependency after generation.

**Out of Scope (v1):** Monthly recurrence, bi-weekly, custom multi-day patterns. [NOTE FOR PM: weekly + specific day of week is the primary use case confirmed by user]

#### FR-3: Edit event

Staff can edit any `draft` or `published` Event's fields. For Events belonging to an Event Series, an edit-scope selector appears: **This event only** | **This and future events** | **All events in series**.

**Consequences (testable):**
- Editing a `published` Event where date, time, location, or meeting_link changes AND the event has active Registrations → triggers FR-15 (change notification) automatically after save.
- Reducing `seats_total` below `seats_registered` is blocked with HTTP 422: "Cannot reduce capacity below current registrations (N registered)."
- Increasing `seats_total` when a Waiting List exists → triggers FR-12 (auto-promotion) for newly freed seats.
- Staff sees a confirmation prompt before saving a `published` event with registrants: "This will notify N registered patients of the change."

#### FR-4: Publish event

Staff transitions an Event from `draft` to `published`. The Registration Link becomes publicly accessible.

**Consequences (testable):**
- `status` → `published`. A unique `registration_link` is generated (or already exists from draft creation).
- Event appears in the portal Events list view (FR-19) and is filterable as published.
- If a 24h reminder was configured (FR-14), the Inngest reminder job is scheduled at publish time.

#### FR-5: Cancel event

Staff cancels a `published` or `draft` Event. Cancellation requires an in-portal confirmation step. For Events in a series, an edit-scope selector appears.

**Consequences (testable):**
- `status` → `cancelled`. Registration Link returns a "This event has been cancelled" page.
- All active Registrations for the cancelled Event are marked `cancelled`.
- All Registrants (status: `registered`) receive a WhatsApp cancellation notification (FR-16).
- Waiting List Entries are also notified (separate message).
- Scheduled reminder Inngest jobs for the event are cancelled.

---

### 4.2 Patient Invitation

**Description:** After publishing an Event (or simultaneously at publish), staff selects patients from the clinic's patient directory and triggers a WhatsApp Invitation blast. The blast is a one-time send per patient per event; the system prevents duplicate Invitations. Realizes UJ-1.

**Functional Requirements:**

#### FR-6: Patient selection for invitation

On the Event detail → Invitations tab, staff can search and multi-select patients from the clinic's patient directory.

**Consequences (testable):**
- Search supports name (3+ characters, ILIKE) and last-4-digit phone — mirrors existing patient search pattern.
- Selected patients are displayed with name and phone number. A running count is shown ("30 patients selected").
- Patients who already have an Invitation record for this Event are visually indicated (greyed out) and cannot be re-selected.
- Invitations can only be sent for `published` Events.

#### FR-7: WhatsApp invitation blast

Staff triggers the blast for selected patients. Each patient receives a WhatsApp Invitation containing: event title, date/time, venue / meeting link, available seats count at time of send, Registration Link, and instructions to register.

**Consequences (testable):**
- Each send creates an `event_invitation` record with fields: `event_id`, `patient_id`, `sent_at`, `delivery_status`.
- Blast is dispatched via Inngest event `event/invitation.send` (async) — UI shows "Sending…" then "Sent to N patients."
- WhatsApp delivery failures trigger SMS fallback, mirroring the existing confirmation/reminder fallback pattern.
- Blast capped at 200 Invitations per clinic per week to avoid Meta spam classification (SM-C1).

---

### 4.3 Public Registration Flow

**Description:** The Registration Link opens a public page (no authentication) where a patient can register for the Event. The page shows live seat availability. On submission, the system atomically allocates a Seat or offers the Waiting List. Realizes UJ-2.

**Functional Requirements:**

#### FR-8: Public registration page

The registration page displays: event title, description, date/time, location / meeting link, seats remaining, registration deadline (if set), event fee, and a registration form (name, phone number).

**Consequences (testable):**
- Page is accessible without authentication; excluded from middleware auth checks (mirrors existing PUBLIC_API_PATHS pattern).
- `Event.status = cancelled` → page shows "This event has been cancelled."
- `Event.status = draft` → page returns HTTP 404.
- Registration deadline passed → form is disabled with "Registration is closed."
- `seats_remaining = 0` and no waiting list offered → form is replaced with "This event is fully booked."
- `seats_remaining = 0` and waiting list is available → form shows "Join waiting list" option.

#### FR-9: Seat allocation (race-safe)

On form submission, the system atomically checks seat availability and allocates or queues the patient.

- **Seats available:** creates a Registration with `status: registered`, decrements `seats_remaining`, generates a Reference Number. Returns a confirmation page.
- **Seats full, patient chooses waiting list:** creates a Waiting List Entry with a position number. Returns a waiting list confirmation page.

**Consequences (testable):**
- Seat check and decrement execute within a DB-level transaction using `SELECT FOR UPDATE` — mirrors existing slot locking pattern (Epic 03). Prevents double-allocation under concurrent submissions.
- Two concurrent submissions for the last seat: exactly one succeeds as a Registration; the other is offered the Waiting List.
- `seats_remaining` never goes below 0.
- Reference Number format: `EVT-{eventId padded 4 digits}-{sequential 3 digits}`.

#### FR-10: Duplicate registration prevention

If a phone number already has an active Registration or Waiting List Entry for this Event, the system detects the duplicate on submission and returns the existing record rather than creating a new one.

**Consequences (testable):**
- Duplicate check is by `(phone_number, event_id)` before seat allocation.
- Returns HTTP 409 with existing registration reference number and current status.
- Patient sees their registration status page (not a generic error).

---

### 4.4 Waiting List Management

**Description:** When an Event is fully booked, patients can join a Waiting List. When a Seat opens (due to a Registration cancellation), the first Waiting List Entry is automatically promoted to a Registration and notified via WhatsApp. Realizes UJ-2.

**Functional Requirements:**

#### FR-11: Waiting list entry

After seeing the "fully booked" state on the registration page, a patient may opt into the Waiting List. The system creates a `waiting_list_entry` record with an ordered position.

**Consequences (testable):**
- Position is 1-indexed and assigned by insertion order (first in, first promoted).
- Patient receives a WhatsApp message confirming their Waiting List position number.
- Waiting List count is visible on the Event detail portal and the Events list.

#### FR-12: Auto-promotion on seat opening

When a Registration is cancelled (by patient via FR-18, by staff via FR-21, or by event edit seat increase via FR-3) and `seats_remaining` would become > 0, the first Waiting List Entry is automatically promoted to a Registration.

**Consequences (testable):**
- Promotion executes within the same transaction as the cancellation (or via Inngest for async paths).
- Promoted patient receives a WhatsApp confirmation: seat allocated, event details, new Reference Number.
- `seats_remaining` remains 0 after promotion (seat was immediately reallocated).
- If no Waiting List Entries exist, the freed seat simply returns to `seats_remaining`.
- Multiple simultaneous cancellations: each cancellation promotes exactly one Waiting List Entry.

---

### 4.5 Notifications

**Description:** WhatsApp notifications are sent at key lifecycle moments. All notifications use the existing Meta WhatsApp Business API infrastructure with MSG91 SMS fallback. New message templates require Meta Business API pre-approval before go-live. Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-13: Registration confirmation

Immediately after a successful Registration (FR-9), the patient receives a WhatsApp confirmation: event title, date/time, venue/meeting link, Reference Number, and a self-service cancellation link.

**Consequences (testable):**
- Dispatched via Inngest `event/registration.confirmed` with idempotency key `{registrationId}:confirmation`.
- Cancellation link is token-based (no login required) and expires at Event start time.
- SMS fallback triggered on WhatsApp delivery failure.

#### FR-14: 24h event reminder

24 hours before an Event's start time, all Registrants with `status: registered` receive a WhatsApp reminder: event title, date/time, venue/link, Reference Number.

**Consequences (testable):**
- Scheduled via Inngest `sleepUntil` at publish time (and for late registrants, at registration time if the event is within 24h of the fire time).
- Skipped for Registrants who have cancelled since the job was scheduled.
- Respects a clinic-level toggle `event_reminder_enabled` (default true), extending the existing Settings → Notifications page.
- SMS fallback triggered on WhatsApp delivery failure.

#### FR-15: Event change notification

When staff saves a `published` Event with existing Registrations and has changed date, time, location, or meeting link, all Registrants with `status: registered` receive a WhatsApp update with the new details.

**Consequences (testable):**
- Only material field changes trigger notification (date, time, location, meeting_link). Description, fee, and cover image changes do not.
- Dispatched via Inngest `event/details.updated`.
- Existing 24h reminder jobs are cancelled and rescheduled with the new datetime.

#### FR-16: Event cancellation notification

When an Event is cancelled (FR-5), all Registrants with `status: registered` receive a WhatsApp notification: event cancelled, event title, original date.

**Consequences (testable):**
- Waiting List patients receive a separate "sorry" notification.
- Dispatched via Inngest `event/cancelled` alongside the cancellation transaction.
- Scheduled reminder jobs for the event are cancelled.

#### FR-17: Patient cancellation confirmation

When a patient cancels their own Registration (FR-18), they receive a WhatsApp confirmation of the cancellation.

**Consequences (testable):**
- Sent immediately on cancellation via Inngest `event/registration.cancelled`.
- If auto-promotion triggers (FR-12), the promoted patient's confirmation (FR-13) is sent in the same flow.

---

### 4.6 Patient Self-Service Cancellation

**Description:** A Registrant can cancel their own Registration at any time before the Event starts, via a token-based cancellation link included in their confirmation WhatsApp, or via a WhatsApp keyword reply. Cancellation automatically frees the Seat and triggers Waiting List promotion. Realizes UJ-2.

**Functional Requirements:**

#### FR-18: Self-service cancellation

Patient cancels via one of two paths:
- **Link:** Token-based URL (from confirmation WhatsApp) opens a simple confirmation page. Patient confirms cancellation.
- **WhatsApp reply:** Patient sends `CANCEL_EVENT_REG:{registrationId}` (button reply or keyword) — parsed before general keyword detection, mirroring the existing `CANCEL_APPOINTMENT` button reply pattern (Epic 07).

**Consequences (testable):**
- Cancellation token is single-use and expires at Event start time.
- Post-start-time: cancellation link shows "The event has already started — cancellations are no longer accepted."
- Registration `status` → `cancelled`. `seats_remaining` incremented, triggering FR-12 auto-promotion.
- Patient receives FR-17 cancellation confirmation.
- Audit log entry written for the cancellation.

---

### 4.7 Admin Event Portal

**Description:** The Events section in the admin portal gives clinic staff a list of all clinic events and a detail view per event with tabs for registrant management, waiting list, invitations, and attendance. Realizes UJ-1, UJ-3.

**Functional Requirements:**

#### FR-19: Events list page

Staff can view all Events for the clinic, filterable by status and sortable by date. Each row shows: title, date, status badge, seat summary (registered / total), and waiting list count.

**Consequences (testable):**
- Events are tenant-scoped (clinicId from session).
- Filter options: All, Draft, Published, Cancelled, Completed.
- Events belonging to an Event Series are grouped with an expand/collapse affordance. [ASSUMPTION: series grouping improves scannability — confirm with UX]
- Pagination: 20 events per page (matches existing list patterns).
- Empty state shown when no events exist, with a CTA to create the first event.

#### FR-20: Event detail page

The event detail page has four tabs:
- **Overview:** all event fields, seat stats (seats_total, seats_registered, seats_remaining, waiting_list_count), edit and cancel actions.
- **Registrants:** list with name, phone, registration time, Reference Number, status badge, and attendance action buttons (available after event start time).
- **Waiting List:** ordered list with position number, name, phone, joined_at.
- **Invitations:** patient name, phone, sent_at, WhatsApp delivery status.

**Consequences (testable):**
- Seat stats update in real time (or on page refresh) as registrations occur.
- Attendance action buttons (Mark Attended / Mark No-Show) on the Registrants tab are disabled until `now >= event.start_time`.
- Series events show a breadcrumb or indicator linking back to the series.

#### FR-21: Manual registrant management

Staff can manually add a patient to a `published` Event's Registrant list (walk-in override) or manually cancel a Registration from the portal.

**Consequences (testable):**
- Manual add: checks seat availability, creates Registration, triggers FR-13 WhatsApp confirmation to the patient.
- Manual add bypasses the registration deadline (staff override).
- Manual add against a full event is blocked unless staff acknowledges the overflow (walk-in override prompt — mirrors walk-in overflow pattern from Epic 05).
- Manual cancel: sets Registration `status: cancelled`, triggers FR-12 auto-promotion and FR-17 notification.

---

### 4.8 Attendance Tracking

**Description:** After an Event's start time, staff mark each Registrant as `attended` or `no_show`. When attendance is fully recorded, the Event is closed as Completed. Realizes UJ-3.

**Functional Requirements:**

#### FR-22: Mark attendance

On the Registrants tab of an Event detail (available after event start time), staff toggle each Registrant's status to `attended` or `no_show`. A bulk "Mark all attended" action is available with individual overrides.

**Consequences (testable):**
- Attendance marking is available from `event.start_time` onward.
- Registrations with `status: cancelled` are excluded from attendance marking.
- No WhatsApp notification is sent on attendance marking (staff-only action).
- When all non-cancelled Registrants have a final attendance status (attended or no_show), staff can explicitly mark the Event as Completed, or the Event auto-transitions to `completed` 24h after end time. [ASSUMPTION: 24h auto-complete — confirm during architecture]
- Event `status: completed` is read-only; no further edits or registrations accepted.

---

### 4.9 Optional Event Fee

**Description:** Events may have an optional registration fee (INR). Fee collection is offline (at venue); the system displays the fee and includes it in notifications but does not process payments. Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-23: Event fee display

Staff can set an optional `event_fee` (INR integer ≥ 0, default 0) on the event creation/edit form.

**Consequences (testable):**
- `event_fee = 0` → registration page displays "Free event."
- `event_fee > 0` → registration page displays "Registration fee: ₹{fee} — payable at venue."
- Fee is included in the WhatsApp registration confirmation message.
- Fee is visible on the Event detail Overview tab.

**Out of Scope (v1):** Online payment processing, per-registrant payment status tracking. [NOTE FOR PM: v2 candidate — "Mark fee collected" toggle per registrant on attendance tab]

---

## 5. Non-Goals (Explicit)

- **Online payment processing** — fees are displayed only, not collected via the platform in v1.
- **Public event discovery** — events are not listed on any public directory; access is only via a shared Registration Link.
- **Video/streaming integration** — meeting links are free text; no Zoom or Google Meet API integration.
- **Patient accounts** — patients do not create a login to register.
- **Post-event analytics dashboard** — attendance data is captured but reporting integration is deferred.
- **Custom registration form fields** — v1 form is fixed (name + phone only).
- **Automated waiting list position updates** — patients are not notified of their changing position as others cancel.
- **Event-level RBAC restrictions** — all clinic roles can create, edit, and cancel any event in v1.

## 6. MVP Scope

### 6.1 In Scope
- Event CRUD (create, read, update, cancel) with optional daily/weekly recurrence and per-occurrence editability
- Patient invitation via WhatsApp blast (multi-select from patient directory)
- Public registration page (seat allocation, waiting list opt-in, duplicate detection)
- Automatic WhatsApp notifications: Invitation, registration confirmation, 24h reminder, change notification, event cancellation, waiting list promotion, patient cancellation confirmation
- Self-service patient cancellation (token link + WhatsApp keyword)
- Admin portal: Events list, Event detail (4 tabs: Overview, Registrants, Waiting List, Invitations)
- Manual staff registration override (walk-in) and manual cancellation
- Post-event attendance marking (attended / no_show) with bulk action
- Optional event fee (display only, no payment processing)
- SMS fallback for all WhatsApp notifications (existing infrastructure)
- Clinic-level event reminder toggle in Settings → Notifications
- Tenant isolation (events scoped to clinicId)
- Audit log entries for event creation, edit, cancellation, and manual registration actions

### 6.2 Out of Scope for MVP
- Online payment processing [NOTE FOR PM: v2 — "mark fee collected at venue" per registrant]
- Monthly / bi-weekly / custom recurrence patterns
- Event analytics / reports tab integration [NOTE FOR PM: v2 — integrate into existing Reports module]
- Custom registration form fields beyond name + phone
- Public event discovery / SEO-optimised event pages
- Waiting list position update notifications
- Patient-facing event history (past registrations)
- Event-level RBAC restrictions (who can create vs. manage)

## 7. Success Metrics

**Primary**
- **SM-1:** Events published per clinic per month — target ≥ 2 within 60 days of launch. Validates FR-4, FR-5.
- **SM-2:** WhatsApp Invitation to Registration conversion rate — target ≥ 30% of invited patients register. Validates FR-7, FR-8, FR-9.

**Secondary**
- **SM-3:** Seat fill rate — percentage of `seats_total` that reach `attended` or `registered` status at event time. Target ≥ 60%. Validates FR-9.
- **SM-4:** Attendance marking completion — percentage of `completed` events with all registrants marked. Target ≥ 70%. Validates FR-22.
- **SM-5:** Patient self-service cancellation rate — percentage of cancellations done via self-service link (not staff-initiated). Target ≥ 50%. Validates FR-18.

**Counter-metrics (do not optimize)**
- **SM-C1:** WhatsApp blast volume per clinic per week — cap at 200 Invitations/week per clinic to avoid Meta spam classification and patient opt-out spikes. Counterbalances SM-2.
- **SM-C2:** Waiting list abandonment — patients offered the Waiting List who decline. High decline signals registration-page friction; do not optimise waiting list sign-up rate at the expense of honest availability communication.

## 8. Open Questions

1. **WhatsApp template approval:** Invitation, registration confirmation, change notification, cancellation, and waiting list promotion are new message templates requiring Meta Business API pre-approval. Is there an existing approval pipeline, or should development begin with fallback SMS only until templates are approved?
2. **Series edit — data model:** When "This and future events" is edited, should the system split the series (create a new `series_id` from that point forward) or record an `effective_from` override on the shared series record? This has architectural implications and needs PM alignment before the architecture phase.
3. **Seat limit reduction below registrations:** FR-3 blocks reduction. Should there be a staff override path ("I understand — reduce anyway and notify affected registrants") in v1, or is the hard block the correct default?
4. **Multi-doctor events:** Can an event display an associated doctor's name (for patient trust on the registration page), or are all events clinic-branded only in v1? [ASSUMPTION: clinic-level only in v1 — see §9]
5. **Event fee v2 scope:** Should v2 include per-registrant "mark fee collected at venue" (staff action on attendance tab), or full UPI/payment-link integration?

## 9. Assumptions Index

- **§4.1 / FR-1** — Cover image on event creation is optional in v1. Not mentioned by user; UX will decide whether to include in the form.
- **§4.7 / FR-19** — Events in a series are grouped in the list view with expand/collapse. Assumed for scannability; to be confirmed during bmad-ux.
- **§4.8 / FR-22** — Events auto-transition to `completed` 24h after end time if not manually closed. Assumed for lifecycle completeness; confirm during architecture.
- **§8, Q4** — Events are clinic-level in v1 (not doctor-specific). User confirmed "anyone from doctor's team" creates events without indicating per-doctor scope.
