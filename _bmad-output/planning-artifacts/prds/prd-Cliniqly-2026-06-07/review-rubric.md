# PRD Quality Review — Cliniqly MVP

## Overall verdict

This is an above-average launch PRD: the scenario library is unusually thorough, FR consequences are mostly testable, and the compliance section is grounded in specific Indian law. The main weaknesses are a critical unresolved architecture ambiguity (Open Question 1 — shared vs. clinic-owned WhatsApp number) that blocks the entire integration architecture, a handful of vague-done criteria in onboarding and NFRs, and a monetisation model that is almost fully specified in prose but never stress-tested against the feature set it must constrain.

---

## 1. Decision-readiness — adequate

### Findings

- **Critical** — Open Question 1 is unresolved and blocks architecture (§14 / OQ-1) — The shared-vs-clinic-owned WhatsApp number question is tagged "resolve before Week 3" but is the most load-bearing decision in the entire PRD. If shared-number is chosen, FR-1 through FR-6, the Meta Cloud API integration model, tenant message routing, and template management are all substantially different architecturally. No fallback position or time-boxed escalation path is given. *Fix:* Promote this to a blocker. State a default decision ("If unresolved by Day X, we default to clinic-owned number for MVP and revisit shared-number at Phase 1") so engineering can proceed. Do not ship a PRD with the core integration model undecided.*

- **High** — Open Question 5 has a partial answer in SC-31 that contradicts the OQ entry (§14 / OQ-5 vs. SC-31) — SC-31 step 2 already specifies the exact patient-facing message when the Starter booking limit is reached ("We are unable to accept online bookings..."). OQ-5 asks "what message does the Patient receive?" as if unanswered. This drift signals the OQ was not updated when the scenario was written. *Fix:* Close OQ-5, cite SC-31, and tag the message copy as a decision (can be changed at implementation).*

- **High** — Trade-off for no-OTP web booking is surfaced but not decided (§4.2 / FR-8 / ASSUMPTION) — The assumption says "revisit at pilot review if fake bookings appear." But no fraud signal threshold, no rollback plan, and no owner for a mid-pilot decision is named. *Fix:* Define what "fake booking signal" means quantitatively (e.g., >5% of web bookings result in no-show with no patient-contact history) and name the decision owner.*

- **Medium** — Upgrade/downgrade path for billing is missing (§9) — The monetisation table shows plan limits but there is no FR or MON item covering plan downgrade (e.g., Growth → Starter mid-month when Doctor count exceeds new limit). SC-41 covers upgrade only. *Fix:* Add a NON-GOAL statement if downgrade is manual (via support), or add a MON-4 covering the downgrade grace period and excess-Doctor handling.*

- **Medium** — "Prorated billing handled by payment processor (Phase 1) — in MVP, manual upgrade via Cliniqly support" is buried in SC-41 prose (§2.4 / SC-41 step 5), not in §9 (Monetisation) — A decision-maker reading §9 has no idea upgrades are manual. *Fix:* Promote this to a MON item or an explicit note in §9.2.*

---

## 2. Substance over theater — strong

### Findings

- **Medium** — §12 "Why Now" is well-argued on two of three points, but the DPDP Act enforcement timing claim is thin (§12) — The claim "DPDP Act 2023 enforcement beginning" as a 2026 market moment is stated without a source or qualifier. As of 2026, the Data Protection Board has not yet been constituted; enforcement timelines are uncertain. This could be used against the product in a board or investor review. *Fix:* Qualify: "DPDP Act 2023 passed; enforcement regime is being constituted — early compliance is a window before competitors are forced to catch up." Cite the Rules publication status.*

- **Low** — §1 Vision is earned: it is specific to Indian independent clinics, names the daily pain precisely ("receptionist buried in WhatsApp chats"), and sets a measurable promise ("confirmed appointment... in under 60 seconds"). No generic SaaS boilerplate detected. No action needed.

- **Low** — Persona descriptions (UJ-1 through UJ-4) are grounded in specifics (role, city, device, daily volume). The extended persona for Sunita in addendum §A6 adds genuine UX-useful detail. Acceptable.

- **Low** — NFRs are largely specific (p95 latency, AES-256, RLS at DB layer) rather than generic boilerplate. NFR-15 (WCAG 2.1 AA) is the only entry that is an industry-standard cite with no Cliniqly-specific grounding — acceptable given the audience and launch stage.

---

## 3. Strategic coherence — strong

### Findings

- **Medium** — Reports feature (§4.11, FR-38 through FR-45) accounts for 8 of 45 FRs — more than any other feature cluster — but its strategic thesis is not stated (§4.11 description) — The description says "Clinic Owners and Doctors can view, filter, print, and download six report types." It does not say why reports are in MVP rather than Phase 1, or what job-to-be-done they serve beyond the UJ-5 revenue check. The business plan apparently positions reports as a retention driver (Dr. Mehta reviewing weekly performance), but that framing is implicit. *Fix:* Add one sentence to the §4.11 description: "Reports are in MVP because clinic owners who can see no-show rate reductions convert at higher rates and churn at lower rates — they are the primary retention evidence loop."*

- **Low** — The arc from WhatsApp booking → Dashboard → Reports → Reminders → reduced no-shows is coherent and traceable through FRs, success metrics, and scenarios. The product has a clear thesis. No structural fix needed.

- **Low** — Non-goals are well-sequenced: Phase 1 items (GST, native app, Google Reviews, patient rescheduling) are visibly adjacent to MVP and create a believable roadmap. Phase 2 and 3 items are correctly further. Coherent.

---

## 4. Done-ness clarity — adequate

### Findings

- **Critical** — FR-36 consequence "Completable in under 30 minutes by a non-technical Clinic Owner" is not a testable criterion (§4.10 / FR-36) — "Non-technical" is undefined. There is no usability test methodology, participant profile, or pass/fail threshold specified. An engineer cannot write a test case for this. *Fix:* Rewrite as: "In a moderated usability test with 5 participants matching the Clinic Owner persona (smartphone-literate, no software background), median completion time is < 30 minutes with no facilitator assistance on steps 1–3; step 4 (WhatsApp setup) may require reference to in-wizard guide." Or, if usability testing is out of scope pre-launch, convert to a measurable proxy: "Setup wizard can be completed from the SM-4 funnel data — target median < 30 min from first login to WhatsApp number connected."*

- **High** — FR-12 consequence "All modifications are logged with timestamp and the acting staff member's role" — no query/retrieval requirement stated (§4.3 / FR-12) — Logs are written but there is no FR specifying where audit logs are readable. Are they visible in the UI? Via support export only? This matters for compliance (DPDP) and for debugging disputes. *Fix:* Add: "Audit log is accessible to the Clinic Owner in Settings → Activity Log, or explicitly tag as internal/support-only and note it is not a patient-facing surface."*

- **High** — SC-50 references "system sends a WhatsApp message to the Clinic Owner when the report is available" for slow reports — this notification flow has no corresponding FR (§2.4 / SC-50) — SC-50 step 3 describes an async report-ready notification via WhatsApp, but no FR in §4.11 requires this capability. It is not in FR-38 through FR-45, and there is no FR covering a report queue or async delivery. *Fix:* Either add an FR-45b or a consequence bullet in FR-45 ("If report generation exceeds 8 seconds, system queues the report and sends a WhatsApp notification to the Clinic Owner when ready"), or remove the async delivery promise from SC-50.*

- **High** — MON-1 through MON-3 are stated as plan enforcement rules, not FRs with testable consequences — they read like policy statements, not engineering requirements (§9.2) — MON-1 says "Clinic Owner receives a WhatsApp alert with an upgrade prompt" — but what template? What content? What is the upgrade link destination? *Fix:* Either convert MON items to FRs with consequences tables (preferred), or add a note that MON items are implementation-detailed in §2.4 scenarios and cite the specific SC numbers (SC-31, SC-32, SC-40, SC-41).*

- **Medium** — NFR-5 "99.5% monthly uptime" is not tied to a measurement methodology or exclusion list (§7) — Does planned maintenance count against uptime? What is the measurement window — calendar month or rolling 30 days? Who measures it — Cliniqly or a third party? *Fix:* Add: "Measured by [UptimeRobot / AWS CloudWatch synthetic checks] on the web portal and WhatsApp webhook endpoint; planned maintenance windows (NFR-6) excluded from SLA calculation."*

- **Medium** — FR-22 consequence "Reminder is not sent if the Appointment was booked less than 24 hours before the scheduled time" is clear, but FR-23 (2-hour reminder) has no analogous rule — what happens if appointment is booked 1 hour before the scheduled time? (§4.6 / FR-22, FR-23) — *Fix:* Add to FR-23: "Not sent if the Appointment was booked less than 2 hours before the scheduled time."*

- **Medium** — FR-34 "Sessions persist for 30 days on a trusted device; re-authentication required on a new or unrecognised device" — "trusted device" and "unrecognised device" are undefined (§4.9 / FR-34) — What is the trust signal? Browser fingerprint? Cookie? A user clearing browser storage would trigger re-auth — is that intended? *Fix:* Define: "A device is 'trusted' if the session token has been issued to it and has not been revoked. Session token is stored as an HttpOnly cookie; clearing cookies or using a different browser constitutes a new device."*

- **Low** — FR-15 double-booking prevention is testable and specific. No fix needed.

- **Low** — FR-5 token assignment ("sequential integer scoped per Clinic per day, resetting at 1 each day at midnight IST") is precise and testable. No fix needed.

---

## 5. Scope honesty — strong

### Findings

- **High** — Google Review automation is listed as both a GTM differentiator in §14 OQ-4 and as deferred to Phase 1 in §6.2, but OQ-4 is never closed (§14 / OQ-4) — The PRD says "Confirm: MVP or Phase 1?" but the answer already appears to be Phase 1 (§6.2). If the answer is known, close the question. If it is genuinely open, state the cost of inclusion (complexity, Meta policy risk for review-solicitation messages). *Fix:* If Phase 1 is confirmed, mark OQ-4 closed and note the reason. If still open, add a decision deadline.*

- **Medium** — Patient-initiated rescheduling via WhatsApp is deferred to Phase 1 and called out as a "high request item" — but there is no description of how patients are expected to reschedule in MVP if they need to change their time (§6.2 / FR-6 Out of Scope) — The only available path is to cancel and rebook, which resets their token and loses queue position. Is this acceptable at launch? SC-21 covers receptionist-initiated reschedule, not patient-initiated. *Fix:* Add a sentence in §5 Non-Goals: "Patients who need to reschedule must cancel via WhatsApp (FR-6) and rebook — they receive a new Token. Clinic staff can reschedule on behalf of patients (FR-12)." This sets expectation explicitly.*

- **Medium** — SMS fallback provider (MSG91) is named, but the cost and rate limits for SMS are not stated anywhere in the PRD or addendum (§11 / FR-24) — WhatsApp cost-per-message is documented in addendum §A1, but MSG91 SMS cost per fallback message is absent. For a Starter plan clinic at ₹999/month with 200 WhatsApp messages, SMS fallback costs could erode unit economics. *Fix:* Add a note in §11 or addendum §A1: MSG91 SMS rate (approximately ₹0.15–0.25/SMS for transactional) and estimate fallback volume assumption (e.g., <5% of messages trigger fallback).*

- **Low** — §5 Non-Goals is comprehensive and specific. Items are clearly phased. The "Not a patient discovery marketplace" entry proactively handles a common comparison question. Well done.

- **Low** — ASSUMPTION tagging is consistent throughout. The §15 Assumptions Index is complete and maps to sections. Roundtrip check: all inline [ASSUMPTION] tags that appear in §2–§9 are indexed in §15, with the exception of one (see Mechanical Notes below).

---

## 6. Downstream usability — adequate

### Findings

- **Critical** — FR-6b is architecturally significant (Redis state durability) but is not included in §6.1 In Scope's FR range listing — §6.1 lists "FR-1 through FR-6" for WhatsApp Appointment Booking but FR-6b is not mentioned (§6.1) — A story-creation author scanning §6.1 for scope would not know FR-6b exists. *Fix:* Update §6.1 to read "FR-1 through FR-6b".*

- **High** — SC-24 (visit notes) references a Doctor role accessing "appointment list" but the FR (FR-18) says notes are "not visible to Receptionist" — the access table in FR-33 lists "Add visit notes to Appointments: Yes (own) for Doctor" but does not explicitly state Receptionist cannot view (only cannot add) — there is an ambiguity about Receptionist read access to visit notes (§4.5 / FR-18 vs. §4.9 / FR-33) — *Fix:* Add a row to the FR-33 table: "View visit notes on Appointments: Yes (Clinic Owner) / Yes, own appointments (Doctor) / No (Receptionist)."*

- **High** — The scenario reference map at §2.4 end maps FRs to SCs, but the mapping is bidirectional-incomplete — SC-24 (doctor adds visit note) maps to no FR in the reference map; SC-37 (Doctor access denied to another doctor's patients) maps to FR-33 but is not in the reference map. An architect or story-writer cannot rely on the map as a complete cross-reference. *Fix:* Add SC-24 → FR-18, SC-37 → FR-33, SC-38 → FR-33, SC-39 → FR-34 to the scenario reference map.*

- **Medium** — The FR-44 access control table (§4.11) and the FR-33 RBAC table (§4.9) are the two authoritative access matrices. They cover different surfaces (reports vs. platform features) and are not cross-referenced. A UX designer building the nav menu needs both — there is no single place to find the full access model. *Fix:* Add a cross-reference note at FR-44: "See also FR-33 for platform-level access control."*

- **Medium** — Glossary defines "Reminder" as "Three types in MVP: confirmation, 24-hour, and 2-hour" but the body text of FR-21 through FR-25 also includes "cancellation acknowledgment" as a WhatsApp message and FR-24 applies SMS fallback to it — the Glossary entry is either incomplete or the cancellation acknowledgment is not a "Reminder" and should be named separately (§3 Glossary, §4.6) — *Fix:* Either update the Glossary: "Four automated message types: confirmation, 24-hour reminder, 2-hour reminder, cancellation acknowledgment" — or keep the Glossary as-is and ensure the body text consistently does not call the cancellation acknowledgment a "Reminder."*

- **Medium** — FR-13 says "Changes take effect for Slots on the next calendar day; existing confirmed Appointments are not affected" — but SC-21 (reschedule) and FR-12 (reschedule) both imply Receptionists can immediately pick new slots. There is a latent ambiguity: if a Clinic Owner changes slot duration mid-day, do existing unconfirmed (available) slots regenerate intra-day or only overnight? (§4.4 / FR-13) — *Fix:* Clarify: "Changes to slot duration or working hours generate new slots from the next calendar day; intra-day slot structure is frozen at day-start and does not regenerate mid-day."*

- **Low** — Glossary is used consistently throughout. Core terms (Appointment, Slot, Token, Tenant, Patient) appear verbatim in FRs and scenarios with no synonym drift detected.

---

## 7. Shape fit — adequate

### Findings

- **High** — The PRD has no section or FR addressing the clinic's initial WhatsApp number configuration end-to-end as a user-facing product flow — SC-33 step 6 references a "guided" Meta Business Manager setup, and FR-36 lists "connecting their WhatsApp Business number" as a wizard step, but there are no testable consequences for this step in FR-36 (§4.10 / FR-36) — For an Indian clinic owner with no technical background, Meta Business Manager is the single highest-risk drop-off point in onboarding. The addendum §A1 documents the API decision, but there is no FR specifying: what does the user see if Meta verification fails? What is the in-product state while verification is pending? *Fix:* Add FR-36 consequences: "If the Clinic Owner exits the WhatsApp setup step before completion, the platform remains active in 'WhatsApp pending' state (SC-34). The wizard displays the current Meta verification step (number registered / template submitted / verified) as a progress indicator. If Meta registration fails, the system displays the specific failure reason from the Meta API response and a 'retry' action."*

- **High** — The PRD targets Indian independent clinic owners but has no FR or scenario for multi-language patient input — the WhatsApp Booking Flow collects patient name via free-text (FR-3 / SC-1 step 3), and SC-3 specifies rejection of numeric input — but there is no specified handling for Devanagari script or mixed-script names, which are common in Hindi-belt states (§4.1 / FR-3) — *Fix:* Add a consequence to FR-3: "Patient name field accepts Unicode characters including Devanagari script. The validation rejects input that contains only digits or special characters; it does not restrict to ASCII."*

- **Medium** — The product is WhatsApp-first for patients but the clinic staff portal is mobile-responsive web — yet no FR or NFR addresses the specific interaction model for a receptionist on a Redmi phone handling 40–60 appointments on a 5-inch screen (§10) — Persona Sunita (addendum §A6) is on a Redmi phone. The addendum notes "Primary device: Android phone (Redmi), sometimes a shared desktop." Yet no FR specifies minimum tap target size, no-scroll-required views, or offline degradation for the portal. NFR-2 covers the Web Booking Link (patient-facing) but not the staff portal load time. *Fix:* Add NFR-16: "Staff portal (Dashboard, Calendar, Patient search) initial load: < 3 seconds on 4G (Lighthouse mobile simulation, India network profile). All interactive elements (buttons, appointment rows) meet 44px minimum touch target size per WCAG 2.5.5."*

- **Medium** — Token number is described as "sequential integer per Clinic per day" (FR-5) — but in a multi-doctor clinic on the Growth or Pro plan, it is not specified whether Tokens are shared across doctors or per-doctor (§4.1 / FR-5, §3 Glossary) — SC-1 step 8 says "Token #4" without a doctor qualifier. SC-47 implies patients see a single queue across doctors. But a 3-doctor clinic where each doctor has independent schedules may need per-doctor tokens for queue management at reception. *Fix:* Add clarity to FR-5: "Token is a single sequential integer across all Doctors in the Clinic for a given day (not per-Doctor). A patient at a 3-doctor clinic receives Token #12 regardless of which Doctor they are seeing." If per-doctor is intended, state it explicitly.*

- **Low** — The WhatsApp Booking Flow interaction model (Quick Reply buttons, List Messages) is correctly specified for the Meta Cloud API's capabilities and is consistent with how Indian consumers actually use WhatsApp. No fix needed.

- **Low** — SMS fallback via MSG91 is appropriate for the Indian market where some patients may not have WhatsApp delivery (feature phones, deactivated accounts). The fallback content spec (plain-text, "Reply CANCEL to cancel") is realistic given SMS character limits. No fix needed.

---

## Mechanical notes

### Glossary drift findings

1. §4.6 feature description uses the term "BSP" ("managed by Cliniqly via the BSP") — but the Glossary defines "Meta Cloud API" as used "without a third-party BSP intermediary" and the addendum §A1 confirms no BSP is used. The word "BSP" appears incorrectly in §4.1 feature description ("automated conversation managed by Cliniqly via the BSP"). This is a copy error — it contradicts the explicit BSP decision documented in both §11 and addendum §A1. A story author could reasonably conclude there is a BSP in the loop. *Fix:* Replace "via the BSP" with "via Meta Cloud API directly."*

2. §3 Glossary defines "Reminder" as three types (confirmation, 24-hour, 2-hour). FR-24 SMS fallback applies to "cancellation acknowledgment (FR-6)" — the cancellation acknowledgment is treated operationally as a Reminder subtype but is not in the Glossary definition. Minor but will cause naming inconsistency in tickets.

3. "Walk-in" is defined in the Glossary as a Patient who arrives without a prior Appointment. SC-20 introduces "Walk-in (overflow)" as a booking source tag — this is a sub-variant not in the Glossary. Story writers building the analytics/booking-source filter will need to know "Walk-in (overflow)" is a distinct source value. *Fix:* Add to Glossary or to FR-11 consequences: "Walk-in registration that overrides a fully booked day is tagged with booking source 'Walk-in (overflow)' in analytics."*

### ID continuity findings

1. FR-6b is a sub-FR of FR-4's feature block (§4.1) using an alphabetic suffix. All other FRs use plain integers. This is the only sub-FR in the document and creates a sequence anomaly: FR-6, FR-6b, FR-7. The §6.1 scope list omits FR-6b (documented above as a Critical finding in Dimension 6). If additional sub-FRs are added elsewhere, the naming convention should be documented.

2. FR numbering is continuous from FR-1 through FR-45 with no gaps detected other than FR-6b. SC numbering is continuous from SC-1 through SC-50 with no gaps detected.

3. MON-1 through MON-3 use a different prefix namespace than FR items but are not listed in §6.1 In Scope. A story-creation author may overlook these as engineering requirements. *Recommendation:* Either promote MON items to FR-46 through FR-48 or add a "Plan enforcement" line item in §6.1 citing MON-1 through MON-3.*

### Assumptions Index roundtrip findings

1. SC-23 step 3 contains an inline `[ASSUMPTION]` tag: "No automated 'you missed your appointment' message in MVP — avoid patient friction; revisit in Phase 1." This assumption does not appear in §15 Assumptions Index. *Fix:* Add to §15: "§4.3 / SC-23 — No automated no-show notification sent to patient in MVP; revisit in Phase 1."*

2. SC-32 step 2 contains an inline `[ASSUMPTION]` tag: "Confirmations have higher priority than reminders when message budget is tight." This assumption does not appear in §15. *Fix:* Add to §15: "§9.2 / SC-32 — Within the WhatsApp message allowance, booking confirmations are prioritised over reminders when the monthly limit is reached."*

3. SC-37 step 3 contains an inline `[ASSUMPTION]` tag: "A patient who has visited both doctors is visible to both — shared patient access within the same Clinic." This assumption does not appear in §15. *Fix:* Add to §15: "§4.9 / SC-37 — Patient records are Clinic-scoped, not Doctor-scoped; a patient who has visited multiple doctors at the same Clinic is visible to all those doctors."*

4. SC-44 step 4 contains an inline `[ASSUMPTION]` tag with a question: "Full visit history shown in patient export regardless of doctor — confirm if only own-visit rows should appear." This is an unresolved design question embedded as an assumption. It is not in §15 and not in §14 Open Questions. *Fix:* Either resolve the question (the FR-39 consequence implies "Doctor can only export histories for patients who have had at least one Appointment with them" — the assumption in SC-44 that cross-doctor visits appear in a Doctor's export for shared patients contradicts this) and close it, or promote it to Open Question 6 in §14.*

---

*Review conducted against prd.md and addendum.md as of 2026-06-07. Findings are limited to blocking or high-impact issues; editorial nits are excluded.*
