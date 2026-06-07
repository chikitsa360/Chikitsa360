---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-Cliniqly-2026-06-07/prd.md
  - _bmad-output/planning-artifacts/prds/prd-Cliniqly-2026-06-07/addendum.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-designs/ux-Cliniqly-2026-06-07/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-Cliniqly-2026-06-07/EXPERIENCE.md
---

# Cliniqly - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Cliniqly (Chikitsa360), decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories organized by user value. Each epic has its own folder with individual story files containing full details including UX design references.

**Output structure:**
```
_bmad-output/planning-artifacts/epics/
  index.md                         ← master tracking (status of all epics + stories)
  epic-01-foundation/
    epic.md
    story-01-01-monorepo-setup.md
    story-01-02-...
  epic-02-auth/
    epic.md
    story-02-01-...
  ...
```

---

## Requirements Inventory

### Functional Requirements

```
FR-1:  Inbound WhatsApp message triggers booking flow within 3 seconds (p95). Flow initiates regardless of message content; resumes in-progress flow for same phone number; returns "fully booked" if plan limit reached.

FR-2:  Patient identity resolution — phone number checked against Clinic's tenant DB before presenting options. Returning patient: greet by name, skip registration. New patient: collect name/age/gender. Lookup scoped to Clinic's tenant only.

FR-3:  New patient registration via WhatsApp — name, age (Quick Reply ranges), gender (Quick Reply) collected before slot selection. Patient record created on flow completion only. Abandoned flow (30min) clears state; no partial record. Name accepts Unicode including Devanagari; digit-only or special-char-only input rejected with re-prompt; 3 failed attempts gracefully ends flow with clinic phone number.

FR-4:  Slot selection via WhatsApp List Message — up to 5 slots across current day + next 2 available days. Only `available` slots shown. Multi-doctor clinics label by doctor name. No slots today → auto-present next 2 days. Selected slot reserved for 5 minutes; released if flow doesn't complete.

FR-5:  Appointment confirmation and Token assignment — on slot selection: create appointment (status `confirmed`), assign sequential daily Token (scoped per Clinic per day, shared across doctors, resets midnight IST), send confirmation WhatsApp. Confirmation contains: patient name, doctor name, date, time, token number, clinic name + address. Appointment appears in calendar within 5 seconds. No double-booking: exactly one concurrent booking succeeds; other receives "Slot just taken" with alternatives.

FR-6:  Patient-initiated cancellation via WhatsApp — patient replies "CANCEL" (case-insensitive) to any automated appointment message. Cancellation acknowledgment sent within 3 seconds. Appointment status → `cancelled`. Slot → `available`. Calendar updates in real time.

FR-6b: WhatsApp conversation state durability — conversation state (step, collected fields, reserved slot) survives backend restart/pod failure. AOF-persisted Redis. Next message after restart resumes from last completed step. State scoped per patient phone + clinic; expires 30 minutes of inactivity.

FR-7:  Unique web booking URL per Clinic — `cliniqly.com/book/{clinic-slug}` active from signup day. Slug auto-generated from clinic name; customisable once by Clinic Owner. Page loads < 3s on 4G. No login required. Functional on iOS Safari 16+ and Android Chrome latest.

FR-8:  Slot browsing and booking via web — shows clinic name, available doctors, available slots for next 7 days. Real-time availability (slot taken between load and confirm → "Slot just taken" without losing entered details). Patient provides valid 10-digit Indian mobile number (no OTP at MVP).

FR-9:  Post-web-booking WhatsApp confirmation — confirmation sent using same `apt_confirmation` template as FR-5. WhatsApp failure → SMS fallback (MSG91) within 5 minutes. Appointment and patient record creation identical to FR-5/FR-3 logic.

FR-10: Receptionist creates manual appointment — logged-in Receptionist or Owner specifies patient (new/existing), doctor, slot. Existing phone number auto-fills name and shows visit history inline. New patient → create record (name + phone minimum). Appointment appears immediately in calendar. Token assigned with same daily sequential logic as FR-5.

FR-11: Walk-in registration — Receptionist enters name + phone, selects doctor, assigns next available slot or specific slot. Walk-in booking source recorded for analytics. "Walk-in (overflow)" source if overriding fully booked day. Override allowed with warning. WhatsApp confirmation sent after registration.

FR-12: Appointment modification and cancellation by staff — Receptionist or Owner can reschedule (changes slot, resends WhatsApp confirmation with new time) or cancel (status → `cancelled`, sends cancellation acknowledgment). All modifications logged with timestamp + acting staff member's role. Log accessible in Settings → Activity Log (read-only, cannot be edited or deleted).

FR-13: Working hours and slot configuration — Clinic Owner configures working days, start/end time, slot duration (15/20/30/60 min), per-doctor schedules in Clinic Settings. Changes take effect next calendar day; existing confirmed appointments unaffected. Intra-day slot structure frozen at day-start. Each doctor can have independent schedule. Lunch breaks and custom blocked periods per doctor per day. Slot availability in WhatsApp flow and Web Booking Link reflects config in real time.

FR-14: Day and week calendar view — day view: all appointments in chronological order with patient name, token, status. Week view: appointment density per day per doctor (count display). Tapping appointment opens detail panel inline. Calendar updates in real time when new appointments created.

FR-15: No double-booking enforcement — two concurrent bookings on same slot: exactly one succeeds, other receives "Slot just taken" with alternatives. Manual entry into booked slot shows warning + requires explicit confirmation to override.

FR-16: Slot blocking — Receptionist or Owner marks individual slots or time ranges as blocked (lunch, emergency, CME, personal). Blocked slots not shown in WhatsApp flow or Web Booking Link. Blocked slots visually distinct in calendar. Blocking can be single occurrence or recurring (daily/weekly).

FR-17: Patient profile — fields: name, mobile number, DOB (optional), gender (optional), reason for first visit (optional). Mobile number = unique identifier per patient within Clinic's tenant. Profile created via WhatsApp flow (FR-3) or manually by Receptionist (FR-10). All fields except name + mobile optional; completable later.

FR-18: Visit history — chronological list of all appointments at this clinic: date, doctor, status, visit note. Available from patient's first booking. All statuses appear (completed, cancelled, no-show). Read-only for Receptionists. Doctors and Owners can add plain-text visit note (500 chars max) to any `completed` appointment.

FR-19: Patient search — search by name (partial match, 3+ chars) or mobile number (last 4 digits or full). Results within 1 second for ≤ 5,000 patient records. Scoped strictly to logged-in staff's Clinic Tenant.

FR-20: Patient de-duplication — new booking using existing phone number matches existing patient record, not create new. Manual entry of duplicate phone by Receptionist surfaces existing patient with confirmation prompt.

FR-21: Booking confirmation message — sent within 30 seconds of appointment creation from any source. Message: patient name, doctor name, date, time, token, clinic name + address. Uses pre-approved `apt_confirmation` template. WhatsApp failure → SMS fallback (MSG91) within 5 minutes.

FR-22: 24-hour reminder — sent 24h before appointment time for all `confirmed` appointments. Includes "Cancel appointment" Quick Reply button. Tapping → FR-6 cancellation. Not sent if appointment booked < 24h before scheduled time. Not sent for `cancelled` or `no-show` appointments.

FR-23: 2-hour reminder — sent 2h before appointment time for all `confirmed` appointments. Includes "Reply CANCEL to cancel" instruction. Not sent if booked < 2h before scheduled time. Same non-send conditions as FR-22.

FR-24: SMS fallback — when WhatsApp message fails to deliver, retry via SMS (MSG91) within 5 minutes. Applies to: confirmation (FR-21), 24h reminder (FR-22), 2h reminder (FR-23), cancellation acknowledgment (FR-6). SMS = plain-text version of corresponding WhatsApp template. Failed delivery attempts logged against appointment.

FR-25: Clinic-level reminder toggle — Owner enables/disables each reminder type (24h, 2h) per Clinic in Settings. Default: both enabled on Clinic creation. Changes apply to future appointments only.

FR-26: Today's appointment summary on Dashboard — total today, completed count, no-show count, remaining count. All counts update in real time. "Remaining" = `confirmed` + future start time for today. No-show count increments on manual marking.

FR-27: Patient breakdown on Dashboard — today's new vs. returning patient count. "New" = patient's first-ever appointment at this Clinic. "Returning" = at least one prior appointment. Counts reset daily midnight IST.

FR-28: Daily revenue total on Dashboard — sum of consultation fees for appointments with payment status `paid` today. Updates in real time within 3 seconds of payment status change. Displayed in INR. Unpaid appointments shown as separate "pending collection" count.

FR-29: Upcoming appointments feed on Dashboard — next 5 upcoming appointments in chronological order. Each entry: Token, patient name, doctor name, time, booking source (WhatsApp/Web/Walk-in/Manual). Tapping navigates to full appointment detail. Feed updates in real time.

FR-30: Weekly summary view — Dashboard toggle showing: total appointments, completed, no-shows (count + %), total revenue for current week (Mon–Sun IST). Accessible via tab/toggle; does not replace daily default. Revenue aggregates only paid appointments.

FR-31: Record consultation fee and payment status — Receptionist or Owner records fee (INR) against any appointment, sets payment status `paid`/`unpaid`. No validation against price list. Default fee configurable per Doctor in Settings (auto-populates). Payment status toggleable at any time.

FR-32: Daily revenue aggregation — aggregates total paid fees for current day in real time. Updates within 3 seconds of payment status change. Dashboard FR-28 reflects only `paid` appointments.

FR-33: Role-based access control — three roles: Clinic Owner, Doctor, Receptionist.
  Capabilities:
  - All appointments (all doctors): Owner ✓ | Doctor own-only | Receptionist ✓
  - Patient database: Owner ✓ | Doctor own-patients-only | Receptionist ✓
  - Billing records + revenue: Owner ✓ | Doctor ✗ | Receptionist ✗
  - Clinic Settings: Owner ✓ | Doctor ✗ | Receptionist ✗
  - Invite/remove staff: Owner ✓ | Doctor ✗ | Receptionist ✗
  - Add visit notes: Owner ✓ | Doctor yes(own) | Receptionist ✗
  - View visit notes: Owner ✓ | Doctor yes(own appointments) | Receptionist ✗
  Restricted resource access → HTTP 403, no data exposed.

FR-34: Phone OTP login — all users log in via phone number + 6-digit OTP. OTP: 6 digits, valid 10 minutes, delivered via SMS (primary) or WhatsApp (SMS unavailable). Max 3 failed attempts → 15-minute lockout on that phone number. Sessions persist 30 days on trusted device; re-auth required on new/unrecognised device (trusted = valid HttpOnly session cookie, clearing cookies/different browser = new device).

FR-35: Staff invitation and management — Owner invites Doctors and Receptionists by phone number. Invitees receive WhatsApp setup link. Doctor count enforced per plan (Starter: 1, Growth: 3, Pro: 10); exceeding limit blocked with upgrade prompt. Invitations expire 7 days if not accepted. Removing staff immediately revokes session and access.

FR-36: Guided setup wizard — first-login 4-step wizard: (1) clinic details (name, address, speciality), (2) add at least one doctor, (3) configure working hours + slot duration, (4) connect WhatsApp Business number via Meta Cloud API. Each step independently saveable. Progress indicator. All wizard text in English and Hindi. Must accept ToS, Privacy Policy, DPA (DPDP) before completing — acceptance recorded with timestamp. Exit before Step 4 → 'WhatsApp pending' state (all features except WhatsApp booking + reminders); persistent banner with "Complete setup" link. Step 4 shows Meta verification status progress ("Number registered → Templates submitted → Verified"). Meta API errors displayed with Retry action.

FR-37: Sample appointment on signup — on wizard completion, system auto-creates one sample appointment. Visually labelled "Sample". No WhatsApp/SMS triggered. Owner can delete at any time.

FR-38: Daily Appointment Report — view and export list of all appointments for any selected date. Default: today; any past/future date selectable. Columns: Token, patient name, doctor name, time, booking source, status, fee amount, payment status. Filterable by doctor (Owner-only; Doctor sees own) and by status. Exportable as PDF (formatted, clinic name + date in header, A4 print-ready) and CSV. Doctor sees own appointments only. Receptionist sees report but fee + payment columns hidden.

FR-39: Patient Visit History Export — Doctor or Owner exports full visit history of any patient as PDF. Contains: patient name, phone, DOB (if captured), gender (if captured), chronological appointments (date, doctor, status, visit note). PDF header: clinic name + generation date. Doctor: own-patients only. Owner: any patient. Receptionist: no access. Export from patient profile page.

FR-40: Monthly Revenue Summary — Owner views and exports monthly revenue report. Default: current month; any past month selectable. Shows: daily revenue totals (bar chart on screen), total paid, total unpaid, total appointments, revenue per doctor. PDF (summary table + chart) and CSV (daily breakdown). Receptionist and Doctor cannot access.

FR-41: No-show and Attendance Report — Owner views and exports no-show/attendance report for selected date range. Selectors: Today / This Week / This Month / Custom. Shows: total appointments, completed, cancelled, no-show count, no-show rate (%), attendance rate (%). Breakdown by doctor (each doctor's individual rate). Breakdown by booking source (WhatsApp/Web/Walk-in/Manual). PDF and CSV. Doctor: own stats only. Receptionist: no access.

FR-42: Doctor-wise Appointment Report — Owner views and exports appointment + revenue summary per doctor for selected date range. Selectors: Today / This Week / This Month / Custom. Per doctor: total appointments, completed, cancelled, no-shows, revenue collected (paid), revenue pending (unpaid), average fee. Sortable by any column. PDF and CSV. Owner-only; Doctor and Receptionist cannot access.

FR-43: New vs Returning Patient Trend Report — Owner views and exports patient trend report. Selectors: This Week / This Month / Last 3 Months / Custom. On-screen: grouped bar chart (new vs returning per day/week). Summary: total unique patients seen, new count, returning count, return rate (%). PDF (chart + summary table) and CSV (date-wise rows). Owner-only.

FR-44: Report access control — enforced consistently across all report types. Restricted report access → HTTP 403. All report exports scoped to logged-in user's Clinic Tenant; no cross-clinic data.

FR-45: Date range selector and report filters — consistent date range selector across all reports: Today / This Week / This Month / Last 3 Months / Custom (date picker). Custom range limited to 12 months maximum. Selected filters persist within session. No-data period → clear empty state ("No data for this period"), not blank screen.

FR-45b: Long-running report fallback — if report query exceeds 8 seconds, queue for async generation ("Report is being generated — we'll notify you shortly"). When ready (within 2 minutes), send WhatsApp notification to Owner: "Your [Report Name] report is ready." Generated report accessible in "Recent Reports" list for 24 hours. Fallback applies to Custom ranges > 3 months only; standard presets must meet primary NFR without fallback.
```

---

### Non-Functional Requirements

```
NFR-1:  WhatsApp webhook processing (inbound message → outbound response): p95 < 3 seconds.

NFR-2:  Web Booking Link page load: < 3 seconds on 4G (Lighthouse mobile simulation, India network profile).

NFR-3:  Dashboard initial load: < 2 seconds for a Clinic with up to 500 appointments in the current month.

NFR-4:  Patient search results: < 1 second for a database of up to 5,000 patients.

NFR-5:  Platform availability: 99.5% monthly uptime during MVP (0–50 Clinics), measured by synthetic uptime checks on web portal and WhatsApp webhook endpoint. Planned maintenance windows excluded. Target 99.9% from Phase 1 (50+ Clinics).

NFR-6:  Planned maintenance windows communicated to Clinic Owners 48 hours in advance via WhatsApp; scheduled outside 8am–9pm IST.

NFR-7:  All data in transit encrypted with TLS 1.3 minimum.

NFR-8:  All Patient data at rest encrypted with AES-256.

NFR-9:  PostgreSQL Row-Level Security policies enforce strict Tenant isolation; no cross-Clinic data access possible at the database layer.

NFR-10: Staff phone OTP sessions expire after 30 days; re-authentication required on new or unrecognised device.

NFR-11: WhatsApp webhook payloads validated against Meta's HMAC-SHA256 signature on every inbound request before processing. Reject if timestamp > 5 minutes old.

NFR-12: Entire web portal — all labels, navigation, error messages, UI copy — available in both English and Hindi from MVP launch day. next-intl i18n infrastructure implemented from Week 1 of development.

NFR-13: All WhatsApp message templates (FR-21–FR-24) and Web Booking Link available in English and Hindi. Clinic Owner selects preferred language per Clinic in Settings. All communications use that language.

NFR-14: All dates and times displayed in IST (UTC+5:30); no timezone selection at MVP.

NFR-15: Web portal meets WCAG 2.1 AA for all interactive components.

NFR-16: Staff portal core features (calendar view, patient search, appointment creation) remain functional on 3G (< 1 Mbps). Initial load: < 3s on 4G; < 6s on 3G (Lighthouse slow-3G profile). All interactive elements: 44px minimum touch target size.

NFR-17: Web Booking Link page load: < 5 seconds on 3G connection (Lighthouse slow-3G simulation).

NFR-18: Deployments must not cause more than 60 seconds of service interruption per release. Planned downtime > 60 seconds requires NFR-6 advance notice.

NFR-19: RTO: < 4 hours from confirmed incident to platform restoration. RPO: < 1 hour maximum data loss. Supported by automated RDS point-in-time recovery and 6-hourly snapshots.

NFR-20: Disaster recovery drill conducted monthly to verify backup integrity and automated failover.

NFR-21: API rate limiting enforced per Clinic Tenant: maximum 100 requests/second per clinicId.

NFR-22: Patient-related files in cloud object storage accessible only via time-limited signed URLs (maximum 15-minute validity). No direct public URLs to patient files.

NFR-23: WhatsApp Booking Flow completable by a Patient with no prior instruction — no tutorial, no clinic staff involvement. Pilot test: new patient books without assistance.

NFR-24: All destructive actions in staff portal (appointment cancellation, patient record deletion, staff removal) require explicit confirmation step before execution.

NFR-25: All Cliniqly-to-Clinic communications use respectful, non-alarmist tone appropriate for medical professional audience. Prefer collaborative framing. Hindi variant uses conversational Hinglish, not formal Hindi.

Report-NFR-1: Report generation (screen render): < 3 seconds for date ranges ≤ 3 months; < 8 seconds for ranges ≤ 12 months.
Report-NFR-2: PDF generation: < 5 seconds for any report.
Report-NFR-3: CSV export: < 3 seconds for any report within 12-month cap.
```

---

### Additional Requirements (from Architecture + Compliance)

**Compliance Requirements:**
```
CR-1:  Explicit, informed Patient consent before any personal data collected. In WhatsApp flow: consent Quick Reply is first step for new patients before name/age/gender requested.

CR-2:  Data minimisation — data limited to minimum required for appointment booking. No patient data used for marketing without separate explicit consent.

CR-3:  Patients have right to erasure. Clinic Owner can permanently delete a patient record (all appointments + personal data) from Settings. Manual deletion by Owner sufficient for MVP.

CR-4:  All Patient data stored in AWS ap-south-1 (Mumbai) for India data residency (DPDP Act 2023).

CR-5:  Data breach affecting patient personal data logged internally within 24 hours.

CR-6:  Privacy Policy and Terms of Service accessible from signup page and Web Booking Link footer before any data is collected.

CR-7:  Grievance Officer named in Privacy Policy with 30-day response commitment.

CR-8:  NFR-7 through NFR-11 satisfy SPDI Rules 2011 reasonable security practice obligations.

CR-9:  All WhatsApp message templates (FR-21–FR-24) submitted and pre-approved via Meta's WhatsApp Manager before MVP pilot launch.

CR-10: No unsolicited marketing messages via WhatsApp. All messages transactional, triggered by patient-initiated action.

CR-11: Patient WhatsApp opt-out (reply "STOP") honoured within 1 hour; no further automated messages to opted-out numbers.

CR-12: Audit logs covering all staff access to patient records, appointment modifications, data exports, and Super Admin access retained for minimum 5 years in separate, immutable schema inaccessible to Clinic staff.

CR-13: Clinic Owners can request full export of all Clinic's patient data (patient profiles + appointment history) in CSV at any time — including during trial and within 30-day grace period after subscription cancellation.

CR-14: "HIPAA compliant" must not appear in any customer-facing materials. Cliniqly uses AWS HIPAA-eligible services for best practices only.
```

**Monetisation Constraints:**
```
MON-1: When Clinic reaches 90% of monthly appointment or WhatsApp message limit, Owner receives WhatsApp alert with upgrade prompt.

MON-2: Adding a Doctor beyond the plan's limit is blocked with an upgrade prompt.

MON-3: Trial expiry: Day 13 → WhatsApp message with 20% annual discount offer. Day 15 without conversion → soft paywall (read-only access; no new bookings via WhatsApp or Web Booking Link). Existing records remain accessible.

MON-4: Plans: Starter ₹999/month (1 Doctor, 500 appts/month, 200 WhatsApp messages), Growth ₹2,499/month (3 Doctors, unlimited appts, 1,000 WA messages), Pro ₹4,999/month (10 Doctors, 3,000 WA messages, analytics). 14-day free trial, no card required.
```

**Architecture Implementation Requirements:**
```
ARCH-1:  Install and configure Prisma ORM with PostgreSQL 16 (AWS RDS ap-south-1 / Neon for development). Implement multi-tenant schema provisioning (shared DB, separate schemas). Configure PostgreSQL RLS policies for tenant isolation. Set up `search_path` middleware for request-scoped schema switching.

ARCH-2:  Implement next-auth v5 with custom phone OTP Credentials provider. OTP via MSG91. Redis tracks failed OTP attempts (3 failures = 15-min lockout). Session payload: `{ clinicId, userId, role }`. HttpOnly session cookies (30-day). RBAC API middleware enforcing role + clinicId before any DB query.

ARCH-3:  Install and configure next-intl for bilingual (English + Hindi) support from Day 1. All messages in structured JSON files under `apps/web/messages/`. No UI component written without corresponding i18n key.

ARCH-4:  Configure Inngest as the serverless job runner (replaces BullMQ on Vercel Free Tier). Set up Inngest functions for: 24h/2h appointment reminders, async report generation (FR-45b), slot hold/release (5-min hold on slot reservation), WhatsApp webhook processing (async after 200 ACK). Implement at-least-once processing with idempotency keys (messageId, appointmentId+templateName).

ARCH-5:  Implement Pusher Channels for real-time updates (Vercel Free Tier compatible). Client-side `usePusherChannel()` hook interface designed to be swappable with Socket.io without component changes. Events carry no payload — only invalidation signals. Clients call React Query `invalidateQueries` on event receipt. 4-layer reliability: Push → Reconnect recovery (full cache invalidation) → 10s polling fallback → Optimistic UI.

ARCH-6:  Configure Upstash Redis for: WhatsApp conversation state (30-min TTL, AOF persistence, keyed by `{clinicId}:{patientPhone}`), Inngest job queue support, OTP attempt tracking, API rate limiting (Upstash Rate Limit).

ARCH-7:  Implement Zod schemas in `packages/core/src/schemas/` shared between server-side API validation and client-side react-hook-form resolvers. Single source of truth for all DTOs.

ARCH-8:  Set up Vitest + React Testing Library + Playwright testing infrastructure. Configure testcontainers-node for PostgreSQL + Redis in CI. Set up coverage reporting. Enforce test file conventions: `packages/*/src/**/__tests__/*.test.ts`, `apps/web/src/**/__tests__/*.test.ts`, `apps/web/e2e/**/*.spec.ts`.

ARCH-9:  Implement `SELECT ... FOR UPDATE SKIP LOCKED` on slot reservation for race condition prevention. 5-minute slot hold via Inngest delayed job that releases slot if confirmation not received.

ARCH-10: Implement immutable audit logging in separate `audit` PostgreSQL schema. Every staff action on patient data written synchronously before response. 5-year retention via RDS lifecycle policy.

ARCH-11: Configure CI/CD pipeline: unit + integration tests on every PR (Vitest with testcontainers); E2E tests on merge to `main` (Playwright); database migrations tested against fresh PostgreSQL container before any merge to `main`; coverage reports uploaded to Codecov.

ARCH-12: Implement API versioning at `/api/v1/` from Day 1. Response envelope: `{ data, error, meta }`. Error format: `{ error: { code, message, details? } }`. Security headers via Next.js config (CSP, HSTS, X-Frame-Options).

ARCH-13: Implement Meta WhatsApp Cloud API webhook handler: immediate 200 ACK to Meta (< 200ms) → enqueue Inngest job → async processing. HMAC-SHA256 + timestamp validation (reject > 5 minutes old). Retry: 3 attempts with exponential backoff. Dead-letter queue for permanently failed jobs.

ARCH-14: Configure Upstash Rate Limit: 100 req/s per clinicId API rate limiting. Signed S3 URLs (15-min TTL) for all patient files.

ARCH-15: Starter template note — project monorepo already initialised (Turborepo + pnpm, Next.js 15, Tailwind v4, `@chikitsa360/ui`, `@chikitsa360/branding`). Epic 1 Story 1 installs and configures the new stack layers (Prisma, next-auth v5, next-intl, Inngest, Pusher, Upstash Redis) on top of existing infrastructure.
```

---

### UX Design Requirements

```
UX-DR1:  Implement CSS custom properties (design tokens) for all color, typography, spacing, radius, and shadow values as specified in DESIGN.md. Tokens must be applied via CSS variables (e.g. `--color-primary`, `--radius-md`) so theme switching works at runtime without component re-renders.

UX-DR2:  Implement 5-layer theme priority stack: (1) Chikitsa360 brand defaults, (2) deployment-level client theme (NEXT_PUBLIC_CLIENT_ID), (3) clinic-level admin overrides (clinic branding settings), (4) user-level preset (Light/Dark/High Contrast), (5) user-level custom color overrides. Higher layers override lower.

UX-DR3:  Implement Light, Dark, and High Contrast theme presets. Theme toggle accessible from user menu. Preference persisted per user (localStorage + server-side session). Default: system preference (prefers-color-scheme).

UX-DR4:  Build `StatCard` component — displays icon, label, primary metric value (large), subvalue or delta indicator. Variants: default, warning (approaching limit), danger (at limit). Used on Dashboard for appointment counts, revenue, new/returning patient breakdown.

UX-DR5:  Build `DataTable` component — sortable columns (click header), server-side filtering, bulk action toolbar (appears on row selection), pagination controls, saved view support, export trigger button (PDF/CSV). Must remain readable with 500+ rows. Keyboard navigable.

UX-DR6:  Build `Alert` component — variants: info, success, warning, error. Dismissable (✕ button). Icon + title + description. Used for form errors, plan limit warnings, setup incomplete banner.

UX-DR7:  Build `Avatar` component — circular, initials fallback (first + last initial, color derived from name hash), 4 size variants (xs/sm/md/lg). Used in appointment cards, patient profile header, staff list.

UX-DR8:  Build `Divider` component — horizontal rule with optional label. Used in patient profile sections, settings pages.

UX-DR9:  Build `EmptyState` component — icon + headline + description + optional CTA button. Context-specific variants: no appointments today, no patients yet, no reports for period, no search results, WhatsApp not connected. Never shows a blank screen.

UX-DR10: Build `Input` component — label (top), helper text (below), error message state (red border + error text), prefix slot (icon), suffix slot (icon or button), character count when maxLength set. Keyboard navigable, WCAG 2.1 AA. Used in all forms.

UX-DR11: Build `Select` component — accessible dropdown, search filter for lists > 10 items, multi-select variant, keyboard navigable (↑↓ to navigate, Enter to select, Escape to close). Used for doctor selection, slot duration, plan selection.

UX-DR12: Build `Spinner` component — 3 sizes (sm/md/lg), brand-primary color. Used in loading states, button pending state.

UX-DR13: Build `StatusBadge` component — color-coded pill for appointment status: `confirmed` (blue), `completed` (green), `cancelled` (red), `no-show` (orange), `pending` (yellow). Also booking source badges: WhatsApp (green), Web (blue), Walk-in (purple), Manual (grey).

UX-DR14: Build `AppointmentBlock` component for calendar — displays: patient name (truncated), token number, appointment time, status color strip on left edge. Compact variant (week view) and expanded variant (day view detail). Clickable to open detail panel.

UX-DR15: Build `CommandPalette` component — activated by ⌘K (desktop) or search button (mobile). Global search across patients, appointments, doctors. Recent searches shown when empty. Keyboard navigable (↑↓, Enter, Escape). Results grouped by type (Patients, Appointments, Actions). Quick actions: "New Appointment", "Add Patient", "Walk-in", "Block Slot".

UX-DR16: Implement collapsible left sidebar navigation — desktop: 240px expanded (icon + label) → 64px collapsed (icon only); collapse triggered by toggle or narrow viewport. Mobile: hidden; bottom tab bar with 5 primary destinations (Dashboard, Appointments, Patients, Reports, Settings). Sidebar items: Dashboard, Appointments, Patients, Doctors, Billing, Reports, Settings. Active item highlighted with brand-primary background, left-edge accent bar.

UX-DR17: Implement global header — clinic name (truncated to 20 chars), quick action "+" button (opens quick action menu), notification bell (badge count for pending alerts), user avatar with dropdown (profile, language toggle, logout).

UX-DR18: Implement quick action menu — triggered by "+" button in header. Options: Add Patient, Book Appointment, Register Walk-in, Block Slot. Opens appropriate modal or page. Accessible via keyboard (Tab to open, ↑↓ to navigate, Enter to activate, Escape to close).

UX-DR19: Dashboard page design — 4-stat row (Today's Appointments, Completed, No-shows, Today's Revenue) using StatCard components. Upcoming Appointments feed (next 5, real-time). New vs Returning patient breakdown (today, small pie or count split). Weekly toggle (tab: Today / This Week). All data updates in real time via Pusher events → React Query invalidation. Responsive: 4-col → 2-col → 1-col (xl → md → sm).

UX-DR20: Calendar page design — primary surface: day view (time-slot grid, 15/20/30/60 min slots based on config, appointments as AppointmentBlock). Week view toggle (7-day density view, click day to expand to day view). Doctor filter dropdown. Drag-to-reschedule (desktop only; mobile: edit modal). Time slot click creates new appointment (opens booking wizard). Scroll-to-current-time on load. Today highlighted.

UX-DR21: Patient profile page — 6-tab layout: (1) Overview (personal info, demographics, emergency contact), (2) Appointments (chronological list, filterable by status, year), (3) Visit Notes (notes on completed appointments, doctor-only edit), (4) Documents (file uploads for lab results; MVP: upload only, no preview), (5) Billing (fee history, paid/unpaid status, per-appointment), (6) WhatsApp (full conversation thread view, opt-out status). Profile header: avatar, name, phone, last seen badge, patient ID.

UX-DR22: Appointment booking 3-step wizard modal — Step 1: Patient (search existing by name/phone, or "Add new patient" inline mini-form). Step 2: Slot (doctor picker, date picker, available time slot grid). Step 3: Confirm (summary card + confirm/cancel buttons). Progress indicator (3 dots or numbered steps). Keyboard navigable; Escape cancels with discard confirmation. On success: toast notification + calendar updates instantly (optimistic).

UX-DR23: Consultation/visit note editor — accessible on completed appointment detail panel. Plain text area (500 char limit with counter). Save button with optimistic update. Edit icon visible to Doctor and Owner roles only. Read-only rendered text for Receptionist. Autosave on blur.

UX-DR24: WhatsApp conversation panel — full thread view for a patient (Patient tab on patient profile). Messages displayed as chat bubbles (patient left, clinic right). Timestamps, delivery status indicator. Read-only (staff cannot send messages from portal in MVP; outbound is automated only). Opt-out status banner if patient has replied "STOP". Conversation history from all booking interactions.

UX-DR25: Multi-clinic switcher — clinic name dropdown in header. MVP: shows only current clinic (feature flag hidden). Phase 1: shows all clinics user has access to; switching updates entire app context. Design must accommodate future multi-clinic without redesign.

UX-DR26: Reports section design — 6 tabs (Daily Appointments, Patient Visit History, Monthly Revenue, No-show & Attendance, Doctor-wise, New vs Returning). Date range selector persists selected range within session. On-screen view: chart (bar/grouped bar) + summary table. PDF button and CSV button per report. "Recent Reports" sub-section for async generated reports (FR-45b). Loading skeleton while data fetches. Empty state when no data. Role-gated tabs hidden (not 403 page, just absent from tab list).

UX-DR27: Clinic Settings pages — sections: Clinic Profile (name, address, speciality, slug), Working Hours (per doctor, per day, break times), Doctors (list, invite, remove, default fee per doctor), Staff (Receptionist list, invite, remove), WhatsApp (Meta API connection status, template approval status, language setting), Notifications (enable/disable 24h/2h reminders), Data Export (download all patient data CSV, as per CR-13). Each section independently navigable (sidebar sub-nav). Changes saved immediately (no bulk-save pattern); success toast on save.

UX-DR28: Onboarding wizard — 4-step flow displayed as page-level experience (not modal) for first-time Owner. Step 1: Clinic details (name, address, speciality). Step 2: Add first doctor (name, phone, speciality, slot duration). Step 3: Working hours (day selector, start/end time, lunch break). Step 4: WhatsApp Business number connection (Meta API embed flow + status indicator). Progress bar top. "Save & Continue" per step; "Skip for now" available on Steps 3–4 only. Completion triggers sample appointment (FR-37) and navigates to Dashboard.

UX-DR29: Web Booking Link public page — mobile-first (360px min-width), no login required. Clinic header: name, speciality, address. Doctor selector (if multiple doctors). Date selector (3 days visible; scroll/swipe for more). Available time slots as button grid. Patient details form (name + 10-digit mobile, no OTP). Confirm button. Post-confirm: success screen with booking summary and "Add to WhatsApp contacts" CTA. No Cliniqly branding beyond subtle footer ("Powered by Cliniqly"); clinic branding prominent. Accessible: all slots keyboard reachable, form WCAG 2.1 AA.

UX-DR30: Keyboard navigation — all interactive components navigable via Tab (focus traversal), Enter/Space (activate), Escape (close/cancel), ↑↓ (list navigation in dropdowns, command palette, time slot selector). Focus order must match visual order. Skip-to-main-content link at top of each page.

UX-DR31: Focus ring styles — 2px solid outline, 2px offset, brand-primary color. Visible in all themes including dark and high-contrast. Never hidden via `outline: none` without custom visible focus alternative.

UX-DR32: Skeleton loaders — every data-fetching surface shows a skeleton loader matching the shape of the content: dashboard stat cards (grey rectangle placeholders), appointment list (row skeletons), patient profile tabs (tab skeleton + content block), reports (chart area skeleton + table rows). No spinner-only loading; layout shift minimised.

UX-DR33: WCAG 2.1 AA contrast — verify all text/background combinations meet 4.5:1 (normal text) and 3:1 (large text ≥ 18pt / UI components) across Light, Dark, and High Contrast themes. Automated contrast audit in CI (axe-core via Playwright).

UX-DR34: Touch targets — all interactive elements (buttons, links, form controls, calendar slots, tab items) meet 44×44px minimum on mobile viewports (360px–768px). Spacing between adjacent targets: minimum 8px.

UX-DR35: Drag-and-drop appointment rescheduling in calendar — desktop only (pointer: fine). Drag AppointmentBlock to new time slot; drop triggers reschedule confirmation modal ("Move this appointment to [new time]?"). Cancel drag: returns to original slot. Mobile: no drag; edit modal with slot picker instead. Visual drag feedback: original slot shows ghost, dragged item follows cursor.

UX-DR36: All UI copy (labels, button text, navigation items, error messages, empty state text, confirmation dialog text, toast messages, form placeholders, helper text) must have corresponding entries in both `en.json` and `hi.json` i18n files. No hardcoded user-facing strings in component files.

UX-DR37: Hindi copy uses conversational Hinglish — natural mix of Hindi and English medical/tech terms. Not formal Sanskrit-heavy Hindi. Examples: "Appointment book karein" not "नियुक्ति निर्धारित करें". All Hindi copy reviewed by a native Hinglish speaker before launch.

UX-DR38: Language toggle — accessible from: Clinic Settings (per-clinic default), and user avatar menu (personal override). Changing language updates portal immediately (next-intl locale switching) and saves preference. All patient-facing WhatsApp messages in same language as Clinic setting.

UX-DR39: Optimistic UI updates — appointment status changes (mark completed, cancel, mark no-show), payment status toggles, visit note saves all apply optimistically in UI before server confirms. On server error: roll back to previous state + show error toast. Loading indicator on the specific mutated row/element, not full-page spinner.

UX-DR40: Toast notification system — position: top-right (desktop), top-center (mobile). Auto-dismiss: 4 seconds for success/info; 8 seconds for error (with manual dismiss ✕). Stacked when multiple toasts present (max 3 visible; older auto-dismissed). Variants: success (green), error (red), warning (amber), info (blue). ARIA live region for screen readers.

UX-DR41: Confirmation modals for destructive actions — triggers: appointment cancellation, patient record deletion, staff removal, slot blocking (recurring), data export request, trial downgrade. Modal: clear title ("Cancel this appointment?"), consequence description ("The patient will receive a WhatsApp cancellation message"), confirm button (destructive/red), cancel button. Keyboard: Enter confirms, Escape cancels. Cannot be bypassed.

UX-DR42: Real-time counter animation on Dashboard — when Pusher event triggers React Query invalidation and stat card values change, animate the number transition (count-up/count-down) over 300ms. Subtle enough to not distract; present enough to signal "this is live data".

UX-DR43: Dashboard responsive layout — stat card grid: 4-column (xl: ≥1280px) → 2-column (md: 768–1279px) → 1-column (sm: <768px). Upcoming appointments feed: always full-width below stats. Weekly toggle tab: always visible.

UX-DR44: Calendar responsive layout — xl/lg (≥1024px): full 7-day week view available; day view as default. md (768–1023px): 3-day view; week view shows 3 columns. sm (<768px): day view only; date picker carousel for day navigation. Doctor filter: dropdown on all sizes.

UX-DR45: Patient profile responsive layout — lg+ (≥1024px): tab nav left sidebar + content right (side-by-side). md/sm (<1024px): tabs stacked at top, content below (full width). Profile header: avatar + name + key info row → stacks on mobile.

UX-DR46: Print stylesheet — daily appointment list (FR-38 screen view) has a `@media print` stylesheet. A4 portrait, 12pt body, black text on white, no sidebar/header/footer navigation, clinic name + date in print header, token + patient + doctor + time + status columns. "Print" button in report toolbar triggers `window.print()`.
```

---

### FR Coverage Map

| FR | Epic | Summary |
|---|---|---|
| FR-1 | Epic 1 (Epic 3) | WhatsApp inbound triggers booking flow |
| FR-2 | Epic 3 | Patient identity resolution |
| FR-3 | Epic 3 | New patient registration via WhatsApp |
| FR-4 | Epic 3 | Slot selection via List Message |
| FR-5 | Epic 3 | Appointment confirm + Token assignment |
| FR-6 | Epic 3 | Patient cancellation via WhatsApp |
| FR-6b | Epic 3 | Conversation state durability (Redis AOF) |
| FR-7 | Epic 4 | Unique web booking URL per Clinic |
| FR-8 | Epic 4 | Slot browsing + booking via web |
| FR-9 | Epic 4 | Post-web-booking WhatsApp confirmation |
| FR-10 | Epic 5 | Manual appointment creation |
| FR-11 | Epic 5 | Walk-in registration |
| FR-12 | Epic 5 | Appointment modification + cancellation by staff |
| FR-13 | Epic 2 | Working hours + slot configuration (setup wizard) |
| FR-14 | Epic 5 | Day and week calendar view |
| FR-15 | Epic 5 | No double-booking enforcement |
| FR-16 | Epic 5 | Slot blocking |
| FR-17 | Epic 6 | Patient profile |
| FR-18 | Epic 6 | Visit history |
| FR-19 | Epic 6 | Patient search |
| FR-20 | Epic 6 | Patient de-duplication |
| FR-21 | Epic 3 | Booking confirmation message (all sources) |
| FR-22 | Epic 7 | 24-hour reminder |
| FR-23 | Epic 7 | 2-hour reminder |
| FR-24 | Epic 7 | SMS fallback |
| FR-25 | Epic 7 | Clinic-level reminder toggle |
| FR-26 | Epic 8 | Today's appointment summary |
| FR-27 | Epic 8 | New vs. returning patient breakdown |
| FR-28 | Epic 8 | Daily revenue total |
| FR-29 | Epic 8 | Upcoming appointments feed |
| FR-30 | Epic 8 | Weekly summary view |
| FR-31 | Epic 9 | Record consultation fee + payment status |
| FR-32 | Epic 9 | Daily revenue aggregation |
| FR-33 | Epic 1 | Role-based access control |
| FR-34 | Epic 1 | Phone OTP login |
| FR-35 | Epic 1 | Staff invitation + management |
| FR-36 | Epic 2 | Guided setup wizard |
| FR-37 | Epic 2 | Sample appointment on signup |
| FR-38 | Epic 10 | Daily Appointment Report |
| FR-39 | Epic 10 | Patient Visit History Export |
| FR-40 | Epic 10 | Monthly Revenue Summary |
| FR-41 | Epic 10 | No-show and Attendance Report |
| FR-42 | Epic 10 | Doctor-wise Appointment Report |
| FR-43 | Epic 10 | New vs Returning Patient Trend Report |
| FR-44 | Epic 10 | Report access control |
| FR-45 | Epic 10 | Date range selector + report filters |
| FR-45b | Epic 10 | Long-running report async fallback |

---

## Epic List

### Epic 1: Platform Foundation & Clinic Authentication
Clinic Owners can sign up, log in with phone OTP, invite Doctors and Receptionists, and access a working portal with role-appropriate navigation and a consistent design system — all infrastructure wired and ready for every subsequent feature.

**FRs covered:** FR-33, FR-34, FR-35
**ARCH covered:** ARCH-1 through ARCH-15
**CRs covered:** CR-4, CR-5, CR-8, CR-12, CR-14
**UX-DRs covered:** UX-DR1, UX-DR2, UX-DR3, UX-DR6, UX-DR9, UX-DR10, UX-DR11, UX-DR12, UX-DR16, UX-DR17, UX-DR30, UX-DR31, UX-DR32, UX-DR36, UX-DR37, UX-DR38, UX-DR39, UX-DR40
**Status:** Not Started

---

### Epic 2: Clinic Onboarding & Setup
A new Clinic Owner completes the guided 4-step setup wizard — clinic profile, doctors, working hours, WhatsApp Business connection — in under 30 minutes, with the platform ready to accept its first booking.

**FRs covered:** FR-13, FR-36, FR-37
**CRs covered:** CR-6, CR-7
**UX-DRs covered:** UX-DR27 (Clinic Profile, Working Hours, Doctors, Staff, WhatsApp Settings sections), UX-DR28
**Status:** Not Started

---

### Epic 3: WhatsApp Appointment Booking
Patients send "Hi" to the clinic's WhatsApp number and receive a confirmed appointment with a token number in under 60 seconds — no app, no account, no staff action required; clinic calendar updates in real time.

**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-6b, FR-21
**CRs covered:** CR-1, CR-2, CR-9, CR-10
**UX-DRs covered:** (WhatsApp-side UX; portal real-time calendar update reflected in Epic 5)
**Status:** Not Started

---

### Epic 4: Web Booking Link
Every clinic has a shareable public URL patients can open on any phone browser to browse available slots and confirm a booking — no app, no account, WhatsApp confirmation sent automatically.

**FRs covered:** FR-7, FR-8, FR-9
**UX-DRs covered:** UX-DR29
**Status:** Not Started

---

### Epic 5: Appointment Management & Calendar
Receptionists manage every appointment — manual bookings, walk-ins in under 60 seconds, reschedules, cancellations, slot blocking — from a real-time calendar with day and week views and drag-to-reschedule on desktop.

**FRs covered:** FR-10, FR-11, FR-12, FR-14, FR-15, FR-16
**UX-DRs covered:** UX-DR7, UX-DR13, UX-DR14, UX-DR15, UX-DR18, UX-DR20, UX-DR22, UX-DR35, UX-DR41, UX-DR44
**Status:** Not Started

---

### Epic 6: Patient Database & Profiles
Staff find any patient's complete history in under 1 second by name or phone number, view all visits and notes across a 6-tab profile, and maintain a clean de-duplicated patient database.

**FRs covered:** FR-17, FR-18, FR-19, FR-20
**UX-DRs covered:** UX-DR21, UX-DR23, UX-DR33, UX-DR45
**Status:** Not Started

---

### Epic 7: WhatsApp Automation & Reminders
Patients automatically receive WhatsApp reminders 24 hours and 2 hours before their appointment — reducing no-shows with zero staff effort. Opt-outs ("STOP") are honoured within 1 hour. Staff see the full WhatsApp conversation history per patient.

**FRs covered:** FR-22, FR-23, FR-24, FR-25
**CRs covered:** CR-11
**UX-DRs covered:** UX-DR24, UX-DR27 (Notifications settings section)
**Status:** Not Started

---

### Epic 8: Clinic Dashboard
Clinic Owners and Receptionists see today's appointment counts, real-time revenue, new vs. returning breakdown, and the next 5 upcoming appointments — all updating live, with a weekly performance toggle.

**FRs covered:** FR-26, FR-27, FR-28, FR-29, FR-30
**UX-DRs covered:** UX-DR4, UX-DR8, UX-DR19, UX-DR34, UX-DR42, UX-DR43
**Status:** Not Started

---

### Epic 9: Basic Billing
Receptionists record consultation fees and mark appointments as paid or unpaid in two taps; Clinic Owners see today's real-time revenue total update on the dashboard within 3 seconds.

**FRs covered:** FR-31, FR-32
**Status:** Not Started

---

### Epic 10: Reports & Analytics
Clinic Owners analyse practice performance through 6 report types — daily appointments, revenue, no-shows, doctor-wise, patient trends, visit history — filtered by date range and downloaded as PDF or CSV; long-running reports are queued async with WhatsApp notification on completion.

**FRs covered:** FR-38, FR-39, FR-40, FR-41, FR-42, FR-43, FR-44, FR-45, FR-45b
**Report-NFRs covered:** Report-NFR-1, Report-NFR-2, Report-NFR-3
**UX-DRs covered:** UX-DR5, UX-DR26, UX-DR46
**Status:** Not Started

---

### Epic 11: Subscription Enforcement & Data Rights
Plan limits are transparently enforced with upgrade prompts; trial expiry triggers a graceful soft paywall; Clinic Owners export all patient data at any time; patients can be permanently erased on request.

**MON covered:** MON-1, MON-2, MON-3, MON-4
**CRs covered:** CR-3, CR-13
**UX-DRs covered:** UX-DR25, UX-DR27 (Data Export settings section)
**Status:** Not Started

<!-- Story files are created under:
     _bmad-output/planning-artifacts/epics/epic-NN-name/ -->

---

## Epic 1: Platform Foundation & Clinic Authentication

Clinic Owners can sign up, log in with phone OTP, invite Doctors and Receptionists, and access a working portal with role-appropriate navigation and a consistent design system — all infrastructure wired and ready for every subsequent feature.

**Full epic detail:** [epics/epic-01-foundation-and-auth/epic.md](epics/epic-01-foundation-and-auth/epic.md)

### Story 1.1: Core Stack Installation & Database Schema

As a developer,
I want the core stack installed and the initial database schema created with multi-tenant isolation,
So that all feature development has a working, secure foundation without infrastructure friction.

**Full story detail:** [epics/epic-01-foundation-and-auth/story-01-01-core-stack-and-database.md](epics/epic-01-foundation-and-auth/story-01-01-core-stack-and-database.md)

**Acceptance Criteria:**

**Given** the monorepo with existing Next.js 15 setup,
**When** `pnpm install` is run after adding new packages,
**Then** Prisma, next-auth v5, next-intl, Inngest, Pusher, Upstash Redis, MSW, testcontainers, and Zod are installed in the appropriate workspace packages with no peer-dependency errors.

**Given** Prisma is installed and configured,
**When** `prisma migrate deploy` runs against a fresh PostgreSQL 16 database,
**Then** the `public` schema contains: `clinics`, `users`, `sessions`, `otp_attempts`, `staff_invites` tables; the `audit` schema contains `audit_logs` (INSERT-only application privileges).

**Given** a new Clinic is provisioned,
**When** the signup handler runs,
**Then** a `clinic_{clinicId}` schema is created with all clinic-scoped tables (appointments, patients, doctors, slots, slot_blocks, visit_notes, billing_records, whatsapp_conversations, working_hours, notification_settings).

**Given** multiple clinics exist,
**When** a query runs for Clinic A with Clinic B's `search_path`,
**Then** PostgreSQL RLS returns 0 rows — verified by integration test with testcontainers PostgreSQL 16.

**Given** an authenticated API request arrives,
**When** Prisma middleware runs,
**Then** `SET search_path TO clinic_{clinicId}, public` executes before any query.

**Given** the API layer is configured,
**When** any route handler responds,
**Then** it uses the response envelope `{ data, error, meta }` under `/api/v1/`; security headers (CSP, HSTS, X-Frame-Options) are present on all responses.

**Given** Upstash Redis, Inngest, and Pusher are configured via env vars,
**When** each is invoked,
**Then** Redis commands succeed; Inngest functions appear in dev server; Pusher events deliver to subscribed clients within 2 seconds.

**Given** Upstash Rate Limit is configured at 100 req/s per clinicId,
**When** a clinicId exceeds 100 req/s,
**Then** subsequent requests return HTTP 429 with `Retry-After` header.

---

### Story 1.2: i18n Infrastructure & CI/CD Pipeline

As a developer,
I want a bilingual i18n system and an automated CI pipeline configured from Day 1,
So that all UI copy is translatable from the first commit and code quality is enforced automatically.

**Full story detail:** [epics/epic-01-foundation-and-auth/story-01-02-i18n-and-ci-pipeline.md](epics/epic-01-foundation-and-auth/story-01-02-i18n-and-ci-pipeline.md)

**Acceptance Criteria:**

**Given** next-intl is installed,
**When** any component renders user-facing text,
**Then** it uses `useTranslations()` or `getTranslations()` — no hardcoded strings in `.tsx` files; an ESLint rule flags violations.

**Given** `en.json` and `hi.json` exist with matching key structures,
**When** the user switches language to Hindi,
**Then** all portal labels, errors, button text, empty states, and toasts render in Hindi without page reload.

**Given** Hindi translations are written,
**When** reviewed,
**Then** all strings use conversational Hinglish (e.g. "Appointment book karein") — not formal Sanskrit-heavy Hindi.

**Given** all dates and times are displayed,
**When** any date/time value renders,
**Then** it shows in IST (UTC+5:30) via `formatIST()` from `packages/core/src/utils/date.ts`.

**Given** a pull request is opened,
**When** GitHub Actions CI runs,
**Then** all pass: TypeScript type-check (zero errors), ESLint (zero errors), Vitest unit tests, Prisma migration against fresh PostgreSQL 16 container (testcontainers), coverage report uploaded.

**Given** a commit is merged to `main`,
**When** CI runs the E2E stage,
**Then** Playwright tests execute headless against a production-built Next.js app.

**Given** `hi.json` is missing a key present in `en.json`,
**When** CI runs `pnpm check-translations`,
**Then** the step fails listing the missing keys.

---

### Story 1.3: Design System & Application Layout Shell

As a Clinic staff member,
I want a consistent application shell with sidebar, header, and design system,
So that I can orient myself and navigate the platform on any device or theme immediately after login.

**Full story detail:** [epics/epic-01-foundation-and-auth/story-01-03-design-system-and-layout.md](epics/epic-01-foundation-and-auth/story-01-03-design-system-and-layout.md)

**Acceptance Criteria:**

**Given** I am logged in on desktop (≥ 1024px),
**When** the portal loads,
**Then** a 240px collapsible sidebar shows: Dashboard, Appointments, Patients, Doctors, Billing, Reports, Settings; active item has brand-primary background + 4px left accent bar.

**Given** the portal loads on mobile (< 768px),
**When** the layout renders,
**Then** the sidebar is hidden; a 56px bottom tab bar shows 5 destinations (Dashboard, Appointments, Patients, Reports, Settings).

**Given** I click the sidebar collapse toggle,
**When** animation completes,
**Then** sidebar animates 240px → 64px in 200ms; labels disappear; icons remain; state persists in localStorage.

**Given** design tokens are applied in `tokens.css`,
**When** any themed element is inspected,
**Then** CSS custom properties are present: `--color-primary: 10 110 255`, `--color-teal: 0 184 169`, `--color-bg`, `--radius-md`, `--shadow-card`, etc.

**Given** I switch to Dark or High Contrast theme,
**When** the switch occurs,
**Then** all surfaces update in ≤ 100ms; preference persists; next cold load renders correctly without flash.

**Given** axe-core runs in Playwright CI,
**When** any theme is active,
**Then** zero contrast violations reported (4.5:1 normal text, 3:1 large/UI components).

**Given** any interactive element receives keyboard focus,
**When** focus ring renders,
**Then** 2px solid brand-primary outline with 2px offset is visible; no `outline: none` without custom visible alternative.

**Given** a page is fetching data,
**When** skeleton loader renders,
**Then** grey shimmer placeholders match content shape; CLS = 0 when replaced by real data.

**Given** an action produces an outcome,
**When** toast notification renders,
**Then** top-right (desktop) / top-center (mobile); success/info 4s auto-dismiss; error 8s; max 3 stacked; ARIA live region announces.

**Given** UI components are imported from `@chikitsa360/ui`,
**When** rendered,
**Then** `Alert`, `Avatar`, `EmptyState`, `Spinner`, `Input`, `Select` render correctly across all variants and are keyboard accessible.

---

### Story 1.4: Phone OTP Authentication

As a Clinic Owner or staff member,
I want to log in with my phone number and a 6-digit OTP,
So that I can securely access the platform without needing to remember a password.

**Full story detail:** [epics/epic-01-foundation-and-auth/story-01-04-phone-otp-auth.md](epics/epic-01-foundation-and-auth/story-01-04-phone-otp-auth.md)

**Acceptance Criteria:**

**Given** I visit `/login`,
**When** I enter a valid 10-digit mobile number and tap "Send OTP",
**Then** MSG91 sends a 6-digit OTP via SMS within 30 seconds; UI shows OTP entry screen with masked number.

**Given** the OTP entry screen is shown,
**When** I enter the correct code within 10 minutes,
**Then** I am authenticated; 30-day HttpOnly session cookie is set; redirected to `/onboarding` (new Owner) or `/dashboard` (returning user).

**Given** I enter 3 incorrect OTPs,
**When** the 3rd fails,
**Then** 15-minute lockout activates; further attempts return "Too many attempts. Try again in {N} minutes."; lockout stored in Redis with TTL.

**Given** I open the portal on a new device (no cookie),
**When** the middleware runs,
**Then** redirect to `/login`; existing device session unaffected.

**Given** session cookie reaches 30 days,
**When** the next request is made,
**Then** session expires; redirect to `/login`.

**Given** any protected `/api/v1/` endpoint is called without a valid session,
**When** middleware evaluates,
**Then** HTTP 401 returned; zero data exposed.

**Given** login page renders on mobile,
**When** inputs are shown,
**Then** phone input uses `inputmode="tel"`; OTP input uses `inputmode="numeric"` + `autocomplete="one-time-code"`; all inputs meet 44px touch targets.

---

### Story 1.5: Role-Based Access Control & Staff Management

As a Clinic Owner,
I want to invite Doctors and Receptionists by phone number and manage their access,
So that my team can log in with appropriate role-scoped permissions and I can revoke access instantly.

**Full story detail:** [epics/epic-01-foundation-and-auth/story-01-05-rbac-and-staff-management.md](epics/epic-01-foundation-and-auth/story-01-05-rbac-and-staff-management.md)

**Acceptance Criteria:**

**Given** I am Clinic Owner in Settings → Staff,
**When** the page renders,
**Then** all staff (name, phone, role badge, join date, status) are listed; "Invite Staff" button is present; each row has a "Remove" action.

**Given** I invite a Doctor by phone number,
**When** confirmed,
**Then** WhatsApp setup link sent; `StaffInvite` record created (status `pending`, expires 7 days); invitee appears as "Pending" in list.

**Given** the invitee accepts the link and completes OTP login,
**When** their account is linked,
**Then** `StaffInvite` updated to `accepted`; they access portal with assigned role immediately.

**Given** invitation is 7+ days old,
**When** invitee tries the link,
**Then** expired page shown; no account/session created.

**Given** I am on Starter plan with 1 Doctor,
**When** I try to invite another Doctor,
**Then** upgrade prompt shown; invite form Doctor option disabled; no `StaffInvite` record created.

**Given** I remove a staff member and confirm,
**When** removal executes,
**Then** all their active sessions revoked (Redis keys deleted); they get HTTP 401 on next request; historical appointment data preserved; staff list updates within 3 seconds.

**Given** I am a Doctor or Receptionist,
**When** I access Settings → Staff or `GET /api/v1/staff`,
**Then** page/section not in DOM; API returns HTTP 403.

**Given** a Doctor makes a `GET /api/v1/appointments` call,
**When** the API responds,
**Then** only their own appointments are returned — verified by integration test asserting cross-doctor data is absent.

**Given** any staff action on patient data occurs,
**When** the action completes,
**Then** audit log entry written synchronously to `audit.audit_logs` before response is sent.
