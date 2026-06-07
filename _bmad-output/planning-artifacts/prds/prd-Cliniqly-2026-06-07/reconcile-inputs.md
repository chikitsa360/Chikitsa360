# Input Reconciliation — Cliniqly PRD

*Checked against: `prd.md` + `addendum.md` (revision 2026-06-07)*
*Source 1: `docs/Cliniqly_Business_Plan.docx` (BP)*
*Source 2: `docs/Cliniqly_Technical_Architecture.docx` (TA)*

---

## Business Plan gaps

### BP-G1 — Revenue stream: one-time onboarding / setup fee
- **Source:** BP §2.1 lists a one-time setup fee of ₹2,000–5,000 (10% of revenue mix) as a distinct revenue stream. BP §2.2 states it is waived for annual plans.
- **PRD coverage:** PRD §9.1 mentions the setup fee in the table footnote ("Setup fee: ₹2,000–5,000 one-time (waived for annual plans)") but does not include it in the Monetisation requirements or plan enforcement FRs. There is no FR or MON requirement governing how the setup fee is collected, surfaced during trial-to-paid conversion, or applied at billing.
- **Recommendation:** Add to PRD §9 — either a MON-4 requirement covering setup fee applicability per plan and collection moment, or explicitly defer it ("collected offline / via support during MVP; automated billing is Phase 1"). Currently silently dropped.

### BP-G2 — WhatsApp add-on pack purchase flow
- **Source:** BP §2.2 specifies ₹499 per 1,000 additional WhatsApp messages as a self-serve add-on. BP §5.3 scaling channels imply this is self-serve.
- **PRD coverage:** PRD §9.1 footnote and SC-32 mention the top-up pack and upgrade prompt, but no FR or MON requirement specifies how a Clinic Owner purchases a top-up pack (in-product purchase, redirect to billing page, support ticket, etc.). SC-32 says "purchase a top-up pack" without defining the mechanism.
- **Recommendation:** Add to PRD §9 (or §6.2 Out of Scope with explicit deferral): clarify whether self-serve top-up purchase is in MVP scope or handled manually. If deferred, the SC-32 message text should direct the Clinic Owner to contact support rather than imply an in-product purchase.

### BP-G3 — Payment processing revenue via Razorpay sub-merchant
- **Source:** BP §2.1 lists 3% margin on payment processing via Razorpay sub-merchant as a revenue stream for Phase 1+.
- **PRD coverage:** Razorpay is correctly deferred to Phase 1 in §6.2. However, the sub-merchant model (where Cliniqly earns a margin on patient payments to clinics) is not mentioned as a rationale for the integration. This is a business model implication — if the Phase 1 Razorpay integration is built as a direct pass-through rather than a sub-merchant model, the revenue stream is lost. The architecture team needs to know this is not just a payment gateway integration.
- **Recommendation:** Add a note to §6.2 or addendum A7: "Razorpay integration in Phase 1 must be implemented as a sub-merchant model (Cliniqly earns processing margin) per the business plan — not a direct gateway pass-through." Affects Phase 1 architecture, not MVP PRD FRs.

### BP-G4 — Revenue projections and SOM targets as PRD success criteria
- **Source:** BP §2.3 defines Month 3 target: 10 paying clinics / ₹18,000 MRR; Month 6: 50 clinics / ₹1.1L MRR. BP §8 defines team scaling tied to clinic count milestones.
- **PRD coverage:** PRD §13 Success Metrics are product-behaviour metrics (booking completion rate, retention rate). The business plan's growth-stage milestones (number of paying clinics, MRR) are not referenced.
- **Recommendation:** Add to PRD §13 as business-level secondary metrics (SM-8, SM-9): "Month 3 milestone: 10 paying Clinics; Month 6 milestone: 50 paying Clinics" — gives the product metrics business context. Low priority; already covered in the business plan, but cross-referencing prevents misalignment.

### BP-G5 — Automated Google Review request
- **Source:** BP §4.1 explicitly lists "Automated Google Review requests — directly addresses clinic growth pain" as one of Cliniqly's unfair advantages. BP §5.1 Phase 1 GTM does not call it MVP but the Competitive Analysis section frames it as a core differentiator.
- **PRD coverage:** PRD §6.2 defers Google Review automation to Phase 1. PRD §14 Open Question 4 flags the tension explicitly and asks for confirmation. This is correctly surface as an open question, not silently dropped.
- **Status:** Adequately handled as an open question. No additional gap; owner action needed on Open Question 4.

### BP-G6 — IMA / medical association partnership and referral program as GTM requirements
- **Source:** BP §5.2 details IMA partnership (vendor partner access to 3.5L doctor members), CME event sponsorship, and a "Cliniqly Champions" WhatsApp referral group. BP §7.2 funnel specifies that 60% of demos should start a trial and 40% of trials should convert to paid.
- **PRD coverage:** The PRD does not include any referral program feature (e.g., tracking referred-clinic links, awarding 1 free month for referrals) or partnership voucher codes. These are operational, but the "1 month free for referral" mechanic requires a product feature (coupon/promo code system or referral attribution tracking).
- **Recommendation:** Add to PRD §6.2 as an explicit deferral: "Referral program tracking and promo/coupon code application — Phase 1." If referral attribution is expected to be manual during MVP, state that explicitly to avoid engineering assuming it is in scope.

### BP-G7 — Funnel conversion targets embedded in the business plan
- **Source:** BP §7.2 defines specific conversion rate targets per funnel stage (40% view demo video, 20% agree to demo, 60% start trial, 40% trial-to-paid, 85% year-1 retention).
- **PRD coverage:** PRD SM-2 (trial-to-paid > 40%) and SM-3 (Day-30 retention > 85%) match the business plan targets for conversion and retention. Other funnel stages (awareness → interest → consideration) are not product metrics, so their absence from the PRD is appropriate. No gap.
- **Status:** Covered for product-observable stages.

### BP-G8 — Churn target < 8% annual and LTV:CAC ratio as north-star metrics
- **Source:** BP §2.4 sets churn target < 8% annual, LTV:CAC 14:1–22:1, payback period 3–5 months. These are cited as the primary SaaS health metrics.
- **PRD coverage:** PRD §13 does not include annual churn as a metric. Day-30 retention (SM-3) is a proxy but is not the same as annual churn.
- **Recommendation:** Add SM-8: "Annual churn target < 8% — tracked from Month 6 onwards." Low priority for MVP PRD but worth including to align the product team on the business plan's north-star.

### BP-G9 — Hindi-language sales collateral and onboarding (Hinglish tone)
- **Source:** BP §6 (Sales Playbook) is extensively written in Hinglish ("Doctor saab, aapke clinic mein..."). The entire sales and objection-handling script is in a specific, casual, trust-building tone. BP §7.3 Onboarding Flow specifies "WhatsApp message: 'Welcome! Here is your 5-min setup guide'" and "WhatsApp check-in from Customer Success: 'Kuch dikkat? Setup ho gayi?'"
- **PRD coverage:** PRD NFR-12 and NFR-13 specify bilingual English/Hindi for the portal and WhatsApp templates. However, the business plan implies Cliniqly's own communications to Clinic Owners (onboarding WhatsApps, trial expiry messages, upgrade prompts) should also use the same warm, Hinglish, doctor-respectful tone — not just be translated into formal Hindi.
- **Recommendation:** Add to PRD §4.10 (Clinic Onboarding) or a UX tone note: "Cliniqly-to-Clinic communications (onboarding WhatsApp messages, upgrade prompts, trial expiry alerts) must use the same conversational, doctor-respectful tone defined in the business plan sales playbook. The Hindi variant should be Hinglish, not formal Hindi." This is a qualitative brand/UX constraint not currently captured in any FR or NFR.

### BP-G10 — 14-day free trial mechanics: Day 7 health check
- **Source:** BP §7.3 Onboarding Flow specifies a "Day 7 review call — did they get their first WhatsApp booking? If not, fix it." This implies a product signal (has the Clinic received at least one real WhatsApp booking by Day 7) should be tracked and trigger a Customer Success action.
- **PRD coverage:** PRD SC-40 and MON-3 cover trial expiry (Day 13 alert, Day 15 soft paywall). There is no product requirement for a Day 7 milestone signal or internal alert to CS.
- **Recommendation:** Add to PRD §9.2 or §4.10: "MON-4: If a trial Clinic has not received at least one confirmed WhatsApp Appointment by Day 7, the system generates an internal alert for Customer Success review." This is an operational metric that requires a product feature (CS dashboard or internal notification). If CS is manual at MVP, explicitly state that.

### BP-G11 — Clinic health score for retention
- **Source:** BP §7.4 specifies: "Monthly: Automated clinic health score — clinics below 50% feature usage get a check-in call."
- **PRD coverage:** No FR or NFR references a clinic health score, feature usage tracking, or internal CS-facing analytics. This is absent.
- **Recommendation:** Add to §6.2 Out of Scope with explicit deferral: "Automated clinic health score and CS-facing usage dashboard — Phase 1." If any feature-usage tracking infrastructure is needed (e.g., logging which features each Clinic has used), note it as an implementation consideration in the addendum even if the health score UI is deferred.

### BP-G12 — Win-back: cancellation recovery flow
- **Source:** BP §7.4: "If a clinic cancels, send a 'What went wrong?' WhatsApp — offer 1 month free to return."
- **PRD coverage:** Not mentioned in PRD or addendum.
- **Recommendation:** Add to §6.2 Out of Scope: "Automated win-back flow for cancelled Clinic accounts — Phase 1." Currently completely absent; a reader could assume it is not planned.

---

## Architecture doc gaps

### TA-G1 — Mobile application (React Native) listed in arch doc MVP scope
- **Source:** TA §8.1 MVP Scope table lists "Web Portal: React web app for clinic staff (mobile responsive)" but TA §2.2 documents a full React Native mobile app as part of the planned stack. TA §9.2 Development Timeline assumes a React Native developer on the MVP team.
- **PRD coverage:** PRD §5 Non-Goals explicitly states "Not a native mobile app. iOS and Android apps are Phase 1." PRD §10 states mobile-responsive web covers MVP. Addendum A2 explains the decision. This is correctly handled; the PRD supersedes the arch doc on this point and the addendum explains why.
- **Status:** Covered and explained in addendum A2. No gap.

### TA-G2 — Offline resilience (2G/3G) as a design principle
- **Source:** TA §1.1 Core Design Principles: "Offline Resilience — key features work on low connectivity (2G/3G)."
- **PRD coverage:** PRD §10 Platform states: "Core features (calendar, patient lookup, appointment creation) degrade gracefully on 3G. WhatsApp automation operates server-side." NFR-2 specifies web booking page load < 3 seconds on 4G but does not address 3G or 2G. There is no NFR for graceful degradation on 2G, no definition of which features are "core" for offline/low-bandwidth purposes, and no performance budget on 3G.
- **Recommendation:** Add NFR-16: "Core clinic portal features — calendar view, patient search, appointment creation — must remain functional on a 3G connection (throughput < 1 Mbps). WhatsApp Booking Flow and Reminder dispatch are server-side and do not require clinic-device connectivity." Add NFR-17 or expand NFR-2: "Web Booking Link page load must be < 5 seconds on a 3G connection (simulated via Lighthouse slow 3G profile)." This matches the India market reality for Tier 2/3 city clinics.

### TA-G3 — Zero-downtime deployments as an architecture requirement
- **Source:** TA §1.1: "Zero-Downtime Deployments — blue/green deployments, 99.9% uptime SLA."
- **PRD coverage:** PRD NFR-5 sets availability at 99.5% for MVP (0–50 Clinics). NFR-6 requires 48-hour advance notice for maintenance windows. Neither NFR mentions zero-downtime deployments or blue/green strategy as a requirement. The 99.5% SLA is weaker than the 99.9% stated in the arch doc.
- **Recommendation:** Add to PRD NFR-5 or a new NFR-18: "Deployments must not cause more than 60 seconds of downtime per release (rolling or blue/green deployment strategy required). Planned downtime beyond this threshold must follow NFR-6 advance notice procedure." This is a meaningful constraint for a clinic management tool where mid-day downtime directly disrupts patient bookings.

### TA-G4 — Rate limiting per clinic (100 req/sec)
- **Source:** TA §3.3: "AWS API Gateway handles routing, rate limiting (100 req/sec per clinic), and SSL termination."
- **PRD coverage:** No NFR mentions rate limiting. This is a security and fairness control that should be in the PRD as an NFR so that engineering does not treat it as optional.
- **Recommendation:** Add NFR-19: "API rate limiting is enforced per Clinic Tenant. The system must prevent any single Clinic from exceeding a configurable request threshold (target: 100 requests/second) to protect platform availability for all Tenants."

### TA-G5 — S3 signed URL expiry for patient documents (15-minute expiry)
- **Source:** TA §6.1: "S3 bucket policies — clinic files accessible only via signed URLs (15-min expiry)."
- **PRD coverage:** PRD NFR-7 through NFR-11 cover encryption and TLS but do not mention signed URL access controls for uploaded files. In MVP scope there is basic file upload (visit notes reference "uploaded reports" in FR-18 and the arch doc lists file service). The 15-minute signed URL constraint is a security requirement that belongs in the PRD.
- **Recommendation:** Add NFR-20: "Any patient-related file stored in cloud object storage (uploaded lab reports, future prescriptions) is accessible only via time-limited signed URLs (maximum 15-minute validity). Direct public URLs to patient files are not permitted."

### TA-G6 — Audit log retention for 5 years
- **Source:** TA §6.3: "Audit logs retained for minimum 5 years — clinic access, data changes, exports."
- **PRD coverage:** PRD CR-5 mentions breach notification. Compliance section §8 does not include an audit log retention requirement. This is a material compliance control.
- **Recommendation:** Add CR-9: "Audit logs covering all staff access to Patient records, Appointment modifications, and data exports are retained for a minimum of 5 years. Logs are immutable and stored in a separate schema/table inaccessible to Clinic staff." This is referenced in the arch doc as a HIPAA compliance requirement and affects database design.

### TA-G7 — Disaster recovery: RTO < 4 hours, RPO < 1 hour
- **Source:** TA §5.3: "RTO (Recovery Time Objective): < 4 hours | RPO (Recovery Point Objective): < 1 hour. Monthly DR drill — automated failover test to verify backup integrity."
- **PRD coverage:** PRD has no NFR for RTO, RPO, or DR drills. These are operational commitments that the PRD should capture as NFRs so that infrastructure and SLA commitments to Enterprise clients are grounded in documented requirements.
- **Recommendation:** Add NFR-21: "Recovery Time Objective (RTO): < 4 hours from confirmed incident to platform restoration. Recovery Point Objective (RPO): < 1 hour (maximum data loss on failure). These targets are supported by automated RDS snapshots and point-in-time recovery." Add NFR-22: "A disaster recovery drill is conducted monthly to verify backup integrity and failover procedure."

### TA-G8 — Elasticsearch / full-text patient search across records
- **Source:** TA §2.4 lists Elasticsearch 8 as the search engine for "full-text patient search across records." TA §3.2 lists a Patient Service using NestJS + Elasticsearch.
- **PRD coverage:** Addendum A4 correctly documents the MVP simplification: PostgreSQL `tsvector` full-text search replaces Elasticsearch at MVP (10K records max). PRD FR-19 specifies patient search by name (3+ character partial match) or mobile number within 1 second for up to 5,000 patients.
- **Status:** Covered and explained in addendum A4. No gap.

### TA-G9 — Biometric login for doctor (Expo LocalAuthentication)
- **Source:** TA §2.2 lists "Expo LocalAuthentication — Doctor login security" as a mobile app feature.
- **PRD coverage:** Since the mobile app is deferred to Phase 1, biometric login is implicitly deferred. PRD FR-34 covers phone OTP login for all roles. No explicit deferral note exists.
- **Recommendation:** Add to §6.2 Out of Scope: "Biometric authentication (Face ID / fingerprint) — Phase 1 with native mobile app." Minor; no functional gap since OTP covers MVP.

### TA-G10 — QR code patient check-in
- **Source:** TA §2.2 lists "Expo Camera + BarCodeScanner — QR code patient check-in" as a mobile app feature.
- **PRD coverage:** PRD FR-5 mentions "appointment ID and QR code link" in the booking confirmation (arch doc §4.2, step 6). However, the PRD does not define what the QR code links to or what happens when a receptionist scans it. The QR scanner is deferred with the mobile app, but the QR code generation on the confirmation message is referenced without being specified.
- **Recommendation:** Add a consequence to FR-5 or FR-21: "The confirmation message includes a link (QR code optional) that, when opened, displays the Appointment details for check-in reference. QR code scanning by clinic staff is Phase 1 with the native mobile app." Clarifies what the QR code in the confirmation is for in MVP.

### TA-G11 — PDPB / DPDP Act consent management and right to erasure flows
- **Source:** TA §6.3 lists "PDPB Alignment — data minimization, consent management, right to erasure flows" and "Clinic owner must provide consent agreement to patients during onboarding."
- **PRD coverage:** PRD CR-1 through CR-5 cover DPDP Act obligations including consent (CR-1), data minimisation (CR-2), and right to erasure (CR-3). The "Clinic owner must provide consent agreement to patients during onboarding" is reflected in CR-6 (Privacy Policy and T&C accessible at signup) but the specific flow of how the Clinic Owner's agreement is obtained during onboarding is not an explicit FR.
- **Recommendation:** Add a consequence to FR-36 (Guided Setup Wizard): "Before completing setup, the Clinic Owner must explicitly accept Cliniqly's Terms of Service, Privacy Policy, and a Data Processing Agreement (as a data fiduciary under DPDP Act 2023). Acceptance is recorded with timestamp." This is a compliance control, not just a UX step.

### TA-G12 — Super Admin role (Cliniqly staff access to all clinics)
- **Source:** TA §6.2 defines a Super Admin role: "All clinics — Cliniqly staff. SAML SSO + hardware MFA."
- **PRD coverage:** PRD FR-33 defines three roles: Clinic Owner, Doctor, Receptionist. There is no mention of a Super Admin / Cliniqly internal admin role with cross-tenant access. This is an internal operational requirement but must be defined in the PRD so it does not get architected ad-hoc.
- **Recommendation:** Add to FR-33 or a new FR (in §4.9 or §4.10): "A Cliniqly Super Admin role exists for internal Cliniqly staff with cross-Tenant read access for support and operations. Super Admin access requires SAML SSO with MFA. All Super Admin access to any Tenant's data is logged in the audit trail (CR-9)." Alternatively, explicitly defer: "Super Admin role design and access control — Phase 1; MVP support operations handled via direct database access with audit controls."

### TA-G13 — Infrastructure cost targets as NFRs
- **Source:** TA §5.2 defines MVP infrastructure cost target: ₹25,000–40,000/month for 0–50 clinics.
- **PRD coverage:** No NFR references infrastructure cost targets. While cost is an architecture concern rather than a product requirement, an explicit cost ceiling at MVP scale can prevent over-engineering decisions that inflate infra cost.
- **Recommendation:** Add to addendum (not PRD proper): "MVP infrastructure cost target: ₹25,000–40,000/month for 0–50 Clinics (per arch doc §5.2). Architecture decisions that would exceed this ceiling require explicit product/founder approval."

### TA-G14 — Architecture Section 8.1 MVP feature: Queue management / token display screen
- **Source:** TA §8.1 MVP Scope lists "Web Portal: React web app for clinic staff (mobile responsive)" but the arch doc §8.2 Phase 1 features lists "Queue management with token display screen (TV/tablet view)" — correctly in Phase 1. However, TA §8.1 is silent on this distinction and a reader could interpret the token system as requiring a physical display.
- **PRD coverage:** PRD FR-5 defines Token as a sequential integer in the confirmation message. There is no requirement for a TV/tablet token display screen. This is correctly absent from MVP.
- **Status:** No gap; the queue display screen is Phase 1 per both the arch doc and PRD. The arch doc's Phase 1 listing is clear.

### TA-G15 — Medicine reminders as a WhatsApp template (arch doc §4.3)
- **Source:** TA §4.3 lists `medicine_reminder` as a WhatsApp template: "Medication name + time + duration remaining — Configured schedule." This is in the WhatsApp Integration architecture section without a phase label.
- **PRD coverage:** PRD §6.2 Out of Scope lists "Automated follow-up and medication reminders — Phase 1" (implied by Phase 1 feature list parity with arch doc §8.2). The PRD does not explicitly list medication reminders in §6.2. The arch doc §8.2 Phase 1 features confirm "Automated follow-up and medication reminders" are Phase 1.
- **Recommendation:** Add explicitly to §6.2 Out of Scope: "Medication reminders via WhatsApp — Phase 1." The `medicine_reminder` template is documented in the arch doc's integration section without a phase label, which could cause engineering to pre-implement it.

### TA-G16 — Follow-up message template (post-visit)
- **Source:** TA §4.3 lists `follow_up` template: "Doctor's follow-up note + book again link — X days post visit." No phase label in the arch doc; it appears in the MVP WhatsApp Integration architecture section.
- **PRD coverage:** PRD §6.2 does not explicitly defer follow-up messages. The WhatsApp Automation section (§4.6) covers confirmation, 24hr reminder, 2hr reminder, cancellation, and SMS fallback — but no post-visit follow-up message.
- **Recommendation:** Add to §6.2 Out of Scope or add explicitly to FR-25 / §4.6: "Automated post-visit follow-up WhatsApp message — Phase 1." The arch doc places this template alongside MVP templates, creating ambiguity.

### TA-G17 — Google Business Profile integration listed in arch doc Phase 1 (not MVP)
- **Source:** TA §7 integration table lists Google Business Profile (Google My Business API) as Phase 1. TA §8.2 Phase 1 features confirms "Google Business Profile integration for appointment booking."
- **PRD coverage:** PRD §6.2 correctly defers Google Business Profile to Phase 1. PRD §11 integration table also lists it as Phase 1. Consistent and correct.
- **Status:** Covered. No gap.

---

## Conflicts (source doc says X, PRD says Y)

### CONF-1 — Frontend framework: arch doc says React 18 + Vite; PRD uses Next.js 15 + React 19
- **Arch doc (TA §2.1):** "React 18 + TypeScript, Vite build tool."
- **PRD (§10 + Addendum A2):** Next.js 15 + React 19 + Tailwind v4 on existing monorepo.
- **Resolution:** Addendum A2 explicitly documents this decision and its rationale. The PRD supersedes the arch doc on this point. Downstream engineering must use addendum A2 as the authoritative reference, not TA §2.1. No action needed in PRD; addendum A2 covers it.

### CONF-2 — Backend: arch doc says NestJS microservices; PRD says modular monolith for MVP
- **Arch doc (TA §3.2):** Lists 9 distinct NestJS microservices.
- **PRD (Addendum A3):** Modular monolith for MVP and Phase 1; microservice extraction at Phase 2.
- **Resolution:** Addendum A3 documents this explicitly. No conflict in PRD text; addendum resolves it. No action needed.

### CONF-3 — Availability SLA: arch doc says 99.9%; PRD says 99.5% for MVP
- **Arch doc (TA §1.1):** "Zero-Downtime Deployments — blue/green deployments, 99.9% uptime SLA."
- **PRD (NFR-5):** "99.5% monthly uptime during MVP (0–50 Clinics). Target 99.9% from Phase 1 (50+ Clinics)."
- **Resolution:** The PRD makes a conscious, explicit trade-off. However, the arch doc's 99.9% SLA figure may have been communicated to early clinic prospects. If the sales team is quoting 99.9% uptime based on the arch doc, this creates an external commitment mismatch. Recommend adding a note to NFR-5: "External communications to Clinic prospects must reference the 99.5% MVP SLA, not the 99.9% Phase 1 target."

### CONF-4 — Uptime SLA label: arch doc says "HIPAA-compliant"; PRD is more cautious
- **Arch doc (TA §6.3):** "HIPAA-eligible AWS services used throughout — exportable compliance report for enterprise clients."
- **PRD (§8):** Does not claim HIPAA compliance; references DPDP Act 2023, IT Act 2000, and SPDI Rules 2011. Addendum A5 covers DPDP obligations.
- **Resolution:** This is correct — Cliniqly should not claim HIPAA compliance in India (HIPAA is a US law). The PRD is right to omit it. The arch doc's HIPAA reference means AWS HIPAA-eligible services are used (a valid infrastructure choice) but this must not be communicated to Indian clinic owners as "HIPAA certified." Recommend a note in §8 or addendum A5: "AWS HIPAA-eligible services are used for infrastructure resilience and security best practices, not because HIPAA applies to Indian clinics. Do not use the term 'HIPAA compliant' in customer-facing materials."

### CONF-5 — Search: arch doc says Elasticsearch (MVP); PRD/addendum defers it to Phase 1+
- **Arch doc (TA §2.4):** Elasticsearch 8 listed as an MVP component.
- **PRD (Addendum A4):** PostgreSQL `tsvector` replaces Elasticsearch at MVP.
- **Resolution:** Addendum A4 documents this correctly with a rationale (10K records max, Postgres FTS sufficient). No gap in the PRD; the addendum is the authoritative reference. However, FR-19 specifies performance only up to 5,000 patients. The addendum should note the trigger for Elasticsearch adoption (patient record count threshold or query latency degradation).

---

## Qualitative ideas dropped by FR structure

### QUAL-1 — "10x cheaper, 10x simpler" positioning as a product design constraint
- **Source:** BP §4 Competitive Analysis: "Cliniqly Advantage: 10x cheaper, 10x simpler, WhatsApp-first." BP §6.4 Objection Handling frames the entire product as "₹33/day."
- **PRD capture:** The PRD's vision (§1) captures the "simpler" idea in narrative form but does not translate it into a UX design constraint. There is no NFR or design principle stating, for example, "the WhatsApp Booking Flow must require no training and no instruction from clinic staff to a new patient." The 60-second booking is FR-5/SC-1, but the broader UX simplicity imperative ("zero training needed" per BP §4.1) is not in any NFR.
- **Recommendation:** Add NFR-23 (or a Design Principles section): "The WhatsApp Booking Flow must be completable by a Patient with no prior instruction — no explainer text, no tutorial, no staff involvement. The first real-world test is: a pilot clinic owner can hand their phone to a patient who has never used Cliniqly and the patient books an appointment without assistance." This is the BP's "key metric" from Phase 1 GTM (§5.1).

### QUAL-2 — Receptionist's fear: "will I break something?" — forgiving, undo-able UI
- **Source:** Addendum A6 (persona for Sunita, receptionist) correctly captures this: "Fear about new software: 'will I break something?' — needs forgiving, undo-able UI." However, addendum A6 is labelled as UX/design reference and is not connected to any FR.
- **PRD capture:** No FR requires undo functionality, confirmation dialogs before destructive actions (cancellation, deletion), or error recovery flows for receptionists.
- **Recommendation:** Add to §4.3 (Manual Appointment Entry) or as a UX NFR: "All destructive actions (appointment cancellation, patient record deletion, staff removal) must require an explicit confirmation step and, where technically feasible, be reversible within a time window or logged for staff review. The UI must prevent accidental data loss in the hands of a non-technical receptionist."

### QUAL-3 — "ROI-positive in month 1" as a product promise, not just a sales claim
- **Source:** BP §4 positions Cliniqly against paper + WhatsApp status quo with "ROI-positive in month 1." BP §6.5 ROI Calculator shows 29x return. The business plan frames this as a product promise, not just a marketing claim.
- **PRD capture:** PRD SM-5 (no-show rate reduction > 25% at Day 30) partially captures this. However, there is no product feature that shows the Clinic Owner their own ROI (recovered revenue from no-show reduction) — the Dashboard only shows daily revenue collected, not "revenue saved" or "estimated no-shows prevented."
- **Recommendation:** Add to PRD §13 (Success Metrics) or as a deferred feature note: "A 'value summary' or 'ROI snapshot' widget on the Dashboard — showing estimated revenue recovered from no-show reduction — is a retention and upsell driver. Defer to Phase 1 but note as a priority feature." Alternatively, if the ROI calculator is positioned as a sales tool only (addendum A7 says so), add a clear note that the in-product value proof is deferred.

### QUAL-4 — Doctor-respectful, authority-aware tone in all system communications
- **Source:** BP §6.1 Elevator Pitch, §6.2 Sales Pitch, and §6.4 Objection Handling are all written with explicit deference to doctors ("Doctor saab," "Bilkul," addressing the doctor's authority concerns). The business plan is explicit that Indian doctors are cautious and authority-sensitive. This is a qualitative brand constraint.
- **PRD capture:** NFR-12 and NFR-13 specify English and Hindi language. No NFR or design note captures the tone/voice requirement for Cliniqly's own communications to Clinic Owners.
- **Recommendation:** Add a "Communication Tone" design principle (could live in a UX specification downstream, but should be anchored in the PRD): "All Cliniqly-to-Clinic-Owner communications — onboarding prompts, upgrade alerts, trial expiry messages, error states — must be written in a respectful, non-alarmist tone appropriate for a medical professional audience. Avoid imperative language; prefer collaborative framing ('You've reached your limit — here is how to continue' rather than 'Your account is blocked')." This is a meaningful constraint for copywriting and error message design.

### QUAL-5 — "Never lose patient history again" as a core product promise with data durability implications
- **Source:** BP §6.3 Demo Script (Minute 2:00–3:00): "Open patient profile — show history, last visit, notes. 'Never lose patient history again.'" This is explicitly the second most important demo moment after the 60-second booking.
- **PRD capture:** PRD FR-17 through FR-20 define patient profile and visit history. However, there is no NFR for patient data retention duration, data export (bulk patient export for Clinic Owner), or the promise that a Clinic can leave Cliniqly and take their data with them. The business plan's sales script implicitly promises data permanence.
- **Recommendation:** Add to §8 (Compliance) or §9 (Monetisation): "CR-10: Clinic Owners can request a full export of all their Clinic's Patient data (patient profiles and appointment history) in CSV/PDF format at any time. Data export is available even on trial or after subscription cancellation for a 30-day grace period." This addresses the "data hostage" concern mentioned in MON-3 and reinforces the "never lose patient history" promise. Currently MON-3 references "read-only access" to prevent data hostage perception but does not guarantee export.

---

*Total gaps by source:*
*Business Plan: 12 items (BP-G1 to BP-G12) — 3 recommended as PRD additions, 4 as §6.2 explicit deferrals, 3 as addendum notes, 2 already covered*
*Architecture doc: 17 items (TA-G1 to TA-G17) — 7 recommended as new NFRs or CR additions to PRD, 4 as §6.2 explicit deferrals, 3 already covered in addendum, 3 no action needed*
*Conflicts: 5 items (CONF-1 to CONF-5) — 2 already resolved in addendum, 3 require a clarifying note added to PRD or addendum*
*Qualitative gaps: 5 items (QUAL-1 to QUAL-5) — all recommended as NFRs or design principle additions*
