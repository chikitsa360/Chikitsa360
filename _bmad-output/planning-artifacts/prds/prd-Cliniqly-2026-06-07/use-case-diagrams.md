# Cliniqly — Use Case Flow Diagrams

Visual reference for all 50 scenarios (SC-1 through SC-50) across 12 categories.

**How to view:** Paste any code block into [mermaid.live](https://mermaid.live), or open this file in GitHub / VS Code with "Markdown Preview Mermaid Support" extension / Notion.

---

## Diagram Index

| # | Diagram | Scenarios |
|---|---|---|
| 1 | System Overview — All Channels and Actors | All |
| 2 | WhatsApp New Patient Booking — Full Sequence | SC-1, SC-2, SC-3, SC-4, SC-5 |
| 3 | Returning Patient via WhatsApp | SC-6, SC-7, SC-8, SC-9 |
| 4 | Web Booking Link | SC-10, SC-11, SC-12 |
| 5 | Cancellation Flows | SC-13, SC-14, SC-15, SC-16, SC-17 |
| 6 | Walk-in and Manual Entry | SC-18, SC-19, SC-20, SC-21, SC-22 |
| 7 | No-show and Post-Visit | SC-23, SC-24, SC-25, SC-26 |
| 8 | Reminder and Communication Failure — Sequence | SC-27, SC-28, SC-29 |
| 9 | Capacity and Plan Limit Enforcement | SC-30, SC-31, SC-32 |
| 10 | Clinic Onboarding and Setup | SC-33, SC-34, SC-35, SC-36 |
| 11 | Multi-Role Access Control | SC-37, SC-38, SC-39 |
| 12 | Plan Trial and Upgrade | SC-40, SC-41 |
| 13 | Reports and Exports | SC-42 through SC-50 |
| 14 | Role-Based Access (RBAC) Summary | FR-33, FR-44 |

---

## 1. System Overview — All Channels and Actors

```mermaid
flowchart LR
    subgraph ENTRY["Patient Entry Points"]
        P1([Patient — WhatsApp])
        P2([Patient — Web Browser])
        P3([Patient — Walk-in])
    end

    subgraph CHANNELS["Booking Channels"]
        WA["WhatsApp Booking Flow\nFR-1 to FR-6b"]
        WBL["Web Booking Link\nFR-7 to FR-9"]
        ME["Manual Entry\nFR-10 to FR-12"]
    end

    subgraph BACKEND["Cliniqly Platform"]
        BE[API + Business Logic]
        RD[(Redis — Conversation State)]
        DB[(PostgreSQL — Appointments + Patients)]
    end

    subgraph NOTIFY["Notifications"]
        META[Meta WhatsApp Cloud API]
        SMS[MSG91 SMS Fallback]
    end

    subgraph PORTAL["Staff Portal"]
        CAL[Appointment Calendar]
        DASH[Dashboard]
        RPTS[Reports]
    end

    subgraph STAFF["Staff Roles"]
        S1([Receptionist])
        S2([Doctor])
        S3([Clinic Owner])
    end

    P1 --> WA
    P2 --> WBL
    P3 --> ME
    S1 --> ME

    WA --> BE
    WBL --> BE
    ME --> BE

    BE <--> RD
    BE <--> DB

    BE --> META
    META -->|"Confirmation + Reminders"| P1
    META -->|"Confirmation + Reminders"| P2
    META -->|"Confirmation + Reminders"| P3
    META -->|"Delivery failure"| SMS
    SMS -->|"SMS fallback"| P1
    SMS -->|"SMS fallback"| P2
    SMS -->|"SMS fallback"| P3

    BE -->|"WebSocket real-time update"| CAL
    DB --> RPTS

    CAL --> S1
    CAL --> S2
    DASH --> S3
    RPTS --> S3
```

---

## 2. WhatsApp New Patient Booking — Full Sequence (SC-1 through SC-5)

*Covers: happy path (SC-1), 30-min timeout/abandonment (SC-2), invalid input (SC-3), no slots today (SC-4), after-hours booking (SC-5).*

```mermaid
sequenceDiagram
    participant P as Patient
    participant M as Meta Cloud API
    participant B as Backend
    participant R as Redis
    participant DB as PostgreSQL
    participant UI as Staff Portal

    Note over P,UI: Entry — Patient sends any message to clinic WhatsApp number

    P->>M: Sends any message (Hi / Hello / emoji)
    M->>B: Webhook POST (inbound message)
    B->>R: Check existing conversation state
    R-->>B: No state — new conversation
    B->>DB: Look up patient phone number
    DB-->>B: Not found — new patient

    Note over B: SC-5: If outside working hours, system sends closed message + offers next working day slots

    B->>R: Create state (step: consent)
    B->>M: Send consent message + YES quick reply
    M->>P: Reply YES to continue booking

    alt SC-2 — Patient does not respond within 30 minutes
        Note over R: Redis TTL expires — state cleared
        Note over B: No patient record or appointment created. Slot released if reserved.
    else Patient replies YES
        P->>M: YES
        M->>B: Webhook POST
        B->>R: Update state (step: name)
        B->>M: Please enter your name
        M->>P: Name prompt (free text)

        loop SC-3 — Invalid input on name field (max 3 attempts)
            P->>M: Invalid input (digits / symbols only)
            M->>B: Webhook POST
            B->>M: Please enter your name — letters only
            M->>P: Re-prompt same step
        end

        alt SC-3 — 3 failed attempts reached
            B->>M: Having trouble? Please call the clinic.
            M->>P: Graceful exit — no record created
        else Valid name provided
            P->>M: Enters name (e.g. Rahul)
            M->>B: Webhook POST
            B->>R: Update state (step: age, name saved)
            B->>M: Age quick reply (Under 18 / 18-35 / 36-55 / 56+)
            M->>P: Age selection buttons

            P->>M: Selects age range
            M->>B: Webhook POST
            B->>R: Update state (step: gender)
            B->>M: Gender quick reply (Male / Female / Other / Prefer not to say)
            M->>P: Gender selection buttons

            P->>M: Selects gender
            M->>B: Webhook POST
            B->>DB: Fetch available slots (today + next 2 days, up to 5 slots)

            alt SC-4 — No slots available today
                DB-->>B: No slots today
                B->>DB: Check next 2 available days
                alt Slots found within 7 days
                    B->>M: No slots today — nearest available times shown
                    M->>P: List Message with future slots
                else No slots in next 7 days
                    B->>M: No appointments available. Please call the clinic.
                    M->>P: No availability message — flow ends
                end
            else Slots available
                DB-->>B: Up to 5 slots returned
                B->>R: Update state (step: slot_selection)
                B->>M: List Message with up to 5 slots
                M->>P: Slot selection list
            end

            P->>M: Selects a slot
            M->>B: Webhook POST
            B->>DB: Reserve slot (5-minute lock)
            DB-->>B: Slot reserved
            B->>R: Update state (step: confirmed, slot reserved)
            B->>DB: Create Patient record
            B->>DB: Create Appointment (status: confirmed)
            B->>DB: Schedule 24h and 2h reminders
            B->>R: Clear conversation state
            B->>M: Send apt_confirmation template
            M->>P: Token + Doctor + Date/Time + Clinic name and address
            B->>UI: WebSocket event — new appointment
            UI->>UI: Calendar updates in real time (within 5 seconds)
        end
    end
```

---

## 3. Returning Patient via WhatsApp (SC-6 through SC-9)

*Covers: recognised returning patient fast-track (SC-6), patient already has appointment today (SC-7), prior no-show on record (SC-8), web booking with phone match (SC-9).*

```mermaid
flowchart TD
    START([Patient sends any message to clinic WhatsApp]) --> LOOKUP[Backend checks phone number in database]

    LOOKUP -->|Phone not found| NEW[New patient — route to Diagram 2]
    LOOKUP -->|Phone found| GREET["SC-6: System greets by first name<br>Welcome back, Rahul! Book another appointment?"]

    GREET --> P1{Patient response?}
    P1 -->|No thanks| END1([Flow ends — no booking])
    P1 -->|No response 30 min| END2([SC-2: Timeout — state cleared])
    P1 -->|Yes book now| CHK_TODAY{Patient already has<br>confirmed appointment today?}

    CHK_TODAY -->|No existing appointment today| FAST_TRACK["SC-6: Present available slots immediately<br>No re-registration required"]
    FAST_TRACK --> CONFIRM[Patient selects slot<br>Appointment confirmed<br>Token assigned<br>Visit history updated]
    CONFIRM --> DONE1([SC-6: Booking complete])

    CHK_TODAY -->|Already has appointment today| SC7_INFORM["SC-7: Inform patient<br>You already have Token #4 at 3:30 PM today.<br>What would you like to do?"]
    SC7_INFORM --> P2{Patient choice?}

    P2 -->|Book for another day| FUTURE[Show future dates only — SC-7]
    FUTURE --> FAST_TRACK

    P2 -->|Cancel existing| CANCEL_THEN_BOOK[Trigger FR-6 cancellation<br>then show slot selection — SC-7]
    CANCEL_THEN_BOOK --> FAST_TRACK

    P2 -->|View my appointment| RESEND[Re-send confirmation for existing appointment<br>SC-7 complete — no new booking]

    LOOKUP -->|"Phone found — prior appointment status: no-show"| SC8["SC-8: No-show history visible to clinic staff only<br>Not surfaced to patient<br>Returning fast-track applies normally"]
    SC8 --> GREET

    WEB_START([Patient opens Web Booking Link]) --> WEB_PHONE[Patient enters phone number during booking]
    WEB_PHONE --> WEBMATCH{Phone matches<br>existing patient record?}
    WEBMATCH -->|Yes| SC9[SC-9: Appointment linked to existing patient<br>No duplicate record created<br>Visit history updated]
    WEBMATCH -->|No| NEW_WEB[New patient record created]
    SC9 --> WEB_CONFIRM([WhatsApp confirmation sent])
    NEW_WEB --> WEB_CONFIRM
```

---

## 4. Web Booking Link (SC-10 through SC-12)

*Covers: new patient without WhatsApp — SMS fallback (SC-10), slot conflict during booking (SC-11), clinic has no available slots (SC-12).*

```mermaid
flowchart TD
    START([Patient opens cliniqly.com/book/clinic-slug]) --> AVAIL{Slots available<br>in next 7 days?}

    AVAIL -->|No slots at all| SC12["SC-12: No slots available message<br>Clinic phone number shown<br>No booking form presented"]

    AVAIL -->|Slots available| PAGE["Show: Clinic name, Doctors, available slots<br>No login or account required<br>Mobile browser — no app download"]

    PAGE --> INPUT[Patient enters: name + 10-digit mobile number]
    INPUT --> SELECT[Patient selects a slot]
    SELECT --> SUBMIT[Patient submits booking]

    SUBMIT --> RACE{Is slot still available<br>at time of submission?}
    RACE -->|"SC-11: Slot just taken by another booking"| CONFLICT["SC-11: That slot was just taken<br>Show updated slot list<br>Patient name and phone not lost<br>Patient selects another slot"]
    CONFLICT --> SUBMIT

    RACE -->|Slot available| CREATE[Create Appointment + Patient record<br>Assign Token]
    CREATE --> SCREEN[Show on-screen confirmation:<br>Token + Doctor + Date + Time]

    CREATE --> WA_TRY{WhatsApp delivery<br>to patient phone?}
    WA_TRY -->|Success| WA_OK[WhatsApp confirmation sent<br>apt_confirmation template]
    WA_TRY -->|"SC-10: Failure — patient not on WhatsApp"| FALLBACK["SC-10: SMS fallback triggered<br>MSG91 SMS sent within 5 minutes<br>All future reminders for this patient also use SMS"]

    WA_OK --> DONE([Booking complete — calendar updates in real time])
    FALLBACK --> DONE
```

---

## 5. Cancellation Flows (SC-13 through SC-17)

*Covers: cancel via 24h reminder (SC-13), cancel via 2h reminder (SC-14), cancel attempt after appointment has passed (SC-15), staff cancels on behalf of patient (SC-16), patient tries to cancel an already-cancelled appointment (SC-17).*

```mermaid
flowchart TD
    subgraph PATIENT_CANCEL["Patient-Initiated Cancellation (SC-13, SC-14, SC-15)"]
        PC_START([Patient receives WhatsApp reminder]) --> WHICH{Which reminder?}
        WHICH -->|24-hour reminder| SC13[SC-13: Patient taps Cancel appointment quick reply]
        WHICH -->|2-hour reminder| SC14[SC-14: Patient replies CANCEL — case-insensitive]

        SC13 --> TIME_CHK{Appointment time<br>in the future?}
        SC14 --> TIME_CHK

        TIME_CHK -->|Yes| DO_CANCEL[Cancellation acknowledgment sent to patient<br>Appointment status: cancelled<br>Slot returns to available<br>Receptionist calendar updates in real time]

        TIME_CHK -->|No — appointment already passed| SC15["SC-15: This appointment has already passed.<br>No status change. No action taken."]
    end

    subgraph STAFF_CANCEL["Staff-Initiated Cancellation (SC-16)"]
        SC_START([Receptionist opens appointment — taps Cancel]) --> NOTIFY{Send WhatsApp notice<br>to patient?}
        NOTIFY -->|Yes| SC16_Y[SC-16: Cancellation WhatsApp sent<br>Appointment: cancelled<br>Slot: available<br>Modification logged with staff role + timestamp]
        NOTIFY -->|No| SC16_N[SC-16: Silent cancellation<br>No message sent<br>Modification still logged]
    end

    subgraph DOUBLE_CANCEL["Double-Cancel Prevention (SC-17)"]
        DC_START([Patient sends CANCEL]) --> STATUS_CHK{Appointment<br>current status?}
        STATUS_CHK -->|Already cancelled| SC17["SC-17: Your appointment is already cancelled.<br>Book anytime by messaging us.<br>No action taken — no duplicate"]
        STATUS_CHK -->|Confirmed — valid cancellation| DO_CANCEL2[Normal cancellation flow — same as SC-13]
    end
```

---

## 6. Walk-in and Manual Entry (SC-18 through SC-22)

*Covers: new walk-in with slots available (SC-18), returning walk-in (SC-19), no slots — override (SC-20), receptionist reschedules appointment (SC-21), manual entry from phone call (SC-22).*

```mermaid
flowchart TD
    START([Receptionist needs to add appointment]) --> TYPE{How?}
    TYPE -->|Patient walks in| WALKIN
    TYPE -->|Phone call or other source| MANUAL_ENTRY

    subgraph WALKIN_FLOW["Walk-in Registration (SC-18, SC-19, SC-20)"]
        WALKIN[Receptionist taps New Walk-in<br>Enters patient name and phone] --> PHONE_CHK{Phone in<br>database?}

        PHONE_CHK -->|New patient| SC18[SC-18: Create new Patient record<br>Name and phone required]
        PHONE_CHK -->|Existing patient| SC19[SC-19: Name auto-fills<br>Last visit date shown inline]

        SC18 --> SLOT_CHK
        SC19 --> SLOT_CHK

        SLOT_CHK{Slots available<br>for any doctor today?}
        SLOT_CHK -->|Slots available| ASSIGN[Select Doctor + Slot<br>Token assigned<br>Source: Walk-in<br>WhatsApp confirmation sent]

        SLOT_CHK -->|No slots today| SC20_WARN[SC-20: Warning shown — no slots available today<br>Override to add walk-in anyway?]
        SC20_WARN --> OVERRIDE{Receptionist<br>overrides?}
        OVERRIDE -->|Yes — emergency| OVERFLOW[SC-20: Appointment created<br>Source: Walk-in overflow<br>Token assigned as next sequential<br>Does not occupy formal slot<br>Calendar shows overflow indicator<br>WhatsApp confirmation sent]
        OVERRIDE -->|No| END_WI([Walk-in not registered])
    end

    subgraph MANUAL_FLOW["Manual Entry and Modification (SC-21, SC-22)"]
        MANUAL_ENTRY[Receptionist taps New Appointment<br>Selects Patient — new or existing<br>Selects Doctor and Slot] --> MANUAL_DONE[Appointment created<br>Source: Manual<br>Token assigned]
        MANUAL_DONE --> MANUAL_SEND{Send WhatsApp<br>confirmation?}
        MANUAL_SEND -->|Yes| MANUAL_WA[SC-22: Confirmation sent]
        MANUAL_SEND -->|No| MANUAL_SKIP[SC-22: No message sent]

        RESCHEDULE([Patient calls to reschedule]) --> OPEN_APPT[Receptionist opens appointment<br>Taps Reschedule]
        OPEN_APPT --> NEW_SLOT[Calendar picker shown<br>New slot selected — must be available<br>Old slot released to available<br>SC-21: New confirmation WhatsApp sent<br>Reminders rescheduled to new date/time]
    end
```

---

## 7. No-show and Post-Visit Flows (SC-23 through SC-26)

*Covers: marking no-show (SC-23), doctor adds visit note (SC-24), mark complete + record payment (SC-25), record as unpaid then pay later (SC-26).*

```mermaid
flowchart TD
    APPT([Appointment time arrives]) --> ATTEND{Did patient attend?}

    ATTEND -->|No — did not arrive| NOSHOW
    ATTEND -->|Yes — consultation complete| POST_VISIT

    subgraph NOSHOW_FLOW["No-show Handling (SC-23)"]
        NOSHOW[Receptionist opens appointment<br>Taps Mark as No-show]
        NOSHOW --> NOSHOW_DONE[SC-23: Appointment status: no-show<br>No WhatsApp sent to patient<br>No-show count on Dashboard increments<br>Slot logged for analytics]
    end

    subgraph POST_VISIT_FLOW["Post-Visit Flows (SC-24, SC-25, SC-26)"]
        POST_VISIT[Receptionist marks Appointment: completed]

        POST_VISIT --> PAYMENT{Record payment?}
        PAYMENT -->|Paid now| SC25[SC-25: Receptionist enters fee in INR<br>Marks as Paid<br>Daily revenue on Dashboard updates within 3 seconds]
        PAYMENT -->|Patient will pay later| SC26[SC-26: Payment status: unpaid<br>Appears in pending collection count<br>Receptionist marks Paid when patient pays]

        POST_VISIT --> NOTE_Q{Doctor adds<br>visit note?}
        NOTE_Q -->|Yes| SC24[SC-24: Doctor opens patient profile<br>Taps Add visit note<br>Max 500 characters — plain text<br>Visible to: Clinic Owner + Doctor only<br>Not visible to Receptionist<br>No WhatsApp sent to patient]
        NOTE_Q -->|No| NOTE_SKIP[No note added — profile unchanged]
    end
```

---

## 8. Reminder and Communication Failure — Sequence Diagram (SC-27 through SC-29)

*Covers: WhatsApp delivery failure triggers SMS fallback (SC-27), patient opts out and re-opts-in (SC-28), backend restart mid-conversation — state durability (SC-29).*

```mermaid
sequenceDiagram
    participant SCHED as Scheduler
    participant B as Backend
    participant M as Meta Cloud API
    participant SMS as MSG91 SMS
    participant P as Patient

    Note over SCHED,P: SC-27 — WhatsApp delivery failure → SMS fallback

    SCHED->>B: Trigger 24-hour reminder for appointment
    B->>M: Send apt_reminder_24h template
    M-->>B: Delivery failure (patient not on WhatsApp / inactive number)
    B->>B: Log failure against appointment
    Note over B: Wait up to 5 minutes
    B->>SMS: Send SMS reminder
    SMS->>P: SMS — Reminder: Tomorrow 3:30 PM Dr. Sharma. Reply CANCEL to cancel.
    SMS-->>B: SMS delivery status logged
    Note over B: If SMS also fails — logged, no further retry in MVP

    Note over SCHED,P: SC-28 — Patient opts out of WhatsApp messages

    P->>M: Replies STOP to any automated message
    M->>B: Webhook POST (opt-out signal)
    B->>B: Log opt-out for patient phone number (within 1 hour)
    Note over B: All future WhatsApp messages suppressed for this number
    Note over B: SMS fallback also suppressed — no automated messages of any kind
    B->>B: Mark patient profile — Opted out indicator shown to staff

    P->>M: Sends START (opt back in)
    M->>B: Webhook POST (opt-in signal)
    B->>B: Remove opt-out flag — resume normal automated messaging

    Note over SCHED,P: SC-29 — Backend restart mid-WhatsApp conversation

    Note over P,B: Patient is mid-flow at step: awaiting slot selection. State in Redis.
    Note over B: Backend pod restarts (deployment or crash)
    B->>B: Redis AOF persistence — state survives restart
    P->>M: Patient sends next message
    M->>B: Webhook POST
    B->>B: Read Redis state — resume from awaiting slot selection
    B->>M: Re-present slot list — conversation continues
    M->>P: Patient experiences no disruption

    Note over B: Edge case: If Redis also fails — state lost. Patient's next message restarts flow from beginning. No appointment created from failed state. No data corruption.
```

---

## 9. Capacity and Plan Limit Enforcement (SC-30 through SC-32)

*Covers: race condition — two simultaneous bookings on same slot (SC-30), Starter plan appointment limit hit (SC-31), WhatsApp message allowance exhausted (SC-32).*

```mermaid
flowchart TD
    subgraph RACE["SC-30 — Race Condition: Two Simultaneous Bookings"]
        RC_START([Two patients select same slot at the same second]) --> LOCK[Database write with optimistic locking]
        LOCK -->|First write succeeds| WIN[Patient A: Appointment confirmed<br>Token assigned — Slot: booked]
        LOCK -->|Second write detects conflict| LOSE[Patient B: That slot was just taken<br>Alternative slots presented<br>Both informed within 3 seconds<br>No double-booking — no data inconsistency]
    end

    subgraph APPT_LIMIT["SC-31 — Starter Plan Appointment Limit (500 per month)"]
        AL_START([Booking attempt on Starter plan]) --> AL_COUNT{Monthly appointment<br>count?}
        AL_COUNT -->|Below 450| AL_OK[Booking proceeds normally]
        AL_COUNT -->|Reaches 450 — 90 percent| AL_WARN[WhatsApp alert to Clinic Owner:<br>90% of monthly limit used — upgrade to Growth]
        AL_WARN --> AL_OK
        AL_COUNT -->|Reaches 500 — limit hit| AL_BLOCK[WhatsApp Booking Flow blocked:<br>Unable to accept online bookings. Please call clinic.<br>Web Booking Link: booking temporarily unavailable<br>Portal manual entry: still allowed with warning banner]
        AL_BLOCK --> AL_UPGRADE{Owner upgrades<br>or month resets?}
        AL_UPGRADE -->|Upgrades to Growth| AL_RESUME[Limit lifted immediately<br>All booking channels reactivated]
        AL_UPGRADE -->|Month resets| AL_RESUME
    end

    subgraph MSG_LIMIT["SC-32 — WhatsApp Message Allowance (Starter: 200 per month)"]
        ML_START([WhatsApp message sent]) --> ML_COUNT{Messages sent<br>this month?}
        ML_COUNT -->|Below 180| ML_OK[Messages continue normally]
        ML_COUNT -->|Reaches 180 — 90 percent| ML_WARN[WhatsApp alert to Clinic Owner:<br>90% of message allowance used]
        ML_WARN --> ML_OK
        ML_COUNT -->|Reaches 200 — limit hit| ML_PAUSE[Automated reminders paused<br>Booking confirmations continue — confirmations have priority]
        ML_PAUSE --> ML_OWNER[WhatsApp to Clinic Owner:<br>Message limit reached. Reminders paused.<br>Contact Cliniqly support to purchase top-up pack.]
        ML_OWNER --> ML_TOPUP{Top-up purchased<br>or month resets?}
        ML_TOPUP -->|Yes| ML_RESUME[Reminders resume immediately<br>Missed reminders not retroactively sent]
        ML_TOPUP -->|Month resets| ML_RESUME
    end
```

---

## 10. Clinic Onboarding and Setup (SC-33 through SC-36)

*Covers: first-time setup wizard (SC-33), skip WhatsApp step and complete later (SC-34), invite receptionist (SC-35), invite expires without acceptance (SC-36).*

```mermaid
flowchart TD
    SIGNUP([Clinic Owner signs up<br>Phone number + SMS OTP]) --> WIZARD[Guided Setup Wizard<br>Progress: 0 of 4 steps]

    WIZARD --> TERMS[Must accept: Terms of Service<br>Privacy Policy + Data Processing Agreement<br>Acceptance recorded with timestamp — DPDP Act 2023]

    TERMS --> S1[Step 1: Clinic Details<br>Name, address, speciality<br>Independently saveable]
    S1 --> S2[Step 2: Add Doctor<br>Name, phone, speciality, role<br>Independently saveable]
    S2 --> S3[Step 3: Working Hours<br>Days, start/end time, slot duration, lunch block<br>Independently saveable]
    S3 --> S4[Step 4: Connect WhatsApp<br>Enter WhatsApp Business number<br>Guided Meta Business Manager setup<br>Status shown: Number registered → Templates submitted → Verified]

    S4 --> WA_DONE{WhatsApp setup<br>completed?}

    WA_DONE -->|Yes — all 4 steps complete| LIVE["SC-33: Wizard complete<br>Sample appointment auto-created (labelled Sample)<br>Land on Dashboard<br>All features active<br>Web Booking Link live immediately"]

    WA_DONE -->|Skipped — taps Skip for now| SC34["SC-34: Platform accessible<br>WhatsApp Booking Flow: inactive<br>Web Booking Link: active<br>Persistent banner: WhatsApp booking not active — Complete setup link"]
    SC34 --> LATER{Owner returns to<br>complete WhatsApp setup?}
    LATER -->|Yes — via Settings| WA_ACTIVATE[WhatsApp flow activates immediately]
    LATER -->|Remains pending| SC34

    subgraph INVITE["Staff Invitation (SC-35, SC-36)"]
        INV_START([Owner opens Settings — Team — Invite Staff]) --> INV_PHONE[Enter staff phone number<br>Select role: Receptionist or Doctor<br>Doctor count enforced per plan limit]
        INV_PHONE --> INV_SEND[SC-35: WhatsApp invite sent to staff<br>Setup link — valid for 7 days]
        INV_SEND --> INV_ACCEPT{Staff accepts<br>within 7 days?}
        INV_ACCEPT -->|Yes — opens link, OTP, logged in| INV_DONE[SC-35: Staff live with assigned role<br>Sees appointments and patients for this clinic]
        INV_ACCEPT -->|No — 7 days elapsed| INV_EXP[SC-36: Link expired<br>Staff sees expiry message if clicked<br>Owner resends from Settings — Team]
        INV_EXP --> INV_PHONE
    end
```

---

## 11. Multi-Role Access Control (SC-37 through SC-39)

*Covers: doctor accessing another doctor's patients (SC-37), receptionist accessing billing (SC-38), session expiry and re-authentication (SC-39).*

```mermaid
flowchart TD
    subgraph DOCTOR_ACCESS["SC-37 — Doctor Accessing Patient Records"]
        DA_START([Doctor navigates to a patient profile]) --> DA_CHK{Has this patient had<br>an appointment with this Doctor?}
        DA_CHK -->|Yes — own patient<br>OR shared patient at same clinic| DA_ALLOW[Access granted<br>Full profile shown<br>Other doctors' visit notes: read-only<br>Own visit notes: editable]
        DA_CHK -->|No — patient only visited other doctors| DA_DENY[HTTP 403 — profile not rendered<br>No restricted data in response<br>Access denied gracefully: No patients found]
    end

    subgraph RECEP_ACCESS["SC-38 — Receptionist Accessing Billing"]
        RA_START([Receptionist navigates to Billing section]) --> RA_CHK{Role check}
        RA_CHK -->|Receptionist role| RA_DENY[HTTP 403 — billing screen not rendered<br>You do not have permission to view this section]
        RA_CHK -->|Clinic Owner role| RA_ALLOW[Full billing access granted]
    end

    subgraph SESSION["SC-39 — Session Expiry and Re-authentication"]
        SE_START([Staff opens Cliniqly]) --> SE_CHK{Session valid?<br>Last login within 30 days?}
        SE_CHK -->|Valid — same trusted device| SE_OK[Auto-logged in<br>Calendar and patient list intact — no data loss]
        SE_CHK -->|Expired — 30+ days OR new browser| SE_REDIR[Redirected to login screen]
        SE_REDIR --> SE_OTP[Enter phone number<br>Receive 6-digit OTP via SMS<br>Max 3 failed attempts — 15 min lockout]
        SE_OTP --> SE_NEW[New 30-day session started<br>SC-39 complete]
    end

    subgraph TRUSTED["Trusted Device Definition"]
        TD_NOTE["Trusted device = valid HttpOnly session cookie<br>Clearing browser cookies = new device<br>Different browser = new device<br>New device always requires re-authentication"]
    end
```

---

## 12. Plan Trial and Upgrade (SC-40 through SC-41)

*Covers: 14-day trial expiry — soft paywall activates (SC-40), mid-month plan upgrade from Starter to Growth (SC-41).*

```mermaid
flowchart TD
    subgraph TRIAL["SC-40 — Trial Expiry and Soft Paywall"]
        T_START([Clinic on 14-day free trial<br>No card required]) --> T_D13{Day 13?}
        T_D13 -->|Yes| T_WARN[WhatsApp to Clinic Owner:<br>Trial ends tomorrow<br>20% off annual plan — link included]
        T_WARN --> T_D15{Day 15 — no conversion?}
        T_D15 -->|Converted to paid plan| T_ACTIVE([All features continue normally])
        T_D15 -->|Not converted| T_WALL[Soft paywall activated<br>All staff: read-only access<br>Existing data fully visible<br>WhatsApp bookings: Online booking unavailable. Please call clinic.<br>Web Booking Link: Booking unavailable. Please contact clinic.]
        T_WALL --> T_SUB{Clinic Owner<br>subscribes?}
        T_SUB -->|Yes — any paid plan| T_LIFT[Paywall lifted immediately<br>All booking channels reactivated<br>SC-40 complete]
        T_SUB -->|No| T_WALL
    end

    subgraph UPGRADE["SC-41 — Mid-Month Upgrade: Starter to Growth"]
        U_START([Clinic Owner upgrades on Day 15 of month]) --> U_NOW[Changes effective immediately]
        U_NOW --> U1[Doctor limit: 1 → 3<br>Owner can invite 2 more doctors now]
        U_NOW --> U2[WhatsApp allowance: 200 → 1000<br>Paused reminders resume if any were paused]
        U_NOW --> U3[Appointment limit: 500/month → unlimited]
        U_NOW --> U4[Billing: manual via Cliniqly support in MVP<br>Prorated billing via Razorpay is Phase 1]
    end
```

---

## 13. Reports and Exports (SC-42 through SC-50)

*Covers: daily appointment list PDF — owner and receptionist (SC-42, SC-43), patient visit history by doctor (SC-44), monthly revenue for accountant (SC-45), no-show analysis by channel (SC-46), doctor-wise performance (SC-47), new vs returning trend (SC-48), no data for period (SC-49), slow report — async fallback (SC-50).*

```mermaid
flowchart TD
    START([Staff opens Reports]) --> ROLE_CHK{User role?}

    ROLE_CHK -->|Clinic Owner| OWNER_RPT[All 6 report types accessible]
    ROLE_CHK -->|Doctor| DOC_RPT[Daily list: own appointments only<br>Visit history: own patients only<br>No-show: own stats only<br>Revenue and Doctor-wise: no access]
    ROLE_CHK -->|Receptionist| REC_RPT[Daily Appointment List only<br>Fee and payment columns hidden<br>All other reports: HTTP 403]

    OWNER_RPT --> RPT_TYPE{Select report}

    RPT_TYPE -->|Daily Appointment List| DAL["SC-42 / SC-43<br>Columns: Token, Patient, Doctor, Time,<br>Source, Status, Fee, Payment<br>Filter: date, doctor, status<br>SC-43: Receptionist sees no fee columns"]

    RPT_TYPE -->|Patient Visit History| PVH["SC-44<br>Search patient — scoped to accessible patients<br>All appointments chronological + visit notes<br>Doctor can only export own patients"]

    RPT_TYPE -->|Monthly Revenue Summary| MRS["SC-45<br>Bar chart: daily revenue<br>Summary: total paid, unpaid, by doctor<br>SC-45: Export CSV to accountant for GST filing"]

    RPT_TYPE -->|No-show and Attendance| NSA["SC-46<br>Date range: Today / Week / Month / Custom<br>Breakdown by doctor AND by booking source<br>Identifies which channel has highest no-show rate"]

    RPT_TYPE -->|Doctor-wise Report| DWR["SC-47<br>Per doctor: appointments, completed,<br>no-shows, revenue, avg fee<br>Sortable columns<br>Doctor sees own row only"]

    RPT_TYPE -->|New vs Returning Trend| NRT["SC-48<br>Grouped bar chart: new vs returning per week<br>Summary: total unique, return rate<br>SC-48: Owner correlates dip with renovation closure"]

    DAL --> DATE_RANGE[Date range selected<br>Preset: Today / This Week / This Month / Last 3 Months<br>Custom: max 12 months]
    MRS --> DATE_RANGE
    NSA --> DATE_RANGE
    DWR --> DATE_RANGE
    NRT --> DATE_RANGE

    DATE_RANGE --> SPEED{Query time?}

    SPEED -->|"Up to 3 months → under 3 seconds"| RENDER[Report renders on screen]
    SPEED -->|"Up to 12 months → under 8 seconds"| RENDER
    SPEED -->|"Over 8 seconds — SC-50"| ASYNC["SC-50: Async fallback triggered<br>User sees: Report is being generated<br>WhatsApp notification to Clinic Owner when ready<br>Report in Recent Reports list for 24 hours"]

    RENDER --> NO_DATA{Data available<br>for period?}
    NO_DATA -->|"SC-49: No data — clinic not yet active for that period"| EMPTY["SC-49: Empty state shown<br>No data for March 2026. Clinic active from May 2026.<br>CSV export: headers only, no data rows"]
    NO_DATA -->|Data available| EXPORT{Export?}

    EXPORT -->|PDF| PDF[PDF generated within 5 seconds<br>A4 formatted — clinic name + date in header<br>SC-42: Owner prints daily reference sheet<br>SC-45: Owner sends to CA]
    EXPORT -->|CSV| CSV_EXP[CSV generated within 3 seconds<br>SC-45: Date, Appointments, Paid, Unpaid, Doctor<br>SC-48: Date, New Patients, Returning, Total]
    EXPORT -->|Screen only| SCREEN[On-screen view with chart where applicable]
```

---

## 14. Role-Based Access (RBAC) Summary

| Capability | Clinic Owner | Doctor | Receptionist |
|---|---|---|---|
| View all appointments — all doctors | Yes | Own doctor only | Yes — all doctors |
| View all patients | Yes | Own patients only | Yes — all patients |
| Add visit note to completed appointment | Yes | Own appointments only | No |
| View visit notes | Yes | Own appointments only | No |
| Billing records and revenue | Yes | No | No |
| Clinic Settings | Yes | No | No |
| Invite and remove staff | Yes | No | No |
| **Daily Appointment List** | All doctors, all columns | Own appointments only | Own clinic — no fee/payment columns |
| **Patient Visit History export** | Any patient | Own patients only | No access |
| **Monthly Revenue Summary** | Full access | No access | No access |
| **No-show and Attendance report** | All doctors | Own stats only | No access |
| **Doctor-wise Report** | Full access | No access | No access |
| **New vs Returning Patient Trend** | Full access | No access | No access |

**Access enforcement rules:**
- Any restricted resource → HTTP 403, no restricted data in response body
- All data scoped to logged-in staff member's Clinic Tenant — cross-clinic access is impossible at DB layer (PostgreSQL Row-Level Security)
- Session: 30 days on trusted device; re-authentication required on new or unrecognised device
- Doctor plan limits: Starter 1 / Growth 3 / Pro 10 / Enterprise unlimited

---

*Cliniqly MVP — Scenarios SC-1 through SC-50 | PRD v1.0 (2026-06-07)*
*Source: prd.md §2.4 Extended Scenarios + §4 Features (FR-33, FR-44)*
