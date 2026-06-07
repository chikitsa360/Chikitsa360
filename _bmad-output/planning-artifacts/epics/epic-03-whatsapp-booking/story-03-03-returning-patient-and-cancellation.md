---
story: 3.3
epic: 3
title: Returning Patient Fast-Track & Patient Cancellation via WhatsApp
status: Not Started
created: 2026-06-07
requirements:
  functional: [FR-2, FR-6, FR-20]
  compliance: [CR-11]
  nfr: [NFR-1, NFR-13]
---

# Story 3.3: Returning Patient Fast-Track & Patient Cancellation via WhatsApp

## User Story

As a returning patient,
I want to be recognised when I WhatsApp the clinic again and be able to cancel appointments by replying CANCEL,
So that I can book without re-entering my details and manage my appointments directly from WhatsApp.

## Context

**FR-2: Patient identity resolution:**
- Inbound phone number is checked against `clinic_{clinicId}.patients` on every new conversation
- Returning patient = phone number matches an existing Patient record
- Returning patient flow: greet by first name + skip registration → go directly to slot selection

**FR-6: Patient-initiated cancellation:**
- Patient replies "CANCEL" (case-insensitive) to any automated appointment message
- Appointment status → `cancelled`; Slot → `available`; Cancellation acknowledgment sent within 3 seconds

**FR-20: Patient de-duplication:**
- Returning patient messages do NOT create a new Patient record — the existing record is matched and reused

**CR-11: Opt-out handling:**
- Patient replies "STOP" → opt-out recorded (`patients.whatsapp_opt_out_at`); no further automated messages

## Acceptance Criteria

**Given** a patient sends any message to the clinic WhatsApp and their phone number matches an existing Patient record in this Clinic's tenant,
**When** the fresh conversation handler runs,
**Then** the system greets by first name: "Welcome back, {first_name}! Book another appointment?" with Quick Reply buttons: "Yes, book now / No, thanks".
**And** the registration steps (name, age, gender) are completely skipped.
**And** the same Patient record is reused — no new Patient record is created.

**Given** the returning patient selects "Yes, book now",
**When** the booking flow continues,
**Then** the system queries and presents available slots immediately (same slot selection logic as FR-4/Story 3.2).
**And** the booking completes using the existing Patient record's `patient_id`.
**And** the Appointment is created with `patient_id` pointing to the existing Patient record (not a new one).

**Given** the returning patient selects "No, thanks",
**When** the response is processed,
**Then** the system sends: "No problem! Feel free to message us anytime to book. Take care!" (English) / "Koi baat nahi! Jab chahein appointment book karne ke liye message karein." (Hindi).
**And** conversation state is deleted from Redis.
**And** no appointment is created.

**Given** a patient who has an existing Patient record sends "Hi" but their name was never confirmed (e.g. created manually by a Receptionist),
**When** the identity check runs,
**Then** the system uses the name stored in the Patient record for the greeting — even if originally entered by staff.
**And** if the name field is empty (edge case), greeting uses: "Welcome back!" without a name.

**Given** a patient replies "CANCEL" (case-insensitive: "cancel", "Cancel", "CANCEL", "캔슬" — only exact English word match required) to any automated WhatsApp message from Cliniqly,
**When** the Inngest job processes the CANCEL message,
**Then** the system looks up the most recent `confirmed` Appointment for this patient at this Clinic with `start_time > NOW()`.
**And** if found: Appointment status is changed to `cancelled`; Slot status is changed to `available`; a cancellation acknowledgment WhatsApp message is sent within 3 seconds using the `apt_cancellation` template.
**And** if NOT found (no upcoming confirmed appointment): the system replies "We don't see any upcoming appointment to cancel. Did you mean to book a new appointment?" with a Quick Reply: "Yes, book / No".

**Given** a patient's Appointment is cancelled via WhatsApp CANCEL,
**When** the cancellation is processed,
**Then** a Pusher event `appointment.cancelled` is published to `private-clinic-{clinicId}`.
**And** the clinic portal calendar reflects the cancellation in real time (< 5 seconds).
**And** an audit log entry is written: `{ action: 'APPOINTMENT_CANCELLED_BY_PATIENT', resource_type: 'appointment', resource_id: appointmentId }`.

**Given** a patient replies "STOP" to any Cliniqly WhatsApp message,
**When** the opt-out is processed,
**Then** `patients.whatsapp_opt_out_at` is set to the current timestamp for this patient's record at this Clinic.
**And** no further automated WhatsApp messages are sent to this patient (confirmations, reminders, etc.).
**And** an opt-out acknowledgment is sent immediately (this is the last message sent): "You've been unsubscribed from appointment messages. To re-subscribe, reply START." — this acknowledgment is required by Meta's WhatsApp Business Policy.
**And** if the opted-out patient sends a new inbound message (e.g. "Hi"), no automated booking flow is initiated; the message is silently acknowledged with HTTP 200 but no reply is sent to the patient.

**Given** a Clinic has multiple Doctors and a returning patient had appointments only with Doctor A,
**When** the returning patient initiates a new booking,
**Then** the slot selection still shows available slots for ALL Doctors at the Clinic (not filtered to Doctor A) — slot selection is clinic-wide, not doctor-specific in the WhatsApp flow.

**Given** the same patient phone number is sent from a different WhatsApp account (SIM card in different phone),
**When** the identity check runs,
**Then** the system matches on phone number only — there is no device-level verification in the WhatsApp flow.
**And** the existing Patient record is reused as normal.

## UX Design Reference

**EXPERIENCE.md — WhatsApp Communication Panel (UX-DR24):**

This story's patient-side interactions are visible in the portal as a read-only conversation thread on the Patient profile → WhatsApp tab (built in Epic 7):
- Patient's "Hi" messages and "CANCEL" appear as patient bubbles (left-aligned, grey)
- Cliniqly's automated responses appear as clinic bubbles (right-aligned, brand-primary tint)
- Opt-out status shown as a banner: "Patient has opted out of WhatsApp messages on {date}"
- CANCEL message shown with a special indicator: "Cancellation processed ✓"

**EXPERIENCE.md — Key Flow: Returning Patient (paraphrased):**
1. "Hi" → Phone match found → "Welcome back, Rahul!" + Quick Reply
2. "Yes, book now" → Slots presented → Slot selected → Confirmation sent
3. Fast-track: entire flow completes in < 30 seconds (vs < 60s for new patient)

## File Locations

```
apps/web/
  src/
    lib/
      whatsapp/
        step-handlers/
          fresh-conversation.ts           ← Updated: handles both new + returning patient paths
          handle-returning-patient.ts     ← Returning patient: greeting + slot selection shortcut
          handle-cancellation.ts          ← CANCEL keyword handler
          handle-opt-out.ts               ← STOP keyword handler
        keyword-detector.ts               ← Detects CANCEL, STOP, START from any message text
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | CANCEL keyword detection (case-insensitive, with/without whitespace) | 100% |
| Unit | STOP keyword → opt-out processing | 100% |
| Unit | START keyword → opt-in re-enable | 100% |
| Unit | Returning patient: no new Patient record created | 100% |
| Integration (testcontainers) | CANCEL → appointment cancelled + slot available + Pusher event | 100% |
| Integration | CANCEL with no upcoming appointment → helpful reply, no error | 100% |
| Integration | STOP → opt-out_at set; subsequent "Hi" → no automated response | 100% |
| Integration | Returning patient "No, thanks" → no appointment created | 100% |
| Playwright (E2E) | Returning patient fast-track full flow | Core UJ path |

## Compliance Notes

- **CR-11:** Patient opt-out via "STOP" must be honoured within 1 hour — in practice, it's honoured on the very next message processing (Inngest async, typically < 30 seconds). The 1-hour SLA provides buffer for any retry/delay. Opt-out is permanent until the patient sends "START".
- **NFR-1:** All WhatsApp responses (returning patient greeting, slot list, CANCEL acknowledgment) must meet p95 < 3 seconds response time.
- **FR-20:** The returning patient flow is the primary de-duplication enforcement. If a Receptionist manually created a patient record with the same phone number that then books via WhatsApp, the same record is matched and no duplicate created.
