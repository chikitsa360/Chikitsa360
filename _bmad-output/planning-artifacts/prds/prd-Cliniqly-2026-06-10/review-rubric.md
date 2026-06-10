# PRD Quality Review — Patient Events Module

## Overall verdict

The PRD is well-structured and substantially stronger than the average brownfield feature spec: it has a working glossary, contiguous FR IDs, testable consequences on every FR, honest non-goals, and a counter-metric section that shows real product thinking. The primary risks are two unresolved architectural time-bombs (series edit data-model and Inngest reminder scheduling for late registrants), one broken downstream assumption about WhatsApp template readiness, and a thin but workable RBAC omission that will bite in implementation.

---

## 1. Decision-readiness — adequate

The PRD makes most decisions explicitly and names the trade-offs it took (offline-only payments, clinic-level RBAC, no monthly recurrence). Open Questions are genuinely open, not rhetorical. However, two questions in §8 have architectural consequences that block design — they are flagged as open but not escalated with a clear owner or deadline, leaving a chain-top document with two unresolved load-bearing choices.

### Findings

- **high** — Series-edit data model is unresolved but architecture-blocking (§8 Q2, FR-3) — "Split series or `effective_from` override?" is not a detail; it determines the DB schema for `series_id`, whether series events are independent rows or linked via a parent, and how edit-scope UI works. The PRD says "needs PM alignment before architecture phase" but does not nominate an owner, a decision deadline, or a default to proceed under. UX and architecture cannot start this feature safely. *Fix:* Decide and record the default. Recommended: generate N independent rows linked by `series_id`; "this and future" creates a new `series_id` from that point. Record as a decision, not a question.

- **high** — WhatsApp template approval path is unresolved (§8 Q1) — The PRD correctly identifies that 5+ new Meta-approved templates are required. It asks whether to build SMS-only first but defers the answer. This is a go/no-go dependency for FR-7, FR-13, FR-14, FR-15, FR-16, FR-17. If templates are not approved at launch, the module's primary value proposition (WhatsApp-first) is broken at launch. *Fix:* Add a `[NOTE FOR PM]` with a required decision date. Specify a fallback launch plan (SMS-only) and which FRs are degraded in that mode.

- **medium** — Seat-limit reduction override (§8 Q3) deferred without a default — FR-3 hard-blocks reduction below registered count. The open question asks about a staff override path. Without a resolution, an architect may build the hard block and a developer may later need to unpick it. *Fix:* Choose a v1 default (hard block recommended) and close the question with a `[DECISION]` marker.

- **low** — `[NOTE FOR PM]` callouts at real tensions are present (§4.2, §6.2, §4.9) and well-used. No issue.

---

## 2. Substance over theater — strong

Personas are named, role-specific, and each drives at least one FR (Dr. Mehta → recurrence + invitations, Anita → public registration + waiting list, Riya → attendance marking). The Vision (§1) is specific to clinic health programs and would not swap into a generic SaaS PRD. NFRs embedded in FRs have actual product-specific values (200 Invitations/clinic/week cap in SM-C1, 52 occurrences max in FR-2, 20 events per page in FR-19). No boilerplate scalability claims detected.

### Findings

- **low** — The Vision's closing line ("every event is accountable, seat-safe, and traceable") is mildly abstract but immediately preceded by a concrete pain statement. Not a significant problem; flagged only for polish.

- **low** — FR-23 (event fee) is present but thin as a section. It is a display-only feature with three testable consequences. This is proportionate to its actual scope; no over-engineering concern. The `[NOTE FOR PM]` v2 callout is correctly placed.

---

## 3. Strategic coherence — strong

The PRD has a clear thesis: clinic staff run group health programs today with WhatsApp groups and spreadsheets; giving them a first-class in-platform flow will reduce coordination cost and produce a traceable attendance record. Every feature in §4 serves that arc. No features appear without a UJ. The MVP scope (§6) is tight and the deferral reasons are stated.

### Findings

- **medium** — Success Metrics are activity metrics, not outcome metrics. SM-1 (events published ≥ 2/clinic/month) measures adoption but not value. SM-3 (seat fill rate ≥ 60%) is the closest to a value metric but does not have a baseline comparison. The thesis is "staff spend less time coordinating" — there is no metric for coordination time saved or staff effort reduction. *Fix:* Add one staff-effort metric (e.g., time from event creation to invitation blast, or percentage of events where no manual registrant correction was needed). This does not need to be a tracked metric at launch — a qualitative proxy is enough to validate the thesis.

- **low** — SM-2 (Invitation-to-Registration conversion ≥ 30%) is a meaningful funnel metric. Target of 30% is plausible but not grounded in any baseline. Consider adding `[ASSUMPTION: 30% is an initial target; revise after first 30-day cohort]`.

- **low** — Counter-metrics (SM-C1, SM-C2) are well-chosen and genuinely constrain optimisation. This is above-average PRD practice.

---

## 4. Done-ness clarity — strong

Nearly every FR has an explicit "Consequences (testable)" block with concrete HTTP codes, state transitions, and field-level constraints. This is the strongest dimension of the PRD.

### Findings

- **high** — FR-14 (24h reminder) has a broken scheduling logic statement — "for late registrants, at registration time if the event is within 24h of the fire time" (§4.5). This is ambiguous and contradictory. If a patient registers 2 hours before the event, the "24h reminder" fire time is already in the past — there is no reminder to send. The sentence tries to handle this edge case but does so with a circular phrase ("within 24h of the fire time"). The existing Epic 07 pattern (`scheduleReminders` skips past fire-times) already handles this correctly by checking if the scheduled time is in the past and skipping. *Fix:* Replace with: "If the computed 24h fire time is already in the past at registration time, the 24h reminder is skipped. Only send the confirmation (FR-13) in that case."

- **medium** — FR-20 (Event detail page) states seat stats update "in real time (or on page refresh)" — "or on page refresh" is an escape hatch that leaves the implementation undefined. The existing appointment system uses Pusher for real-time updates (`appointment.created` channel). Whether the same pattern applies here is an architecture question. *Fix:* State the intended delivery mechanism explicitly — either "via Pusher `event.registration_updated` on the `clinic-{clinicId}` channel (mirrors existing pattern)" or "on page refresh only (polling not required for v1)."

- **medium** — FR-22 auto-transition to `completed` 24h after end time is tagged `[ASSUMPTION]` but placed inside the "Consequences (testable)" block — this means an engineer will implement it as a requirement. If the assumption is unconfirmed, it should be excluded from the testable block and listed only in §9. *Fix:* Move the auto-transition to a separate "open" callout and exclude it from the testable consequence until confirmed. Leave only the explicit staff-initiated complete action as a testable consequence.

- **low** — FR-9 Reference Number format `EVT-{eventId padded 4 digits}-{sequential 3 digits}` — "sequential 3 digits" is ambiguous: sequential per event (resets to 001 for each event) or globally sequential? *Fix:* Specify "sequential per event, starting at 001."

- **low** — FR-13 states the cancellation link "expires at Event start time" — FR-18 repeats this. Consistent. No issue with the content, but the token generation mechanism is not specified (JWT, opaque DB token, signed URL). This is an architecture detail, but noting it here as a downstream architecture signal.

---

## 5. Scope honesty — strong

Non-Goals (§5) are doing real work: online payments, public discovery, video integration, patient accounts, post-event analytics, custom fields, waiting list position updates, and event-level RBAC are all explicitly excluded with enough context to prevent scope creep. Assumptions Index (§9) is correctly populated with inline `[ASSUMPTION]` tags that round-trip to it.

### Findings

- **medium** — Event-level RBAC is deferred (§5, §6.2) but not explained. The PRD states "all clinic roles can create, edit, and cancel any event in v1." This means a RECEPTIONIST can cancel a doctor's event or change its date. Given the existing RBAC model (OWNER / DOCTOR / RECEPTIONIST with differentiated permissions across the rest of the platform), this is a meaningful deviation. It may be intentional but it is not argued. *Fix:* Add a `[NOTE FOR PM]` in §5 explaining the reasoning: "v1 uses permissive RBAC for events to reduce complexity. Revisit if staff conflicts are reported." This turns a silent omission into a stated trade-off.

- **medium** — Patient opt-out is not addressed. The existing architecture (Epic 07) has a `whatsapp_opt_out` flag on patients. If an opted-out patient is selected in FR-6 for an invitation blast, should they be silently skipped, visually flagged in the selection UI, or blocked from selection? This is absent from FR-6 and FR-7 and from Non-Goals. *Fix:* Add one testable consequence to FR-6: "Patients with `whatsapp_opt_out = true` are visually flagged in the selection list and excluded from the blast automatically; their count does not appear in the 'Sent to N patients' confirmation."

- **low** — The assumption that cover image is "optional in v1 — UX will decide" (§9, FR-1) is reasonable for a brownfield module. Correctly tagged.

---

## 6. Downstream usability — adequate

Glossary (§3) is present and domain nouns are used consistently: "Event", "Registration", "Registrant", "Waiting List Entry", "Reference Number", "Invitation" appear with stable capitalisation throughout. FR IDs are contiguous (FR-1 through FR-23) and cross-references resolve (FR-3 references FR-12 and FR-15; FR-5 references FR-16; etc.). UJs have named protagonists (Dr. Mehta, Anita, Riya) with roles and context.

### Findings

- **medium** — "Registration Link" and "cancellation link" are both defined but the cancellation link has no glossary entry. FR-13 defines it inline ("token-based, expires at event start time") and FR-18 references it consistently, but a bmad-ux agent extracting the glossary will miss it. *Fix:* Add "Cancellation Link — A token-based URL included in the registration confirmation WhatsApp message, allowing a Registrant to cancel their own Registration without logging in. Expires at Event start time." to §3.

- **medium** — FR-20 tab structure (Overview, Registrants, Waiting List, Invitations) is well-defined for UX extraction, but the data fields listed per tab are not consistently specified. "Registrants" tab lists 6 fields; "Waiting List" tab lists 4 fields; "Invitations" tab lists 4 fields; "Overview" tab references "all event fields" without enumerating them. A UX agent sourcing from FR-20 will need to reconstruct the Overview field list from FR-1. *Fix:* Add an explicit field list to the Overview tab description: "all event fields from FR-1 plus seat stats."

- **low** — Series events "show a breadcrumb or indicator linking back to the series" (FR-20) — "the series" has no navigable entity in the portal; there is no "series detail page." This creates a UX dead-end unless the link goes to a filtered Events list. *Fix:* Clarify: "linking to the Events list filtered to the same `series_id`" or specify a series detail page as a future scope item.

- **low** — UJ-3 (Riya marks attendance) does not describe the "Mark all no-show" bulk action that FR-22 defines. The UJ is not wrong but a UX designer reading UJ-3 alone will not know about bulk marking. No fix required at PRD level — FR-22 covers it — but flag for UX brief.

- **low** — SM IDs are globally unique and do not collide with existing Epic 01–10 SM IDs (those are not numbered in the PRD). No issue, but the architecture document should note the SM namespace.

---

## 7. Shape fit — adequate

For a chain-top brownfield feature PRD feeding bmad-ux, architecture, and story creation, the PRD hits most required marks: named UJ protagonists, a glossary, stable FR IDs, testable consequences, explicit non-goals, and an assumptions index. The document is appropriately detailed (not over-specified for implementation, not under-specified for UX). The Notifications section (§4.5) is structured as a single sub-feature with FRs rather than mixing notifications into each parent FR — this is cleaner for Inngest architecture extraction.

### Findings

- **medium** — There is no data model sketch or entity list. For a brownfield brownfield addition that must produce new tenant-schema tables, a one-paragraph "new entities" section (Event, Registration, WaitingListEntry, EventInvitation, with their primary keys and FK relationships) would make the architecture phase significantly faster. The PRD references `series_id`, `event_invitation`, `seats_remaining`, `cancellation_token`, `event_reminder_enabled` — these are scattered across FRs. An architecture agent must reconstruct the entity list from the FR text. *Fix:* Add a §10 "Data Shape" section (not a full schema, just entity names + key fields + relationships) that lets the architecture agent start from a stable surface. Example: "Event (id, clinic_id, series_id?, title, date, start_time, end_time, seats_total, seats_registered, status, event_fee, registration_link_token, cancellation_token); Registration (id, event_id, patient_phone, patient_name, reference_number, status, registered_at); WaitingListEntry (id, event_id, patient_phone, position, joined_at); EventInvitation (id, event_id, patient_id, sent_at, delivery_status)."

- **medium** — The PRD does not specify which API routes are new vs. which extend existing routes. Given the brownfield context, a downstream architect needs to know whether `/api/v1/events/*` is a new namespace, whether the existing `/api/v1/slots/available` or `/api/v1/booking` endpoints are modified, and whether the public registration page reuses the `(booking)` route group pattern. *Fix:* Add a one-sentence routing note per new public surface: "Public registration page: new route group `(events)` mirroring `(booking)` pattern" and "Admin portal: new routes under `(dashboard)/events/`."

- **low** — The document is 463 lines, which is appropriate for 23 FRs across 9 sub-features on a production SaaS. Not over-formalized.

---

## Mechanical notes

**Glossary drift:** "cancellation link" used in FR-13, FR-18, UJ-2 but absent from §3 Glossary. All other glossary terms (Event, Registration, Registrant, Waiting List Entry, Reference Number, Invitation, Seat, Event Series, Event Status, Registration Status, Registration Link, Attendance) are used consistently with correct capitalisation throughout the document.

**ID continuity:** FR-1 through FR-23 — contiguous, no gaps, no duplicates. UJ-1 through UJ-3 — contiguous. SM-1 through SM-5, SM-C1, SM-C2 — contiguous within namespace. No ID collisions detected.

**Assumptions Index roundtrip:** Four assumptions in §9 each have a corresponding inline `[ASSUMPTION]` tag at their source location (FR-1, FR-19, FR-22, §8 Q4). All four round-trip correctly. No dangling assumptions found in §9; no inline `[ASSUMPTION]` tags found without a §9 entry.

**Cross-reference resolution:**
- FR-3 → FR-15 (change notification): resolves correctly.
- FR-3 → FR-12 (auto-promotion on seat increase): resolves correctly.
- FR-5 → FR-16 (cancellation notification): resolves correctly.
- FR-9 → FR-13 (confirmation): resolves correctly.
- FR-12 → FR-3 (seat increase trigger): resolves correctly.
- FR-18 → FR-12 (auto-promotion): resolves correctly.
- FR-18 → FR-17 (cancellation confirmation): resolves correctly.
- FR-21 → FR-13 (confirmation for manual add): resolves correctly.
- FR-21 → FR-12 (auto-promotion for manual cancel): resolves correctly.
- SM-C1 referenced in FR-7 body: resolves correctly.

**Epic 07 pattern references:** FR-18 correctly cites the `CANCEL_APPOINTMENT` button-reply pattern. FR-9 correctly cites the `SELECT FOR UPDATE` slot-locking pattern. FR-7 correctly mirrors the Inngest async blast pattern. These references are accurate to the existing codebase architecture as documented.

**One broken reference:** FR-4 states "If a 24h reminder was configured (FR-14), the Inngest reminder job is scheduled at publish time." FR-14 does not define a "configured" toggle — it defines the `event_reminder_enabled` clinic toggle. The phrase "if configured" suggests a per-event toggle that does not exist in FR-14. *Fix:* Change to "If the clinic's `event_reminder_enabled` toggle is on (FR-14), the Inngest reminder job is scheduled at publish time."
