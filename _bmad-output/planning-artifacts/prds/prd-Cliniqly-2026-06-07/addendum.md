# Addendum — Cliniqly PRD
*Companion to prd.md. Captures technical-how, rejected alternatives, options matrices, and depth that belongs downstream (architecture, solution design) rather than in the PRD itself.*

---

## A1. WhatsApp API Strategy — Options Considered

**Decision:** Use Meta WhatsApp Cloud API directly from MVP. No BSP intermediary.

**Options evaluated:**

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| Direct Meta Cloud API | Full control; lowest per-conversation cost; green tick eligible from day one; no third-party dependency; official API parity | Requires Meta Business verification + number registration (5–7 days lead time); higher initial integration effort | **Selected — MVP and beyond** |
| BSP (Interakt/Wati) | Setup in days; managed template approval; lower initial engineering overhead | Per-conversation markup (~10–20% over Meta base rate); third-party dependency; less control over throughput and data | Not selected |
| Third-party aggregator (Gupshup, Kaleyra) | Large India presence; local support | Expensive; less direct API parity; adds another vendor layer | Not selected |

**Per-conversation cost estimate (direct Meta Cloud API):**
- Utility messages (confirmations, reminders): ~₹0.30–0.40/conversation (24-hour window)
- Marketing category (if applicable): ~₹0.50–0.58/conversation
- Per clinic on Starter plan: ~200 conversations/month = ₹60–80/month (lower than BSP path; well within plan margin)

**Green tick (Meta Business Verification):**
- Not required for the platform to function; Clinic's number shows without a verified badge initially
- Eligible to apply via Meta Business Manager immediately on registration
- Approval timeline: days to weeks depending on Meta review queue
- Not a launch blocker — listed as a post-launch enhancement goal

---

## A1b. WhatsApp → Portal Real-Time Sync — Mechanism

*Technical-how for FR-5, FR-6, FR-14, FR-6b. Belongs in solution architecture; captured here for downstream reference.*

**Three components:**

**1. Inbound message ingestion (Meta → Backend)**
- Meta Cloud API fires a webhook `POST` to Cliniqly's `/webhooks/whatsapp` endpoint on every inbound Patient message
- Backend validates the payload against Meta's HMAC-SHA256 signature (NFR-11) before processing
- No polling of WhatsApp; Meta pushes every event

**2. Conversation state management**
- Multi-turn booking flow state (current step, collected fields, reserved Slot, Clinic context) stored in Redis with 30-minute TTL per `{clinic_id}:{patient_phone}` key
- Redis AOF persistence ensures state survives pod restarts (FR-6b)
- On flow timeout (30 min inactivity), Redis key expires and reserved Slot is released

**3. Portal real-time updates (Backend → Dashboard)**
- On Appointment creation or status change, backend emits a WebSocket event via Socket.io to all authenticated sessions for that Clinic's Tenant
- Next.js portal subscribes to Socket.io on mount; updates calendar and dashboard counters client-side on event receipt
- Target: portal reflects new Appointment within 5 seconds of Patient confirmation (FR-5)
- Fallback: if WebSocket connection drops, portal falls back to a 10-second polling interval until reconnected

**Full flow:**
```
Patient "Hi" → Meta webhook → Backend → Redis (state) → WhatsApp reply
Patient selects slot → Meta webhook → Backend → PostgreSQL (Appointment) → Redis (state cleared) → Socket.io → Portal updates
```

---

## A2. Frontend Architecture Decision

**Decision:** Next.js 15 + React 19 + Tailwind v4 (existing monorepo) replaces the React 18 + Vite SPA described in the original technical architecture document.

**Rationale:**
- Codebase already built; no rewrite cost
- Next.js Server Components improve dashboard load performance vs SPA
- API Routes sufficient for MVP backend needs (replaces separate NestJS service at MVP scale)
- Multi-tenant branding system already implemented in `packages/branding/`
- Mobile-responsive web replaces React Native mobile app for MVP; native app deferred to Phase 1

**Arch doc sections superseded:** Sections 2.1 (Frontend), 2.2 (Mobile Application), 3.2 (Microservices) for MVP phase.

---

## A3. Backend Architecture — Modular Monolith vs Microservices

**Decision:** Modular monolith for MVP and Phase 1. Microservice extraction starts at Phase 2 (250+ clinics) based on real load data.

**Modules in monolith (maps to arch doc microservices):**
- auth, appointments, patients, notifications, billing, analytics, files, webhooks

**Trigger for extraction:** When any single module causes >20% of p95 latency degradation or requires independent scaling — measured at Phase 1 review.

---

## A4. Database Simplifications for MVP

**Full arch doc spec → MVP reality:**
| Component | Arch Doc | MVP Decision | Reason |
|---|---|---|---|
| Search | Elasticsearch 8 | PostgreSQL `tsvector` full-text | 10K records max at MVP; Postgres FTS sufficient |
| Time-series | TimescaleDB extension | Standard PostgreSQL tables + indexed timestamps | Analytics load trivial at MVP scale |
| Multi-tenancy | Shared DB, Separate Schema | Shared DB, Separate Schema (as specified) | Kept — correct choice |
| Mobile DB | WatermelonDB (SQLite) | N/A — no mobile app at MVP | Deferred to Phase 1 |

---

## A5. Compliance Deep-Dive

**DPDP Act 2023 (Digital Personal Data Protection Act) — Key obligations for Cliniqly:**
- Obtain explicit, informed consent before collecting patient personal data
- Purpose limitation: data collected for appointment booking cannot be used for marketing without separate consent
- Data Principal rights: patients can request erasure of their records
- Data Fiduciary obligations: Cliniqly (as platform) and Clinic Owner (as data fiduciary) — dual responsibility model
- Cross-border transfer: patient data must stay in India (AWS ap-south-1 Mumbai satisfies this)
- Breach notification: within 72 hours to Data Protection Board (once Board is constituted)

**IT Act 2000 + SPDI Rules 2011:**
- Reasonable security practices for "sensitive personal data" (health records qualify)
- Privacy policy and terms of service mandatory
- Grievance officer designation required

**Not in scope for MVP:** ABHA integration, insurance claim data, HL7 FHIR (these carry additional regulatory complexity — Phase 3).

---

## A6. Persona Depth — Clinic Receptionist

*Inline context lives in UJ-1/UJ-2 in the PRD. Extended persona here for UX/design reference.*

**Sunita, receptionist at a 2-doctor dental clinic in Pune**
- Age 26, completed 12th standard, 2 years at the clinic
- Manages 40–60 appointments/day across 2 dentists
- Currently uses 3 WhatsApp chats (personal phone), a paper register, and Google Sheets
- Spends ~2 hours/day on manual appointment entry and reminder calls
- Primary device: Android phone (Redmi), sometimes a shared desktop
- Pain: patients calling to ask "what time is my appointment?" — disrupts her during busy hours
- Fear about new software: "will I break something?" — needs forgiving, undo-able UI
- Success signal: she stops getting "what time?" calls within the first week

---

## A7. ROI Calculator — PRD Reference Data

*From business plan Section 6.5 — used in onboarding and sales, not a product feature for MVP.*

| Metric | Without Cliniqly | With Cliniqly |
|---|---|---|
| Daily appointments | 40 | 40 |
| No-show rate | 20% (8 patients/day) | 8% (3 patients/day) |
| Revenue per patient | ₹500 avg | ₹500 avg |
| Recovered revenue/month | — | ₹75,000 |
| Cliniqly cost (Growth) | — | ₹2,499/month |
| Net ROI | — | ₹72,500/month (29x) |

---

## A8. Billing — Razorpay Sub-Merchant Model

*From business plan Section 6.4. Relevant to MON-4 setup fee and future payment splitting.*

Cliniqly collects subscription payments from Clinics via Razorpay. The platform acts as the merchant of record. Razorpay Route (sub-merchant/split-payment) is the recommended mechanism for Phase 1 when multi-provider payouts (e.g. partner commissions, referral fee disbursements) are introduced. For MVP, a single merchant account suffices — no routing required.

---

## A9. Infrastructure Cost Target and Scaling Thresholds

*From architecture document Section 7.2.*

**MVP target:** AWS ap-south-1 (Mumbai) — estimated ₹15,000–25,000/month for 0–50 clinics.

**Trigger for Elasticsearch extraction (from A4):** When any Clinic's patient count exceeds 50,000 records or full-text search p95 latency exceeds 500 ms on the Postgres `tsvector` index. Measured at Phase 1 review.

**SLA external communication note (NFR-5):** The 99.5% uptime SLA is an internal engineering target for MVP. It is not a contractually committed SLA in customer agreements at MVP — contracts reference best-effort availability. Commit language upgrades to 99.9% contracted SLA at Phase 1 once infrastructure redundancy (multi-AZ, RDS failover) is confirmed stable.

