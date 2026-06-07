---
story: 3.2
epic: 3
title: New Patient WhatsApp Booking Flow
status: Not Started
created: 2026-06-07
requirements:
  functional: [FR-1, FR-2, FR-3, FR-4, FR-5]
  compliance: [CR-1, CR-2]
  nfr: [NFR-1, NFR-13, NFR-23]
  monetisation: [MON-1, MON-3]
---

# Story 3.2: New Patient WhatsApp Booking Flow

## User Story

As a new patient,
I want to book a clinic appointment by sending any message to the clinic's WhatsApp number,
So that I get a confirmed appointment with a token number in under 60 seconds without downloading an app or creating an account.

## Context

This is the core value proposition of Cliniqly. The full WhatsApp booking flow for a new patient:

```
Patient sends "Hi"
  → Consent message (Quick Reply: YES to continue)
  → Patient replies YES
  → "Please enter your name"
  → Patient enters name
  → Age Quick Reply (Under 18 / 18–35 / 36–55 / 56+)
  → Patient selects age
  → Gender Quick Reply (Male / Female / Other / Prefer not to say)
  → Patient selects gender
  → Available slots as List Message (up to 5 slots)
  → Patient selects slot
  → Appointment created → Confirmation message sent
  → Calendar updates in real time
```

**Realised scenario:** SC-1 (happy path), SC-2 (abandon), SC-3 (invalid input), SC-4 (no slots today), SC-5 (after hours booking).

**Key constraints:**
- p95 < 3 seconds for each response (NFR-1)
- No app download, no account creation required
- Flow completable without prior instruction (NFR-23)
- Bilingual (English + Hindi) per Clinic setting (NFR-13)

## Acceptance Criteria

**Given** a patient sends any message (text, emoji, image) to the Clinic's WhatsApp number,
**When** the Inngest job handler runs,
**Then** the system checks whether the inbound phone number matches an existing Patient record in this Clinic's tenant DB.
**And** if NO match → new patient flow begins (this story).
**And** if MATCH → returning patient flow (Story 3.3).
**And** if a WhatsApp Booking Flow is already in progress for this phone number, the existing flow resumes rather than restarting.
**And** the system responds within 3 seconds (p95) regardless of path taken.

**Given** it's a new patient and no active conversation state exists,
**When** the flow initiates,
**Then** the system sends a consent message via the Meta Cloud API:
- English: "Hi! I'm here to help you book an appointment at {Clinic Name}. Before we start, I'll need your name and age to create your record. Ready to continue? Please reply YES."
- Hindi: "Namaste! Main aapko {Clinic Name} mein appointment book karne mein madad karunga. Shuru karne se pehle, mujhe aapka naam aur umra chahiye. Kya aap tayaar hain? YES reply karein."
**And** a Quick Reply button "YES / हाँ" is included (WhatsApp interactive message).
**And** conversation state is written to Redis: `{ step: 'AWAITING_CONSENT', clinicId, patientPhone, consentGiven: false, language: clinicLanguage }`.

**Given** the patient replies "YES" (or "हाँ" or any affirmative),
**When** consent is received,
**Then** `consentGiven: true` is recorded in conversation state.
**And** the system sends: "Great! What is your name?" as a free-text prompt.
**And** conversation state updates to `step: 'AWAITING_NAME'`.

**Given** the patient sends their name,
**When** the name is validated,
**Then** the following are accepted: Unicode text including Devanagari, mixed Latin + Devanagari, accented Latin characters.
**And** the following are rejected with a re-prompt "Please enter your name (letters only).":
- Input containing only digits (e.g. "9876543210")
- Input containing only special characters (e.g. "!!!!")
- Input that is blank or whitespace only

**Given** the patient provides 3 consecutive invalid name inputs,
**When** the 3rd invalid attempt is detected,
**Then** the flow ends gracefully: "Having trouble? Please call us at {clinic phone number} to book your appointment. Have a great day!"
**And** no Patient record is created.
**And** conversation state is deleted from Redis.

**Given** the name is valid,
**When** name is captured (max 100 chars, trimmed),
**Then** conversation state updates: `{ step: 'AWAITING_AGE', collectedFields: { name: 'Rahul Kumar' } }`.
**And** the system sends age selection via WhatsApp Quick Reply buttons:
- "Under 18" / "18–35" / "36–55" / "56+"
- Message text: "Thanks, {name}! How old are you?" (English) / "Shukriya, {name}! Aapki umra kya hai?" (Hindi)

**Given** the patient taps an age Quick Reply,
**When** age range is received,
**Then** conversation state updates: `{ step: 'AWAITING_GENDER', collectedFields: { ..., ageRange: '18-35' } }`.
**And** the system sends gender selection via Quick Reply buttons: "Male / Female / Other / Prefer not to say".
**And** Message: "And your gender?" (English) / "Aur aapka gender?" (Hindi)

**Given** the patient selects a gender,
**When** gender is received,
**Then** conversation state updates: `{ step: 'AWAITING_SLOT', collectedFields: { ..., gender: 'Male' } }`.
**And** the system queries available slots:
- Status `available`, today and next 2 available working days, for all Doctors at this Clinic
- Maximum 5 slots shown in the List Message, sorted chronologically
- If Clinic has multiple doctors, each slot row shows: "Dr. {Name} — {Day} {Time}"
- If today has 0 available slots, automatically include next 2 days (no extra prompt)
- If no slots exist in next 7 days: "No appointments available right now. Please call us at {clinic phone}." → conversation ends

**Given** available slots are found,
**When** the List Message is constructed,
**Then** the message header: "Pick an appointment time:" (English) / "Appointment time chuniye:" (Hindi).
**And** the List button label: "See available times" / "Samay dekhein".
**And** each list item row: "{Day} {Time} — Dr. {Name}" (e.g. "Today 3:30 PM — Dr. Sharma").

**Given** the patient selects a slot from the List Message,
**When** the selection is received,
**Then** `SELECT ... FOR UPDATE SKIP LOCKED` is attempted on the selected slot row.
**And** if the slot is locked (concurrent booking in progress): "That slot was just taken. Here are the next available times:" → re-presents updated list.
**And** if the slot is available: slot status is updated to `reserved`; a 5-minute Inngest delayed job is scheduled to release the slot if the flow doesn't complete; `reservedSlotId` is stored in conversation state.

**Given** a slot is successfully reserved,
**When** the Appointment is created,
**Then** the following DB writes occur atomically (in a Prisma `$transaction`):
1. Patient record created in `clinic_{clinicId}.patients`: name, phone, age_range, gender, booking_source = 'whatsapp', created_at
2. Appointment record created: patient_id, doctor_id, slot_id, status = 'confirmed', booking_source = 'whatsapp', token_number = MAX(token_number for today at this clinic) + 1
3. Slot status updated to 'booked'
**And** the 5-minute slot-release Inngest job is cancelled (reservation succeeded).
**And** conversation state is deleted from Redis immediately.

**Given** the Clinic is in 'WhatsApp pending' state (no WhatsApp connected),
**When** an inbound message arrives,
**Then** the webhook receives it but the flow is NOT initiated — no response is sent to the patient.
**And** a log entry is written: "Inbound message received but clinic WhatsApp not configured — no response sent."

**Given** the Clinic is on a trial plan that expired (MON-3),
**When** the booking flow would initiate,
**Then** the system responds: "Online booking is temporarily unavailable. Please call us at {clinic phone} to book." and ends the flow.
**And** no appointment or patient record is created.

**Given** a patient messages the clinic outside configured working hours (e.g. 11 PM),
**When** the slot query runs,
**Then** the system includes slots for the next available working day: "We're currently closed. Our timings are {hours}. Here are our earliest available slots:" → presents slots for next working day.

## UX Design Reference

**EXPERIENCE.md — WhatsApp Booking Flow (from Key Flows section):**

The flow must feel like a natural conversation, not a form. Key principles:
- First message is always a consent acknowledgment (DPDP CR-1) — never jump straight to data collection
- Quick Reply buttons (max 3): used for consent, age ranges, gender
- List Messages: used for slot selection (up to 10 items supported by Meta, but show max 5)
- Free-text: used only for name input — minimise free-text steps to reduce friction
- Error re-prompts: friendly, not alarming — "Hmm, I didn't catch that. Could you try again?"
- Graceful exit after 3 failures: always provide the clinic's direct phone number as fallback

**WhatsApp message format constraints (Meta):**
- Quick Reply buttons: max 3 buttons, max 20 chars each
- List Message: max 10 sections, max 10 rows per section, header required
- Text messages: max 4096 characters
- Template messages: only for outbound initiated messages; session messages (replies within 24h window) can be free-form

**Language handling:**
- Determine language from: (1) Clinic's configured language (NFR-13), (2) fallback to English
- Per-patient language preference: Phase 1 feature — not in MVP
- Language is stored in conversation state so all steps of one flow use the same language

## File Locations

```
apps/web/
  src/
    lib/
      whatsapp/
        step-handlers/
          fresh-conversation.ts         ← Patient identity check → new vs returning
          handle-consent.ts             ← Consent message send + YES validation
          handle-name.ts                ← Name input validation + re-prompt logic
          handle-age.ts                 ← Age Quick Reply handler
          handle-gender.ts              ← Gender Quick Reply handler
          handle-slot-selection.ts      ← List Message builder + slot locking + appointment creation
        slot-availability.ts            ← Compute available slots from working_hours config
        message-sender.ts               ← Meta Cloud API message send wrapper (text, Quick Reply, List)
        templates.ts                    ← WhatsApp template builder (bilingual)
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | Name validation (Unicode, Devanagari, digits-only, special-chars-only, blank) | 100% |
| Unit | Slot availability computation (today no slots → next 2 days; after-hours; 7-day empty) | 100% |
| Unit | Token assignment (MAX + 1 per clinic per day; day rollover resets to 1) | 100% |
| Unit | Language selection (clinic setting → en/hi messages) | 100% |
| Integration (testcontainers) | Full new patient flow: message → consent → name → age → gender → slot → appointment created | 100% |
| Integration | Slot race condition: 2 concurrent slot selections → 1 success, 1 "slot taken" | 100% |
| Integration | Atomic transaction: patient + appointment + slot status all committed together | 100% |
| Integration | 3 invalid name attempts → graceful exit, no patient record created | 100% |
| Integration | Trial expired clinic → booking blocked, no appointment created | 100% |
| Playwright (E2E) | UJ-1 (happy path WhatsApp booking) — simulated via webhook test calls | Full UJ |

## Compliance Notes

- **CR-1:** Consent Quick Reply is the FIRST interaction for any new patient before any data collection. No name/age/gender is requested before consent is explicitly given.
- **CR-2:** Only name, age range, and gender are collected — the minimum required for appointment booking. No address, email, or additional demographics are collected at this stage.
- **CR-9:** The consent message, slot selection messages, and confirmation message must use pre-approved Meta templates or be sent within a 24-hour service conversation window. The first reply to "Hi" can be a session message (free-form) since it's within the 24h window triggered by the patient's inbound message.
