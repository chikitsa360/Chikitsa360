---
title: Cliniqly — WhatsApp-First Clinic Management Platform
status: final
created: 2026-06-07
updated: 2026-06-07
---

# PRD: Cliniqly MVP

## 0. Document Purpose

This PRD defines the Minimum Viable Product for Cliniqly — a WhatsApp-first clinic management platform for small independent clinics in India. It is written for the founding team, downstream workflow owners (UX, architecture, engineering), and early stakeholders. The document uses a Glossary-anchored vocabulary (§3); all terms appear verbatim throughout. Features are grouped in §4 with globally numbered FRs; assumptions are tagged `[ASSUMPTION]` inline and indexed in §15. Technical implementation choices (BSP selection, database simplifications, architecture decisions) live in `addendum.md` — this PRD captures what the system must do, not how it does it.

**Supporting inputs:** `docs/Cliniqly_Business_Plan.docx`, `docs/Cliniqly_Technical_Architecture.docx`, business plan and architecture review session (2026-06-07). UX specifications and solution architecture are downstream of this document.

---

## 1. Vision

India has over 930,000 small independent clinics where the doctor is also the business owner. The overwhelming majority still manage appointments through WhatsApp messages, paper registers, and memory — not because they lack ambition, but because every existing software solution is built for hospitals, priced for enterprises, or requires weeks of training to use. The result is a daily tax paid in missed appointments, lost patient history, and a receptionist buried in WhatsApp chats.

Cliniqly eliminates that tax. A patient sends "Hi" to the clinic's WhatsApp number and has a confirmed appointment with a token number in under 60 seconds — no app download, no signup, no friction. The clinic sees every appointment, every patient, and the day's revenue on a single screen. The receptionist stops manually entering chats into registers. The doctor stops losing patient history between visits.

The MVP targets the single biggest pain: centralized appointment booking via WhatsApp, with a simple clinic dashboard and patient database that works on the first day, requires no training, and pays for itself by recovering one no-show per week.

---

## 2. Target Users

### 2.1 Jobs To Be Done

**Clinic Owner / Doctor**
- Know at a glance how many patients are coming today, and how many actually showed up
- Stop losing patient history when patients return months later
- Reduce no-shows without personally calling every patient
- Understand which days and doctors generate the most revenue
- Give staff a tool that does not require training or supervision

**Receptionist**
- Stop manually copying WhatsApp appointment messages into a register
- Find a patient's history in seconds without scrolling through WhatsApp
- Manage a full day's appointments from one screen, including walk-ins
- Have an automatic fallback when patients do not respond to reminders

**Patient**
- Book an appointment without downloading an app or creating an account
- Get a confirmation they can refer back to (time, doctor, token number)
- Receive a reminder that actually reaches them (WhatsApp, not email)
- Cancel without calling the clinic during busy hours

### 2.2 Non-Users (MVP)

- Patients who are not on WhatsApp and have no smartphone [ASSUMPTION: less than 5% of urban/semi-urban target market, based on 95% WhatsApp penetration cited in business plan]
- Multi-branch clinic networks (Enterprise tier — Phase 2)
- Diagnostic centres and labs (different workflow — Phase 2+)
- Patients as primary app users (patient mobile app — Phase 2)

### 2.3 Key User Journeys

**UJ-1. Sunita books an incoming WhatsApp appointment for a new patient.**
- **Persona + context:** Sunita, receptionist at a 2-doctor dental clinic in Pune, managing 40–60 appointments/day. It is a busy Tuesday morning.
- **Entry state:** Clinic's WhatsApp Business number is live via Meta Cloud API. Sunita is logged into Cliniqly on her phone browser as Receptionist.
- **Path:** A patient WhatsApps "Hi" to the clinic number. The automated WhatsApp Booking Flow collects name, age, and gender via Quick Reply buttons, presents available Slots as a List Message, and the patient selects a Slot. Sunita sees the new Appointment appear instantly in the Appointment Calendar — no manual entry required. Token is auto-assigned.
- **Climax:** Sunita sees the Appointment on her calendar. The patient has a confirmation on WhatsApp with Token number, Doctor name, and time. No phone call needed.
- **Resolution:** Sunita is free to handle the next patient. The system has scheduled a 24-hour and 2-hour Reminder automatically.
- **Edge case:** If no Slots are available today, the system presents the next 2 available days and lets the patient pick.

**UJ-2. Ravi books his dental checkup via the clinic's Web Booking Link.**
- **Persona + context:** Ravi, 34, IT professional in Bangalore. Saw the clinic's Instagram post with a "Book appointment" link. He is on his phone during lunch.
- **Entry state:** Unauthenticated mobile browser. Clinic has an active Web Booking Link.
- **Path:** Ravi opens `cliniqly.com/book/smile-dental-pune`, sees available Slots for the next 3 days, selects tomorrow at 11am, enters his name and mobile number, and confirms.
- **Climax:** Ravi receives a WhatsApp confirmation with Token number. He did not download an app or create an account.
- **Resolution:** Ravi's Patient record is created (or matched if his phone number exists). The Clinic sees the Appointment immediately in their calendar.
- **Edge case:** If the Slot is taken between page load and confirmation, the system shows "Slot just taken — here are the next available slots" without losing his details.

**UJ-3. Dr. Mehta checks her morning before entering the clinic.**
- **Persona + context:** Dr. Priya Mehta, 38, owner of a dermatology clinic in Mumbai, commuting on Thursday morning.
- **Entry state:** Authenticated as Clinic Owner on mobile browser.
- **Path:** Opens the Dashboard — sees Today: 18 Appointments, 3 walk-in Slots remaining, 2 no-shows from yesterday. Taps a new Patient at 10am, opens their profile — sees booking source was WhatsApp, reason entered as "acne consultation".
- **Climax:** Dr. Mehta arrives knowing exactly what her day looks like and prepared for the new patient.
- **Resolution:** She moves to the Appointment Calendar for hour-by-hour detail.

**UJ-4. Sunita handles a walk-in patient with no prior booking.**
- **Persona + context:** Same receptionist. A patient walks in at 11:15am without an Appointment.
- **Entry state:** Sunita logged in as Receptionist. Calendar is on screen.
- **Path:** Sunita taps "New Walk-in", enters patient name and phone. System checks — new patient. Creates a Patient record. Sunita selects Doctor and assigns the next available Slot. Token is issued. WhatsApp confirmation is sent.
- **Climax:** Walk-in is registered in under 60 seconds with a Token. Patient joins the queue.
- **Resolution:** Walk-in appears in the calendar alongside pre-booked Appointments.

**UJ-5. Dr. Mehta reviews the week's revenue and no-show performance.**
- **Persona + context:** Dr. Mehta, end of Friday, wants to understand the week before closing.
- **Entry state:** Authenticated as Clinic Owner on desktop browser.
- **Path:** Opens Dashboard, switches to Weekly view — total Appointments 87, completed 78, no-shows 9 (10.3%), revenue collected ₹43,500. Notices Tuesday had 6 no-shows — all new WhatsApp patients. Decides to enable the 2-hour Reminder for all new patients.
- **Climax:** Dr. Mehta understands her no-show pattern and takes action in Settings.
- **Resolution:** Reminder settings updated; no-show tracking continues.

### 2.4 Extended Scenarios

*Comprehensive scenario library covering all patient and staff flows — new patient to returning patient, happy paths to edge cases. Numbered SC-1 through SC-N for stable reference from FRs, tickets, and test cases. Organised by category.*

---

#### Category A — New Patient via WhatsApp

**SC-1. New patient completes first-ever booking via WhatsApp (happy path)**
1. Patient sends "Hi" to clinic's WhatsApp number for the first time.
2. System responds within 3 seconds: consent message + "Reply YES to continue".
3. Patient replies "YES". System asks for name via free-text prompt.
4. Patient types name. System asks age via Quick Reply buttons (ranges: Under 18 / 18–35 / 36–55 / 56+).
5. Patient selects age range. System asks gender via Quick Reply (Male / Female / Other / Prefer not to say).
6. Patient selects gender. System displays available slots as a List Message (up to 5 slots across today and next 2 days).
7. Patient selects a slot. System reserves the slot for 5 minutes.
8. System sends confirmation: "Appointment confirmed! Token #4, Dr. Sharma, Today 3:30 PM, ABC Dental Clinic, 42 MG Road." [English or Hindi based on Clinic setting]
9. Patient record created in database. Appointment created with status `confirmed`. 24-hour and 2-hour Reminders scheduled.
10. Clinic calendar updates in real time. Receptionist sees new appointment without refreshing.

**SC-2. New patient abandons mid-flow — does not respond**
1. Patient sends "Hi". System sends consent message.
2. Patient does not respond for 30 minutes.
3. Redis conversation state expires. Slot (if any was reserved) released back to `available`.
4. No Patient record created. No Appointment created.
5. If the same patient sends "Hi" again later, flow restarts fresh from step 1.

**SC-3. New patient sends invalid input during registration**
1. Patient sends "Hi", consents, system asks for name.
2. Patient sends a number (e.g. "9876543210") instead of a name.
3. System responds: "Please enter your name (letters only)." — re-prompts the same step.
4. After 3 invalid attempts on the same field, system sends: "Having trouble? Please call us at [clinic phone] to book." and ends the flow gracefully.
5. No partial record created. Slot not reserved at this stage.

**SC-4. New patient tries to book but clinic has no slots available today**
1. Patient sends "Hi", completes registration.
2. System checks slots — none available today.
3. System automatically presents next 2 days with available slots as List Message: "No slots today. Here are the nearest available times."
4. Patient selects a future slot. Flow completes normally (SC-1 from step 7).
5. If no slots are available in the next 7 days either: system responds "No appointments available right now. Please call us at [clinic phone]." and ends the flow.

**SC-5. New patient books when clinic is closed (after-hours or holiday)**
1. Patient sends "Hi" outside configured working hours (e.g. 11 PM).
2. System responds: "Hi! We are currently closed. Our timings are Mon–Sat, 10 AM–7 PM. We'll show you slots for tomorrow — would you like to continue? Reply YES."
3. Patient replies YES. Registration continues (if new) and slots for the next available working day are shown.
4. Appointment is created for the future date. Confirmation sent immediately.

---

#### Category B — Returning Patient via WhatsApp

**SC-6. Returning patient books again — fast-track recognised flow**
1. Patient sends "Hi" to clinic WhatsApp. Phone number matches existing Patient record.
2. System responds: "Welcome back, Rahul! Book another appointment?" with Quick Reply: "Yes, book now / No, thanks".
3. Patient taps "Yes, book now". System presents available slots immediately — no re-registration.
4. Patient selects slot. Confirmation sent. New Appointment linked to existing Patient record.
5. Visit history updated. Token assigned sequentially.

**SC-7. Returning patient tries to book the same day they already have a confirmed appointment**
1. Returning patient sends "Hi". System recognises them.
2. System checks: patient already has a `confirmed` Appointment today at this Clinic.
3. System responds: "You already have an appointment today at 3:30 PM with Dr. Sharma (Token #4). Would you like to book for another day?" with Quick Reply: "Book for another day / Cancel existing / View my appointment".
4. If "Book for another day": slot selection shows only future dates.
5. If "Cancel existing": FR-6 cancellation flow triggers for the existing Appointment, then slot selection shown.
6. If "View my appointment": system re-sends the confirmation message for the existing Appointment.

**SC-8. Returning patient whose previous visit was marked no-show**
1. Patient recognised from phone number. Prior Appointment status: `no-show`.
2. No special treatment — returning patient fast-track applies (SC-6). No-show history is visible to clinic staff in patient profile, not surfaced to the patient.

**SC-9. Returning patient books via Web Booking Link (phone number matches)**
1. Patient opens `cliniqly.com/book/smile-dental`. Enters phone number during booking.
2. System matches phone number to existing Patient record.
3. Appointment created under existing Patient record — no duplicate created.
4. WhatsApp confirmation sent. Visit history updated with new Appointment.

---

#### Category C — Web Booking Link Scenarios

**SC-10. New patient books via Web Booking Link — not on WhatsApp**
1. Patient opens web booking link on mobile browser.
2. Selects slot, enters name and phone number (phone not on WhatsApp).
3. Appointment confirmed on screen: "Booking confirmed! Token #7, Dr. Patel, 11 AM tomorrow."
4. WhatsApp message delivery fails. System detects failure within 5 minutes.
5. SMS fallback fires via MSG91: "Appointment confirmed. Token 7, Dr Patel, 11am 8 June. ABC Clinic 42 MG Road. Reply CANCEL to cancel."
6. All subsequent Reminders for this Patient also use SMS (WhatsApp delivery will be re-attempted each time; SMS fires on failure).

**SC-11. Slot taken between patient browsing and confirming on web**
1. Patient opens web booking link, sees 11 AM slot as available.
2. While patient is on the page, another patient (WhatsApp flow) books the 11 AM slot.
3. Patient submits booking for 11 AM.
4. System detects slot is now `booked`. Responds immediately: "That slot was just taken. Here are the next available slots:" — re-presents updated availability without losing the patient's name and phone.
5. Patient selects an alternative. Booking completes normally.

**SC-12. Patient opens Web Booking Link for a clinic with no available slots**
1. Patient opens the booking page. No slots available for the next 7 days (fully booked or no configured schedule).
2. Page shows: "No slots available at this time. Please contact the clinic directly." with clinic phone number displayed.
3. No booking form is presented.

---

#### Category D — Cancellation Scenarios

**SC-13. Patient cancels via 24-hour reminder**
1. 24 hours before appointment, system sends WhatsApp Reminder with "Cancel appointment" Quick Reply.
2. Patient taps "Cancel appointment".
3. System sends: "Your appointment on [date] at [time] has been cancelled. We hope to see you soon!"
4. Appointment status → `cancelled`. Slot → `available`. Token released.
5. Receptionist sees cancellation in real time on calendar. Slot becomes bookable.

**SC-14. Patient cancels via 2-hour reminder**
1. 2 hours before appointment, system sends Reminder: "...Reply CANCEL to cancel."
2. Patient replies "cancel" (lowercase).
3. System treats as cancellation (case-insensitive match). Same outcome as SC-13.

**SC-15. Patient tries to cancel after appointment time has passed**
1. Patient replies "CANCEL" to an old message after the appointment time.
2. System checks Appointment time — it is in the past. Status is already `completed` or `no-show`.
3. System responds: "This appointment has already passed. If you need help, please contact the clinic."
4. No status change. No action taken.

**SC-16. Receptionist cancels appointment on behalf of patient (e.g. patient called the clinic)**
1. Receptionist opens appointment in dashboard, taps Cancel.
2. System asks: "Send WhatsApp cancellation notice to patient?" with Yes / No.
3. If Yes: cancellation acknowledgment WhatsApp sent to patient. Appointment → `cancelled`. Slot → `available`.
4. If No: appointment cancelled silently. No WhatsApp sent. Modification logged.

**SC-17. Patient cancels via WhatsApp after receptionist already cancelled in portal**
1. Receptionist cancelled appointment at 9 AM. Status: `cancelled`.
2. Patient sends "CANCEL" at 9:05 AM in response to a reminder.
3. System detects Appointment already `cancelled`. Responds: "Your appointment is already cancelled. Book a new appointment anytime by messaging us."
4. No duplicate action. No error.

---

#### Category E — Walk-in and Manual Entry Scenarios

**SC-18. Walk-in new patient, slots available**
1. Patient walks in without prior booking. Receptionist taps "New Walk-in".
2. Enters patient name and phone. System checks — no existing record. New Patient record created.
3. Receptionist selects Doctor and next available slot. Token assigned (e.g. Token #12, next in queue).
4. WhatsApp confirmation sent to patient immediately: "Welcome! Token #12. Dr. Kumar is ready to see you shortly."
5. Appointment appears in calendar with source tag "Walk-in".

**SC-19. Walk-in returning patient**
1. Patient walks in. Receptionist enters phone number in "New Walk-in" form.
2. System matches phone — existing Patient. Name auto-fills. Last visit date shown inline.
3. Receptionist confirms patient details, selects slot, assigns Token.
4. New Appointment linked to existing Patient record. Visit history updated.

**SC-20. Walk-in when no slots remain for the day**
1. Receptionist tries to register walk-in. All slots for all Doctors today are `booked` or `blocked`.
2. System shows warning: "No slots available today for any doctor. Override to add walk-in anyway?"
3. Receptionist taps Override (emergency). Appointment created with source "Walk-in (overflow)". Token assigned as next sequential.
4. This Appointment does not occupy a formal Slot; it is a freeform registration.
5. Confirmation WhatsApp sent to patient. Appears in calendar with visual "overflow" indicator.

**SC-21. Receptionist reschedules an existing appointment**
1. Patient calls to reschedule from Thursday 4 PM to Friday 11 AM.
2. Receptionist opens appointment in dashboard, taps Reschedule.
3. Calendar picker shown — Receptionist selects Friday 11 AM (slot is `available`).
4. System updates Appointment: new Slot assigned, old Slot released to `available`.
5. WhatsApp confirmation sent to patient: "Your appointment has been rescheduled to Friday 8 June at 11:00 AM, Dr. Sharma. Token number will be updated on the day."
6. Reminders re-scheduled based on new date/time.

**SC-22. Receptionist manually enters an appointment from a phone call**
1. Patient calls the clinic and verbally books with receptionist.
2. Receptionist taps "New Appointment" in dashboard, selects Patient (or creates new), picks Doctor and Slot.
3. Appointment created with source "Manual". Token assigned.
4. Receptionist optionally sends WhatsApp confirmation: "Send confirmation to patient?" Yes / No.

---

#### Category F — No-show and Post-Visit Scenarios

**SC-23. Patient does not attend — marked as no-show**
1. Patient had `confirmed` Appointment at 2 PM. It is now 2:30 PM and patient has not arrived.
2. Receptionist opens appointment, taps "Mark as No-show".
3. Appointment status → `no-show`. No WhatsApp sent to patient (no-show notification is not automated in MVP). [ASSUMPTION: No automated "you missed your appointment" message in MVP — avoid patient friction; revisit in Phase 1.]
4. No-show count on Dashboard increments. Slot is logged as `no-show` for analytics.

**SC-24. Doctor adds a visit note after consultation**
1. Patient's appointment is marked `completed` by Receptionist.
2. Doctor opens patient profile from their appointment list.
3. Taps "Add visit note" on the completed appointment. Types up to 500 characters (plain text): e.g., "Patient presented with mild gingivitis. Advised scaling. Follow-up in 3 months."
4. Note saved and visible to Clinic Owner and Doctor on this patient's profile. Not visible to Receptionist.
5. Note is not sent to patient (no automated communication triggered).

**SC-25. Receptionist marks appointment as completed and records payment**
1. Patient consultation is done. Receptionist opens appointment.
2. Taps "Mark Completed". System changes status to `completed`.
3. Receptionist enters consultation fee: ₹500. Taps "Mark Paid".
4. Payment status → `paid`. Daily revenue on Dashboard updates: +₹500 within 3 seconds.
5. If payment was cash/UPI outside the platform: fee is just recorded for tracking — no payment processing happens in MVP.

**SC-26. Receptionist records appointment as unpaid (patient will pay later)**
1. Consultation done. Receptionist marks appointment `completed` but does not mark paid.
2. Payment status → `unpaid`. Appointment appears in "Pending collection" count on Dashboard.
3. Later in the day when patient pays, Receptionist opens the appointment and taps "Mark Paid". Revenue counter updates.

---

#### Category G — Reminder and Communication Failure Scenarios

**SC-27. WhatsApp delivery fails — SMS fallback triggered**
1. System attempts to send 24-hour Reminder to patient via WhatsApp.
2. Meta Cloud API returns delivery failure (patient deleted WhatsApp, number inactive, etc.).
3. System logs failure against the Appointment. Triggers MSG91 SMS within 5 minutes.
4. SMS content: "Reminder: Appointment tomorrow at 3:30 PM, Dr. Sharma, ABC Clinic. Reply CANCEL to cancel."
5. SMS delivery status logged. If SMS also fails, failure is logged — no further retry in MVP.

**SC-28. Patient opts out of WhatsApp messages**
1. Patient replies "STOP" to any WhatsApp message from the clinic number.
2. System logs opt-out for this patient's phone number within 1 hour.
3. All future WhatsApp automated messages to this number are suppressed.
4. SMS fallback is also suppressed (opt-out applies to all automated channels in MVP). [ASSUMPTION: Opting out of WhatsApp stops all automated messages — clinic must contact manually if needed.]
5. Clinic staff see an "Opted out" indicator on the patient's profile.
6. Patient can re-opt-in by sending "START" — system resumes normal messaging.

**SC-29. Backend restarts mid-WhatsApp conversation**
1. Patient has sent "Hi" and is midway through slot selection. Redis holds conversation state at step: "awaiting slot selection".
2. Backend pod restarts (deployment, crash).
3. Redis state survives (AOF persistence, FR-6b).
4. Patient's next message arrives. Backend reads Redis state, resumes from "awaiting slot selection" step.
5. Patient experiences no disruption — conversation continues normally.
6. If Redis also fails (unlikely): conversation state is lost. Patient's next message triggers a fresh "Hi" → system restarts flow from beginning. No data corruption. No Appointment created from the failed state.

---

#### Category H — Capacity and Plan Limit Scenarios

**SC-30. Two patients simultaneously book the same slot (race condition)**
1. Patient A (WhatsApp flow) and Patient B (web booking) both select 11 AM with Dr. Patel at the same second.
2. Database write with optimistic locking: first write succeeds, second detects conflict.
3. Patient A's booking succeeds: confirmation sent, Token assigned, slot → `booked`.
4. Patient B receives: "That slot was just taken. Here are the next available slots:" — re-presents alternatives.
5. No double-booking. No data inconsistency. Both patients informed within 3 seconds.

**SC-31. Starter plan clinic reaches 500 appointment limit mid-month**
1. Clinic on Starter plan hits 450 appointments. System sends WhatsApp alert to Clinic Owner: "You've used 90% of your monthly appointment limit (450/500). Upgrade to Growth for unlimited appointments."
2. Clinic reaches 500 appointments. Subsequent inbound WhatsApp booking attempts respond: "We are unable to accept online bookings at this time. Please call us at [clinic phone] to schedule your appointment."
3. Web Booking Link shows: "Online booking is temporarily unavailable. Please call the clinic directly."
4. Manual appointment entry in the portal is not restricted — Receptionist can still create appointments directly (walk-ins, phone calls) with a banner warning: "Monthly limit reached. New bookings are paused until you upgrade or the month resets."
5. On upgrade to Growth plan: limit lifted immediately. WhatsApp and web booking resume.

**SC-32. Clinic's monthly WhatsApp message allowance exhausted (Starter: 200 messages)**
1. Clinic has sent 180 WhatsApp messages this month. Clinic Owner receives alert at 90%.
2. At 200 messages, automated WhatsApp reminders are paused. Booking confirmations continue to send (confirmations are prioritised over reminders within the allowance). [ASSUMPTION: Confirmations have higher priority than reminders when message budget is tight.]
3. Clinic Owner receives WhatsApp: "Your WhatsApp message limit is reached. Reminders are paused. Upgrade or purchase a top-up pack (₹499/1,000 messages)."
4. On upgrade or top-up purchase: reminders resume immediately. Any reminders missed during the pause are not retroactively sent.

---

#### Category I — Clinic Onboarding and Setup Scenarios

**SC-33. New clinic owner completes first-time setup**
1. Clinic Owner signs up with phone number. OTP delivered via SMS. Verified and logged in.
2. Guided setup wizard opens. Progress: 0/4 steps.
3. Step 1 — Clinic details: enters name "Smile Dental Clinic", address, speciality (Dentistry). Saved.
4. Step 2 — Add doctor: enters own name "Dr. Ravi Sharma", phone, speciality. Role: Doctor + Owner. Saved.
5. Step 3 — Working hours: Mon–Sat, 10 AM–7 PM, 20-minute slots, lunch block 1–2 PM. Saved.
6. Step 4 — Connect WhatsApp: prompted to enter WhatsApp Business phone number. Guided to Meta Business Manager to register number and authorise Cliniqly. [ASSUMPTION: Onboarding wizard includes step-by-step screenshots/video for Meta setup as this is non-trivial for non-technical clinic owners.]
7. Wizard complete. Sample Appointment auto-created (labelled "Sample — not real"). Clinic Owner lands on Dashboard.
8. Web Booking Link is immediately active: `cliniqly.com/book/smile-dental-clinic`.

**SC-34. Clinic owner skips WhatsApp setup step and completes later**
1. Clinic Owner completes steps 1–3 of wizard but is unable to complete WhatsApp setup.
2. Taps "Skip for now". Platform is accessible. WhatsApp Booking Flow is inactive (no WhatsApp number connected).
3. Web Booking Link is active (does not require WhatsApp to be configured).
4. Dashboard shows a persistent banner: "WhatsApp booking is not active. Complete setup to start receiving bookings." with a "Complete setup" link.
5. Clinic Owner completes WhatsApp setup 2 days later via Settings. WhatsApp flow activates immediately.

**SC-35. Clinic owner invites a receptionist**
1. Clinic Owner goes to Settings → Team → Invite Staff.
2. Enters receptionist's phone number, selects role: Receptionist.
3. System sends WhatsApp to the receptionist's number: "You've been invited to join Smile Dental Clinic on Cliniqly. Tap here to set up your access: [link]. Expires in 7 days."
4. Receptionist opens link, enters OTP, lands on dashboard with Receptionist role.
5. Receptionist sees all appointments and patients for the Clinic but cannot access Billing or Settings.

**SC-36. Invited staff member does not accept within 7 days**
1. Clinic Owner sent invite on Day 1. Staff member did not click the link.
2. On Day 8, invite link expires. If staff member clicks, they see: "This invitation has expired. Ask your clinic owner to resend."
3. Clinic Owner can resend the invite from Settings → Team.

---

#### Category J — Multi-role Access Scenarios

**SC-37. Doctor tries to access another doctor's patients**
1. Dr. Priya (Doctor role) is logged in. She navigates to a patient profile that belongs exclusively to Dr. Kumar's appointments.
2. System checks: patient has never had an appointment with Dr. Priya.
3. Access denied. HTTP 403. Patient profile not shown. [ASSUMPTION: A patient who has visited both doctors is visible to both — shared patient access within the same Clinic.]

**SC-38. Receptionist tries to access billing / revenue screen**
1. Receptionist is logged in and navigates to Billing / Revenue section.
2. System checks role: Receptionist. Access denied. HTTP 403. Billing screen not rendered.
3. Receptionist sees: "You don't have permission to view this section."

**SC-39. Session expires — staff member's 30-day session times out**
1. Receptionist last logged in 31 days ago. Opens Cliniqly on her phone.
2. Session token is expired. System redirects to login screen.
3. Receptionist enters phone number, receives OTP, logs in. New 30-day session started.
4. No data loss. Calendar and patient list are exactly as left.

---

#### Category K — Plan and Trial Scenarios

**SC-40. Clinic trial expires — soft paywall activates**
1. Clinic has been on 14-day free trial. Day 13: Clinic Owner receives WhatsApp from Cliniqly: "Your trial ends tomorrow! Switch to an annual plan today with 20% off: [link]."
2. Day 15 (no conversion): soft paywall activates. Clinic Owner and staff log in to read-only mode.
3. New WhatsApp bookings: patients receive "Online booking is temporarily unavailable. Please call [clinic phone]."
4. Web Booking Link shows: "Booking unavailable. Please contact the clinic directly."
5. Existing patient records, appointments, and history remain fully accessible in read-only mode.
6. Clinic Owner subscribes to Starter ₹999/month. Paywall lifts immediately. All booking channels reactivate.

**SC-41. Clinic upgrades mid-month from Starter to Growth**
1. Clinic Owner upgrades on Day 15 of the month.
2. Doctor limit increases from 1 to 3 immediately — Owner can now invite 2 more doctors.
3. WhatsApp message allowance increases from 200 to 1,000 for the remainder of the month. Paused reminders (if any) resume.
4. Appointment limit removed (Growth: unlimited).
5. Prorated billing handled by payment processor (Phase 1) — in MVP, manual upgrade via Cliniqly support.

---

#### Category L — Reports and Exports

**SC-42. Clinic Owner exports today's daily appointment list as PDF**
1. Clinic Owner opens Reports → Daily Appointment List. Default date is today.
2. Report loads on screen: 18 appointments listed with Token, Patient name, Doctor, time, status, fee, payment status.
3. Clinic Owner taps "Download PDF". PDF generated within 5 seconds.
4. PDF opens in browser: A4-formatted, clinic name "ABC Dental Clinic" and date "8 June 2026" in header. All 18 rows legible.
5. Clinic Owner prints it as a reference sheet for the front desk.

**SC-43. Receptionist views daily appointment list — fee columns hidden**
1. Receptionist opens Reports → Daily Appointment List for today.
2. Report loads: Token, Patient name, Doctor, time, booking source, status visible.
3. Fee amount and payment status columns are absent — not visible to Receptionist role.
4. Receptionist can export to PDF (fee columns absent in export too) or CSV.
5. Attempting to access any other report type returns "You don't have permission to view this report."

**SC-44. Doctor exports their own patient visit history — cannot access another doctor's patient**
1. Dr. Priya opens Reports → Patient Visit History.
2. Searches for patient "Ravi Kumar" — this patient has visited both Dr. Priya and Dr. Sharma.
3. Dr. Priya sees Ravi Kumar in search results (shared patient). Opens profile. Full visit history shown — but only visits with Dr. Priya have visit notes editable; Dr. Sharma's visits are shown as read-only entries.
4. Dr. Priya exports as PDF: includes all Ravi's visits at the clinic (all doctors visible for patient context). [ASSUMPTION: Full visit history shown in patient export regardless of doctor — patient's record belongs to the Clinic, not the individual doctor. Confirm if only own-visit rows should appear.]
5. Dr. Priya searches for a patient who has only visited Dr. Sharma and never Dr. Priya.
6. Search returns no result for Dr. Priya — patient not in her accessible scope. Access denied gracefully: "No patients found."

**SC-45. Clinic Owner reviews monthly revenue report and exports for accountant**
1. Clinic Owner opens Reports → Monthly Revenue Summary. Default: current month (June 2026).
2. Screen shows bar chart: daily revenue bars for June 1–8. Summary table: Total Paid ₹1,24,500 / Total Unpaid ₹8,200 / Total Appointments 87.
3. Revenue by Doctor table: Dr. Sharma ₹74,500 (52 appts) / Dr. Patel ₹50,000 (35 appts).
4. Clinic Owner taps "Download CSV". CSV downloads with columns: Date, Appointments, Paid Amount (₹), Unpaid Amount (₹), Doctor.
5. Clinic Owner emails CSV to their CA for GST filing.
6. Clinic Owner also taps "Download PDF" — gets a formatted summary with bar chart and table on one A4 page.

**SC-46. Clinic Owner analyses no-show report to identify problem channel**
1. Clinic Owner opens Reports → No-show & Attendance. Selects "This Month".
2. Report shows: 87 appointments, 78 completed, 2 cancelled, 7 no-shows (8% no-show rate).
3. Breakdown by booking source:
   - WhatsApp bookings: 45 appointments, 5 no-shows (11.1%)
   - Web bookings: 22 appointments, 1 no-show (4.5%)
   - Walk-in: 12 appointments, 1 no-show (8.3%)
   - Manual: 8 appointments, 0 no-shows
4. Clinic Owner sees WhatsApp bookings have the highest no-show rate — decides to verify the 2-hour reminder is enabled. Opens Settings → Reminders. Confirms 2-hour reminder is on.
5. Exports as PDF to share with Dr. Sharma in their weekly review.

**SC-47. Clinic Owner views doctor-wise report to assess performance**
1. Clinic Owner opens Reports → Doctor-wise Report. Selects "This Month".
2. Report shows per doctor:

   | Doctor | Appointments | Completed | No-shows | Revenue Collected | Avg Fee |
   |---|---|---|---|---|---|
   | Dr. Sharma | 52 | 47 | 5 | ₹74,500 | ₹1,585 |
   | Dr. Patel | 35 | 31 | 2 | ₹50,000 | ₹1,613 |

3. Clinic Owner sorts by Revenue Collected. Downloads CSV.
4. Doctor role: Dr. Sharma opens Reports → Doctor-wise Report. Sees only his own row — Dr. Patel's data is absent. No HTTP error; report simply shows single-doctor view.

**SC-48. Clinic Owner tracks patient growth using new vs returning trend**
1. Clinic Owner opens Reports → New vs Returning Patient Trend. Selects "Last 3 Months".
2. Screen shows grouped bar chart — weekly bars for April, May, June:
   - New patients per week: ranging 8–15
   - Returning patients per week: ranging 22–31
3. Summary: Total unique patients: 156. New: 48 (31%). Returning: 108 (69%). Return rate: 69%.
4. Clinic Owner notices new patient count dipped in the second week of May — correlates with a week they were closed for renovation. Makes a note.
5. Downloads CSV: columns Date (week starting), New Patients, Returning Patients, Total.
6. Downloads PDF: chart + summary table on one page.

**SC-49. Report for a date range with no data**
1. Clinic Owner opens Reports → Monthly Revenue Summary. Selects March 2026 (before the clinic was onboarded).
2. Report loads: bar chart is empty. Summary table shows ₹0 across all fields.
3. Empty state message: "No appointment data for March 2026. The clinic was active from May 2026."
4. Download buttons remain visible — CSV download produces a file with headers and zero data rows (not an error). PDF shows the empty state message.

**SC-50. Report generation slow — large date range**
1. Clinic Owner selects Custom date range: 1 January 2026 to 31 December 2026 (12 months — maximum allowed).
2. Report triggers a heavier query. Loading spinner shown. Report renders within 8 seconds (NFR).
3. If query takes longer than 8 seconds (unexpected load): system shows "This is taking longer than expected. We'll notify you when it's ready." and sends a WhatsApp message to the Clinic Owner when the report is available.
4. Selecting a date range beyond 12 months: system shows "Please select a range of up to 12 months" and does not submit the query.

---

*Scenarios reference the following FRs: FR-1 (SC-1–5), FR-2 (SC-6, SC-9), FR-3 (SC-1–3), FR-4 (SC-1, SC-4), FR-5 (SC-1, SC-6, SC-30), FR-6 (SC-13–17), FR-6b (SC-29), FR-7–9 (SC-9–12), FR-10–12 (SC-18–22), FR-13–16 (SC-4, SC-20), FR-17–20 (SC-1, SC-6, SC-9, SC-19), FR-21–25 (SC-10, SC-13–14, SC-27–28), FR-26–30 (SC-25–26), FR-31–32 (SC-25–26), FR-33 (SC-35–39, SC-37, SC-38), FR-34 (SC-39), FR-35 (SC-35), FR-36–37 (SC-33–34), FR-38–45b (SC-42–50), FR-18 (SC-24), MON-1–3 (SC-31–32, SC-40–41).*

---

## 3. Glossary

- **Clinic** — The business entity: a doctor's practice registered as a Tenant on Cliniqly. Has one or more Doctors and zero or more Receptionists.
- **Clinic Owner** — The Doctor or administrator who created the Clinic account and holds full administrative access.
- **Doctor** — A licensed medical practitioner associated with a Clinic. Has their own Slot schedule.
- **Receptionist** — A Clinic staff member with access to Appointments and Patients but not billing reports or Clinic Settings.
- **Patient** — A person who has booked or attended at least one Appointment at a Clinic. Identified by mobile phone number within a Clinic's Tenant scope.
- **Appointment** — A scheduled consultation between a Patient and a Doctor, occupying one Slot. Status values: `pending`, `confirmed`, `completed`, `cancelled`, `no-show`.
- **Token** — A sequential queue number assigned to a Patient for a given day at a given Clinic. Resets daily at midnight IST.
- **Slot** — A discrete available time block on a Doctor's calendar, defined by start time and duration. Status values: `available`, `booked`, `blocked`.
- **Walk-in** — A Patient who arrives at the Clinic without a prior Appointment and is registered manually by a Receptionist.
- **WhatsApp Booking Flow** — The automated multi-turn conversation initiated when a Patient sends any message to the Clinic's WhatsApp Business number, resulting in a confirmed Appointment.
- **Web Booking Link** — A unique, publicly accessible URL per Clinic (format: `cliniqly.com/book/{clinic-slug}`) that allows Patients to browse available Slots and book an Appointment via a mobile browser without an account.
- **Meta Cloud API** — Meta's official WhatsApp Business Cloud API, used directly by Cliniqly without a third-party BSP intermediary. Requires a verified Meta Business Account, a registered WhatsApp Business phone number, and pre-approved message templates.
- **Tenant** — A Clinic account; the fundamental unit of data isolation in Cliniqly's multi-tenant architecture.
- **Reminder** — An automated WhatsApp (or SMS fallback) message sent to a Patient before their Appointment. Two Reminder types in MVP: 24-hour and 2-hour. Distinct from a Booking Confirmation (sent at the moment of booking) and a Cancellation Acknowledgment (sent when an Appointment is cancelled).
- **No-show** — An Appointment that was `confirmed` but whose Patient did not attend; marked manually by a Receptionist or Doctor.
- **Dashboard** — The Clinic Owner's and Receptionist's primary screen, showing today's Appointment counts, revenue, and patient breakdown.

---

## 4. Features

### 4.1 WhatsApp Appointment Booking

**Description:** The core patient-facing booking experience. A Patient sends any message to the Clinic's WhatsApp Business number and enters an automated conversation managed by Cliniqly via the BSP. The flow collects patient identity (new or returning), presents available Slots as a WhatsApp List Message, and confirms the Appointment — within 60 seconds, without the Patient leaving WhatsApp. The Clinic does not need to take any action; the booking appears in their calendar automatically. Cliniqly connects to Meta's WhatsApp Cloud API directly (no BSP intermediary). Realizes UJ-1 (automation leg), UJ-2 (entry leg). [ASSUMPTION: Patients in the target market are comfortable with a guided WhatsApp conversation for appointment booking, given 95%+ WhatsApp usage in urban and semi-urban India.]

**Functional Requirements:**

#### FR-1: Inbound message triggers booking flow
When a Patient sends any message to the Clinic's WhatsApp Business number, the system initiates the WhatsApp Booking Flow within 3 seconds of message receipt.

**Consequences (testable):**
- System responds within 3 seconds at p95 under normal operating load.
- The flow initiates regardless of message content ("Hi", "Hello", any text or emoji).
- If a WhatsApp Booking Flow is already in progress for this Patient's phone number, the system resumes the existing flow rather than restarting it.
- If the Clinic's Slot limit for the current plan has been reached, the flow responds with a "fully booked" message rather than presenting Slots.

#### FR-2: Patient identity resolution
The system checks whether the inbound phone number matches an existing Patient record in the Clinic's database before presenting any options.

**Consequences (testable):**
- Returning Patient: system greets by first name and skips the registration step — proceeds directly to Slot selection.
- New Patient: system requests name, age, and gender via Quick Reply buttons before showing Slots.
- Phone number lookup is scoped to the Clinic's Tenant only; the same number may exist as separate Patient records in different Clinics.

#### FR-3: New patient registration via WhatsApp
During the WhatsApp Booking Flow, a new Patient provides name, age, and gender via WhatsApp Quick Reply and List Message interactions before Slot selection.

**Consequences (testable):**
- All three fields (name, age, gender) must be provided before Slot selection is presented.
- A Patient record is created in the Clinic's database upon flow completion.
- If the Patient abandons the flow before completing registration, no Patient record is created and the partial conversation state is cleared after 30 minutes.
- Patient name accepts Unicode characters including Devanagari script. Input that contains only digits or special characters is rejected with a re-prompt; ASCII is not required.

#### FR-4: Slot selection via WhatsApp List Message
The system presents available Slots as a WhatsApp List Message showing up to 5 Slots across the current day and the next 2 available days.

**Consequences (testable):**
- Only Slots with status `available` for the relevant Doctor(s) are shown.
- If the Clinic has multiple Doctors, Slots are labelled with the Doctor's name.
- If no Slots are available today, the system automatically presents the next 2 days without an additional prompt.
- Once a Patient selects a Slot, it is reserved for 5 minutes pending confirmation; if the flow does not complete, the Slot is released.

#### FR-5: Appointment confirmation and Token assignment
On Slot selection, the system creates the Appointment with status `confirmed`, assigns the next sequential Token for the day, and sends a confirmation WhatsApp message.

**Consequences (testable):**
- Confirmation message contains: Patient name, Doctor name, date, time, Token number, Clinic name and address.
- Token is a sequential integer scoped per Clinic per day, resetting at 1 each day at midnight IST. Tokens are shared across all Doctors within a Clinic — a patient in a 3-doctor clinic receives Token #12 regardless of which Doctor they are seeing.
- Appointment appears in the Clinic's calendar within 5 seconds of Patient confirmation.
- No double-booking: if two Patients confirm the same Slot simultaneously, exactly one succeeds; the other receives a "Slot just taken" message with alternatives.

#### FR-6: Patient-initiated cancellation via WhatsApp
A Patient can cancel their Appointment by replying "CANCEL" (case-insensitive) to any automated message related to that Appointment.

**Consequences (testable):**
- Cancellation acknowledgment WhatsApp message sent within 3 seconds.
- Appointment status changes to `cancelled`.
- The Slot returns to `available` status and becomes bookable.
- Clinic Receptionist sees the cancellation reflected in the calendar in real time.

#### FR-6b: WhatsApp conversation state durability
The system maintains each Patient's in-progress WhatsApp Booking Flow state durably so that a backend restart or pod failure does not lose a conversation mid-flow.

**Consequences (testable):**
- Conversation state (current step, collected fields, reserved Slot) survives a backend service restart.
- If the system restarts mid-flow, the Patient's next message resumes from the last completed step rather than restarting from "Hi".
- Conversation state is scoped per Patient phone number per Clinic and expires after 30 minutes of inactivity (FR-3).

**Out of Scope (MVP):** Patient-initiated rescheduling via WhatsApp — deferred to Phase 1. [NOTE FOR PM: High request item from pilot clinics; fast-follow if pilot data confirms.]

---

### 4.2 Web Booking Link

**Description:** Every Clinic receives a unique, publicly shareable URL (`cliniqly.com/book/{clinic-slug}`) active from signup day. Any Patient opens it on a mobile browser, views available Slots, and confirms a booking — no app download, no account required. A WhatsApp confirmation is sent after booking. The link is shareable on WhatsApp, Instagram bio, Google Business Profile, and visiting cards. Realizes UJ-2. [ASSUMPTION: `cliniqly.com` domain is secured; clinic-slug is auto-derived from Clinic name and made unique at signup.]

**Functional Requirements:**

#### FR-7: Unique web booking URL per Clinic
Each Clinic has a publicly accessible booking page at `cliniqly.com/book/{clinic-slug}` active from the day of signup.

**Consequences (testable):**
- Clinic-slug is auto-generated from Clinic name at signup and can be customised once by the Clinic Owner.
- Page loads in under 3 seconds on a 4G connection (Lighthouse mobile simulation, India network profile).
- Page is accessible without login or account creation.
- Page is fully functional on iOS Safari 16+ and Android Chrome (latest).

#### FR-8: Slot browsing and booking via web
The web booking page shows Clinic name, available Doctors, and available Slots for the next 7 days. The Patient selects a Slot, enters name and mobile number, and confirms.

**Consequences (testable):**
- Only Slots with status `available` are shown.
- Slot availability is real-time; a Slot taken between page load and Patient confirmation triggers a "Slot just taken — pick another" message without losing the Patient's entered details.
- Patient must provide a valid 10-digit Indian mobile number before confirming. [ASSUMPTION: No OTP required at web booking for MVP — friction reduction is higher priority than phone verification at this stage; revisit at pilot review if fake bookings appear.]

#### FR-9: Post-web-booking WhatsApp confirmation
After a Patient books via the Web Booking Link, the system sends a WhatsApp confirmation message to the Patient's provided mobile number.

**Consequences (testable):**
- Confirmation message uses the same `apt_confirmation` template as FR-5.
- If WhatsApp delivery fails, SMS fallback via MSG91 is triggered automatically (same as FR-24).
- Appointment and Patient record creation follow identical logic to FR-5 and FR-3.

---

### 4.3 Manual Appointment Entry

**Description:** Receptionists create, modify, and cancel Appointments directly from the Cliniqly dashboard — covering walk-in Patients, phone bookings, and corrections. Realizes UJ-4. [ASSUMPTION: 30–40% of bookings at MVP pilot clinics will be walk-in or phone-initiated, declining as WhatsApp adoption grows.]

**Functional Requirements:**

#### FR-10: Receptionist creates a manual appointment
A logged-in Receptionist or Clinic Owner can create a new Appointment by specifying Patient (new or existing), Doctor, and Slot.

**Consequences (testable):**
- If the Patient phone number matches an existing record, the Patient's name auto-fills and visit history is shown inline.
- If the Patient is new, a Patient record is created with name and phone number as minimum required fields.
- The created Appointment appears immediately in the Appointment Calendar.
- A Token is assigned using the same daily sequential logic as FR-5.

#### FR-11: Walk-in registration
A Receptionist registers a Walk-in Patient by entering name and phone number, selecting a Doctor, and assigning the next available Slot or a specific Slot.

**Consequences (testable):**
- "Walk-in" booking source is recorded on the Appointment for analytics. Walk-in registrations that override a fully booked day are tagged with booking source "Walk-in (overflow)" as a distinct source value visible in reports.
- If no Slots remain today, the Receptionist is shown a warning and can override to register the Walk-in outside scheduled Slots. [ASSUMPTION: Clinic owners expect flexibility to accommodate emergency walk-ins beyond scheduled capacity.]
- WhatsApp confirmation is sent to the Walk-in Patient after registration.

#### FR-12: Appointment modification and cancellation by staff
A Receptionist or Clinic Owner can reschedule or cancel any Appointment from the dashboard.

**Consequences (testable):**
- Rescheduling changes the Appointment's Slot to a selected available Slot and resends a WhatsApp confirmation with the new time.
- Cancellation changes Appointment status to `cancelled` and sends a WhatsApp cancellation acknowledgment to the Patient.
- All modifications are logged with timestamp and the acting staff member's role.
- Modification log is accessible to the Clinic Owner in Settings → Activity Log. It is read-only and cannot be edited or deleted by any Clinic role.

---

### 4.4 Appointment Calendar and Slot Management

**Description:** The Clinic Owner configures working hours, slot duration, and per-Doctor schedules. The calendar gives Receptionists and Doctors a real-time day and week view of all Appointments. Realizes UJ-3, UJ-5.

**Functional Requirements:**

#### FR-13: Working hours and slot configuration
The Clinic Owner configures working days, start/end time, slot duration (15 / 20 / 30 / 60 minutes), and per-Doctor schedules in Clinic Settings.

**Consequences (testable):**
- Changes take effect for Slots on the next calendar day; existing confirmed Appointments are not affected. Intra-day slot structure is frozen at day-start and does not regenerate mid-day. Patients see updated slot availability only from the following day.
- Each Doctor can have an independent schedule (e.g., Dr. A: Mon/Wed/Fri; Dr. B: Tue/Thu/Sat).
- Lunch breaks and custom blocked periods can be added per Doctor per day.
- Slot availability shown to Patients in WhatsApp Booking Flow and Web Booking Link reflects the configured schedule in real time.

#### FR-14: Day and week calendar view
The dashboard provides a day view and a week view of Appointments, filterable by Doctor.

**Consequences (testable):**
- Day view shows all Appointments in chronological order with Patient name, Token, and status.
- Week view shows Appointment density per day per Doctor (count display, not detailed list).
- Tapping any Appointment opens its detail panel inline.
- Calendar updates in real time when new Appointments are created via any booking source.

#### FR-15: No double-booking enforcement
The system prevents two Appointments from occupying the same Slot for the same Doctor simultaneously.

**Consequences (testable):**
- Race condition (two concurrent bookings on the same Slot): exactly one succeeds; the other receives a "Slot just taken" message with alternatives.
- Manual entry into a booked Slot shows a warning and requires explicit confirmation to override.

#### FR-16: Slot blocking
A Receptionist or Clinic Owner can mark individual Slots or time ranges as blocked (lunch, emergency, CME, personal).

**Consequences (testable):**
- Blocked Slots do not appear as available in the WhatsApp Booking Flow or Web Booking Link.
- Blocked Slots are visually distinct in the calendar view.
- Blocking can be applied as a single occurrence or recurring (daily or weekly). [ASSUMPTION: Daily recurring covers the most common use case — daily lunch break.]

---

### 4.5 Patient Database

**Description:** Every Patient who books or is registered at a Clinic has a profile — name, phone, demographic details, and visit history. Scoped per Clinic (a Patient at Clinic A is not visible to Clinic B). Receptionists and Doctors can search by name or phone in under a second. Realizes UJ-1 (returning patient recognition), UJ-3 (patient detail access).

**Functional Requirements:**

#### FR-17: Patient profile
Each Patient has a profile containing: name, mobile number, date of birth (optional), gender (optional), and reason for first visit (optional).

**Consequences (testable):**
- Mobile number is the unique identifier per Patient within a Clinic's Tenant.
- Profile is created automatically via WhatsApp Booking Flow (FR-3) or manually by a Receptionist (FR-10).
- All fields except name and mobile number are optional at creation and can be completed later.

#### FR-18: Visit history
Each Patient's profile shows a chronological list of all Appointments at this Clinic: date, Doctor, status, and any visit note.

**Consequences (testable):**
- History is available from the day of the Patient's first booking.
- Appointments with status `completed`, `cancelled`, and `no-show` all appear in history.
- History is read-only for Receptionists; Doctors and Clinic Owners can add a plain-text visit note (500 characters maximum) to any `completed` Appointment. [ASSUMPTION: Full clinical notes — prescriptions, diagnoses — are out of MVP scope and carry additional regulatory requirements.]

#### FR-19: Patient search
Any logged-in staff member can search the Clinic's Patient database by name (partial match, 3+ characters) or mobile number (last 4 digits or full number).

**Consequences (testable):**
- Search results appear within 1 second for a Clinic with up to 5,000 Patient records.
- Search is scoped strictly to the logged-in staff member's Clinic Tenant; no cross-Tenant results are possible.

#### FR-20: Patient de-duplication
The system prevents duplicate Patient records for the same mobile number within a Clinic.

**Consequences (testable):**
- A new booking (WhatsApp or web) using a phone number already in the Clinic's database matches the existing Patient record rather than creating a new one.
- Manual entry of a duplicate phone number by a Receptionist surfaces the existing Patient and prompts confirmation before proceeding.

---

### 4.6 WhatsApp Automation

**Description:** The system automatically dispatches WhatsApp messages to Patients at configured intervals before their Appointment. No staff action is required. SMS via MSG91 is the fallback when WhatsApp delivery fails. Realizes UJ-1 (reminder scheduling leg). [ASSUMPTION: All WhatsApp message templates — `apt_confirmation`, `apt_reminder_24h`, `apt_reminder_2h`, `apt_cancellation` — are pre-approved via Meta's WhatsApp Manager before MVP pilot launch; typical approval time is 3–5 business days.]

**Functional Requirements:**

#### FR-21: Booking confirmation message
On Appointment creation from any source (WhatsApp Booking Flow, Web Booking Link, manual entry), the system sends a WhatsApp confirmation to the Patient.

**Consequences (testable):**
- Message is sent within 30 seconds of Appointment creation.
- Message contains: Patient name, Doctor name, date, time, Token number, Clinic name and address.
- Uses the pre-approved `apt_confirmation` template.
- If the Patient's number is not on WhatsApp, SMS fallback is triggered automatically within 5 minutes.

#### FR-22: 24-hour reminder
The system sends a WhatsApp reminder 24 hours before the Appointment time, for all Appointments with status `confirmed`.

**Consequences (testable):**
- Message includes a Quick Reply button labelled "Cancel appointment".
- If Patient taps "Cancel", FR-6 cancellation flow is triggered.
- Reminder is not sent if the Appointment was booked less than 24 hours before the scheduled time.
- Not sent for Appointments with status `cancelled` or `no-show`.

#### FR-23: 2-hour reminder
The system sends a WhatsApp reminder 2 hours before the Appointment time, for all Appointments with status `confirmed`.

**Consequences (testable):**
- Same delivery conditions as FR-22.
- Message includes plain-text instruction "Reply CANCEL to cancel".
- If Patient replies "CANCEL" (case-insensitive), FR-6 cancellation flow is triggered.
- Not sent if the Appointment was booked less than 2 hours before the scheduled time.

#### FR-24: SMS fallback
When a WhatsApp message fails to deliver, the system retries via SMS (MSG91) within 5 minutes.

**Consequences (testable):**
- SMS fallback applies to: confirmation (FR-21), 24-hour reminder (FR-22), 2-hour reminder (FR-23), and cancellation acknowledgment (FR-6).
- SMS content is a plain-text version of the corresponding WhatsApp template.
- Failed delivery attempts (both WhatsApp and SMS) are logged against the Appointment.

#### FR-25: Clinic-level reminder toggle
The Clinic Owner can enable or disable each Reminder type (24-hour, 2-hour) per Clinic in Settings.

**Consequences (testable):**
- Default state: both Reminder types enabled on Clinic creation.
- Changes apply to future Appointments only; already-scheduled Reminders are not retroactively affected.

---

### 4.7 Clinic Dashboard

**Description:** The primary screen for Clinic Owners and Receptionists. Real-time snapshot of today's operations and a weekly summary toggle. Designed for at-a-glance reading on a phone screen. Realizes UJ-3, UJ-5. [ASSUMPTION: Dashboard is the default landing screen after login for all roles.]

**Functional Requirements:**

#### FR-26: Today's appointment summary
The Dashboard displays: total Appointments today, completed count, no-show count, and remaining Appointments.

**Consequences (testable):**
- All counts update in real time as Appointment statuses change.
- "Remaining" = Appointments with status `confirmed` and a start time in the future for today.
- No-show count increments when a Receptionist or Doctor manually marks an Appointment as `no-show`.

#### FR-27: Patient breakdown
The Dashboard displays today's new vs. returning Patient count.

**Consequences (testable):**
- "New" = Patient's first-ever Appointment at this Clinic (any status).
- "Returning" = Patient with at least one prior Appointment at this Clinic.
- Counts are for today only and reset daily at midnight IST.

#### FR-28: Daily revenue total
The Dashboard displays today's total revenue: sum of consultation fees for Appointments with payment status `paid`.

**Consequences (testable):**
- Revenue figure updates in real time as payments are recorded (FR-31).
- Displayed in INR.
- Appointments with payment status `unpaid` contribute ₹0 to the revenue total and are shown as a separate "pending collection" count.

#### FR-29: Upcoming appointments feed
The Dashboard displays the next 5 upcoming Appointments in chronological order.

**Consequences (testable):**
- Each entry shows: Token, Patient name, Doctor name, time, and booking source (WhatsApp / Web / Walk-in / Manual).
- Tapping an entry navigates to the full Appointment detail.
- Feed updates in real time.

#### FR-30: Weekly summary view
The Dashboard provides a weekly toggle showing: total Appointments, completed, no-shows (with percentage), and total revenue for the current week (Monday–Sunday IST).

**Consequences (testable):**
- Accessible via a tab or toggle — does not replace the daily default view.
- No-show rate is displayed as both raw count and percentage.
- Revenue aggregates only paid Appointments for the week.

---

### 4.8 Basic Billing

**Description:** Lightweight payment tracking. Receptionists record consultation fees and mark Appointments as paid or unpaid. This provides the daily revenue metric on the Dashboard. Not a full accounting system. GST invoice generation, Razorpay UPI integration, and payment links sent via WhatsApp are Phase 1. Realizes UJ-5 (revenue visibility).

**Functional Requirements:**

#### FR-31: Record consultation fee and payment status
A Receptionist or Clinic Owner can record a consultation fee amount (INR) against any Appointment and set payment status to `paid` or `unpaid`.

**Consequences (testable):**
- Fee is a numeric field in INR; no validation against a price list (Clinic Owners set their own fees).
- A default fee can be configured per Doctor in Clinic Settings and auto-populates when recording payment.
- Payment status can be toggled between `paid` and `unpaid` at any time by a Receptionist or Clinic Owner.

#### FR-32: Daily revenue aggregation
The system aggregates total paid fees for the current day in real time.

**Consequences (testable):**
- Aggregation updates within 3 seconds of a payment status change.
- Revenue figure on Dashboard (FR-28) reflects only `paid` Appointments.

**Out of Scope (MVP):** GST invoice generation, Razorpay payment integration, payment links via WhatsApp, refund tracking. [NON-GOAL for MVP — Phase 1]

---

### 4.9 Multi-Role Access

**Description:** Three roles within a Clinic Tenant with scoped access. A Clinic Owner invites Doctors and Receptionists by phone number. All logins use phone OTP — no password to forget or share. Realizes UJ-1 (Receptionist), UJ-3 (Doctor), UJ-5 (Clinic Owner).

**Functional Requirements:**

#### FR-33: Role-based access control
The system enforces three roles — Clinic Owner, Doctor, Receptionist — with distinct access scopes.

**Consequences (testable):**

| Capability | Clinic Owner | Doctor | Receptionist |
|---|---|---|---|
| All Appointments (all Doctors) | Yes | Own only | Yes |
| Patient Database (all patients) | Yes | Own patients only | Yes |
| Billing records and revenue | Yes | No | No |
| Clinic Settings | Yes | No | No |
| Invite / remove staff | Yes | No | No |
| Add visit notes to Appointments | Yes | Yes (own) | No |
| View visit notes on Appointments | Yes | Yes (own appointments) | No |

- Attempting to access a restricted resource returns HTTP 403 and does not expose any restricted data in the response.
- See FR-44 for report-level access control and access-gating logic.

#### FR-34: Phone OTP login
All users log in via phone number and 6-digit OTP. No password is required.

**Consequences (testable):**
- OTP is 6 digits, valid for 10 minutes, delivered via SMS (primary) or WhatsApp (if SMS unavailable).
- Maximum 3 failed OTP attempts triggers a 15-minute lockout on that phone number.
- Sessions persist for 30 days on a trusted device; re-authentication is required on a new or unrecognised device. A device is "trusted" if a valid session token (stored as an HttpOnly cookie) has been issued and not revoked. Clearing browser cookies or using a different browser constitutes a new device.

#### FR-35: Staff invitation and management
The Clinic Owner invites Doctors and Receptionists by phone number. Invitees receive a WhatsApp setup link.

**Consequences (testable):**
- Doctor count is enforced per subscription plan (Starter: 1, Growth: 3, Pro: 10). Adding beyond the limit is blocked with an upgrade prompt.
- Invitations expire after 7 days if not accepted.
- Removing a staff member immediately revokes their session and access.

---

### 4.10 Clinic Onboarding

**Description:** A guided setup flow that takes a Clinic Owner from signup to their first live WhatsApp booking in under 30 minutes. Reduces dependency on human onboarding support calls. Realizes the Day 0 experience described in the business plan.

**Functional Requirements:**

#### FR-36: Guided setup wizard
On first login, the Clinic Owner is guided through: clinic details (name, address, speciality), adding at least one Doctor, configuring working hours and slot duration, and connecting their WhatsApp Business number via Meta Cloud API.

**Consequences (testable):**
- Wizard median completion time for Steps 1–3 (clinic details, add doctor, working hours) is < 30 minutes, measurable via SM-4 funnel data from pilot Clinics. Step 4 (WhatsApp Business number connection) completion time is excluded as it depends on Meta's external verification process.
- Each step is independently saveable; partial completion does not block access to the rest of the platform.
- Progress indicator shows steps remaining.
- All wizard text is available in English and Hindi (per NFR-12).
- Before completing the wizard, the Clinic Owner must explicitly accept Cliniqly's Terms of Service, Privacy Policy, and Data Processing Agreement (as data fiduciary under DPDP Act 2023). Acceptance is recorded with timestamp.
- If the Clinic Owner exits before completing Step 4 (WhatsApp setup), the platform remains accessible in 'WhatsApp pending' state — all features work except WhatsApp Booking Flow and automated Reminders. A persistent banner shows the incomplete step with a "Complete setup" link (SC-34).
- Step 4 displays current Meta verification status as a progress indicator: "Number registered → Templates submitted → Verified." If Meta registration fails, the specific error from the Meta API response is displayed with a "Retry" action.

#### FR-37: Sample appointment on signup
On completion of the setup wizard, the system auto-creates one sample Appointment in the calendar.

**Consequences (testable):**
- Sample Appointment is visually labelled "Sample" and does not trigger any WhatsApp or SMS messages.
- Clinic Owner can delete the sample Appointment at any time.

### 4.11 Reports and Exports

**Description:** Reports are in MVP because Clinic Owners who can see their no-show rate reductions and revenue trends convert at higher rates and churn less — they are the primary in-product evidence loop that Cliniqly is delivering ROI. Clinic Owners and Doctors can view, filter, print, and download six report types covering appointments, revenue, patient trends, no-shows, and doctor performance. Every report is available as an on-screen view, a PDF download (for printing or sharing), and a CSV download (for external tools like Excel or accountant software). All reports support date range filtering. Access is role-scoped: Clinic Owner sees all reports; Doctor sees own-patient reports only; Receptionist sees the Daily Appointment List only. Realizes UJ-5 (weekly performance review) and SC-42 through SC-48.

**Functional Requirements:**

#### FR-38: Daily Appointment Report
The Clinic Owner, Doctor, or Receptionist can view and export a list of all Appointments for any selected date.

**Consequences (testable):**
- Default date is today; user can select any past or future date.
- Report columns: Token, Patient name, Doctor name, time, booking source (WhatsApp / Web / Walk-in / Manual), status (`confirmed` / `completed` / `cancelled` / `no-show`), fee amount, payment status (paid / unpaid).
- Filterable by Doctor (Clinic Owner only; Doctor sees own appointments only).
- Filterable by status.
- Exportable as PDF (formatted, clinic name and date in header) and CSV.
- PDF is print-ready: fits on A4, legible at standard print size.
- Doctor role sees only their own appointments in this report.
- Receptionist can view and export this report but fee and payment columns are hidden.

#### FR-39: Patient Visit History Export
A Doctor or Clinic Owner can export the full visit history of any Patient as a PDF.

**Consequences (testable):**
- Report contains: Patient name, phone, DOB (if captured), gender (if captured), and a chronological list of all Appointments — date, Doctor, status, visit note (if any).
- PDF header includes Clinic name and generation date.
- Doctor can only export histories for patients who have had at least one Appointment with them.
- Clinic Owner can export any patient's history.
- Receptionist cannot export patient visit histories.
- Export button is accessible from the Patient profile page.

#### FR-40: Monthly Revenue Summary
The Clinic Owner can view and export a monthly revenue report.

**Consequences (testable):**
- Default period is the current calendar month; user can select any past month.
- Report shows: daily revenue totals (bar view on screen), total paid amount, total unpaid amount, total appointments, and revenue broken down per Doctor.
- On-screen view includes a simple bar chart (daily revenue) and a summary table.
- Exportable as PDF (summary table + chart) and CSV (daily breakdown rows).
- Receptionist and Doctor roles cannot access this report.

#### FR-41: No-show and Attendance Report
The Clinic Owner can view and export a no-show and attendance report for a selected date range.

**Consequences (testable):**
- Date range selector: Today / This Week / This Month / Custom (any start and end date).
- Report shows: total Appointments, completed count, cancelled count, no-show count, no-show rate (%), attendance rate (%).
- Breakdown by Doctor (each Doctor's individual no-show rate).
- Breakdown by booking source (WhatsApp vs Web vs Walk-in vs Manual) — shows which channel has the highest no-show rate.
- Exportable as PDF and CSV.
- Doctor role can view their own no-show stats only; cannot see other doctors' data.
- Receptionist cannot access this report.

#### FR-42: Doctor-wise Appointment Report
The Clinic Owner can view and export an appointment and revenue summary broken down per Doctor for a selected date range.

**Consequences (testable):**
- Date range selector: Today / This Week / This Month / Custom.
- Report shows per Doctor: total appointments, completed, cancelled, no-shows, revenue collected (paid), revenue pending (unpaid), and average fee per appointment.
- Sortable by any column.
- Exportable as PDF and CSV.
- Only Clinic Owner can access this report. Doctor and Receptionist roles cannot.

#### FR-43: New vs Returning Patient Trend Report
The Clinic Owner can view and export a patient trend report showing new and returning patient counts over time.

**Consequences (testable):**
- Date range selector: This Week / This Month / Last 3 Months / Custom.
- On-screen view shows a grouped bar chart: new patients vs returning patients per day (weekly view) or per week (monthly/3-month view).
- Summary totals: total unique patients seen, new patients count, returning patients count, return rate (%).
- Exportable as PDF (chart + summary table) and CSV (date-wise breakdown rows).
- Only Clinic Owner can access this report.

#### FR-44: Report access control summary
Role-based access to all report types is enforced consistently.

**Consequences (testable):**

| Report | Clinic Owner | Doctor | Receptionist |
|---|---|---|---|
| Daily Appointment List (FR-38) | All doctors | Own appointments only | Own clinic (no fee/payment columns) |
| Patient Visit History Export (FR-39) | Any patient | Own patients only | No access |
| Monthly Revenue Summary (FR-40) | Full access | No access | No access |
| No-show & Attendance Report (FR-41) | All doctors | Own stats only | No access |
| Doctor-wise Report (FR-42) | Full access | No access | No access |
| New vs Returning Patient Trend (FR-43) | Full access | No access | No access |

- Attempting to access a restricted report returns HTTP 403 and does not expose any restricted data.
- All report exports are scoped to the logged-in user's Clinic Tenant — cross-clinic data never appears in any export.

#### FR-45: Date range selector and report filters
All reports provide a consistent date range selector and relevant filters.

**Consequences (testable):**
- Preset options available across all reports: Today, This Week, This Month, Last 3 Months, Custom (date picker).
- Custom date range is limited to a maximum of 12 months to prevent excessive query load. [ASSUMPTION: 12-month cap is sufficient for MVP clinic owners; longer history export via support request if needed.]
- Selected filters persist within the session (navigating away and back restores the last selected range).
- Reports with no data for the selected range display a clear empty state: "No data for this period" rather than a blank screen.

**Feature-specific NFRs:**
- Report generation (screen render): < 3 seconds for date ranges up to 3 months, < 8 seconds for ranges up to 12 months.
- PDF generation: < 5 seconds for any report.
- CSV export: < 3 seconds for any report within the 12-month cap.

#### FR-45b: Long-running report fallback
If a report query exceeds 8 seconds, the system queues the report for async generation rather than returning a timeout error.

**Consequences (testable):**
- User sees a "Report is being generated — we'll notify you shortly" state instead of an error.
- When the report is ready (within 2 minutes of queuing), a WhatsApp notification is sent to the Clinic Owner: "Your [Report Name] report is ready. Open Cliniqly to download."
- The generated report is accessible in a "Recent Reports" list in the Reports section for 24 hours.
- This fallback applies only to Custom date ranges (> 3 months). Standard presets (Today, This Week, This Month, Last 3 Months) must meet the primary NFR and do not trigger async fallback.

---

## 5. Non-Goals (Explicit)

- **Not a clinical records system.** Cliniqly does not store diagnoses, prescriptions, lab results, or structured clinical data. A 500-character plain-text visit note is the extent of clinical capture in MVP.
- **Not an EMR / EHR.** ABDM / ABHA integration, HL7 FHIR, and structured clinical data are Phase 3.
- **Not a patient-facing app.** There is no patient login, patient dashboard, or patient mobile app in MVP. Patients interact only via WhatsApp and the Web Booking Link.
- **Not a multi-branch platform.** A Clinic is a single-location entity in MVP. Multi-branch support is Phase 2.
- **Not a telemedicine platform.** Video consultation is Phase 2.
- **Not a billing or accounting system.** GST invoices, Razorpay payment links, and financial reporting are Phase 1.
- **Not an AI assistant.** WhatsApp AI chatbot for autonomous NLP-driven booking is Phase 3.
- **Not a native mobile app.** iOS and Android apps are Phase 1. MVP is a mobile-responsive web application only.
- **Not a patient discovery marketplace.** Cliniqly does not list clinics for patients to find (unlike Practo). Each Clinic's booking page is accessed only via the Clinic's own shared Web Booking Link.
- **No patient self-rescheduling in MVP.** Patients who need to change their Appointment time must cancel via WhatsApp (FR-6) and rebook — they receive a new Token. Clinic staff can reschedule on behalf of patients via the dashboard (FR-12).

---

## 6. MVP Scope

### 6.1 In Scope
- WhatsApp Appointment Booking flow — FR-1 through FR-6b (incl. FR-6b: conversation state durability)
- Web Booking Link per Clinic — FR-7 through FR-9
- Manual Appointment entry and Walk-in registration — FR-10 through FR-12
- Appointment Calendar with day/week view and Slot management — FR-13 through FR-16
- Patient Database with search and visit history — FR-17 through FR-20
- WhatsApp Automation: confirmation, 24-hour and 2-hour Reminders, SMS fallback — FR-21 through FR-25
- Clinic Dashboard: daily and weekly summary — FR-26 through FR-30
- Basic Billing: fee recording and paid/unpaid status — FR-31 through FR-32
- Multi-role access with phone OTP login — FR-33 through FR-35
- Guided onboarding wizard and sample Appointment — FR-36 through FR-37
- Reports and Exports: 6 report types, screen view + PDF + CSV — FR-38 through FR-45b
- Bilingual UI: English and Hindi throughout
- Mobile-responsive web portal (no native app)
- Multi-tenant architecture with per-Clinic data isolation
- Subscription plan enforcement with upgrade prompts

### 6.2 Out of Scope for MVP
- Native mobile app (iOS / Android) — Phase 1; mobile-responsive web covers MVP use cases
- GST invoice generation and Razorpay UPI payment integration — Phase 1
- Google Review automation — Phase 1
- Predictive analytics and AI-driven insights (demand forecasting, patient retention scoring) — Phase 2+
- Patient-facing mobile app — Phase 2
- Voice-to-text consultation notes — Phase 2
- Digital prescription generator — Phase 2
- Teleconsultation (video calls) — Phase 2
- Multi-branch clinic support — Phase 2
- WhatsApp AI chatbot / autonomous NLP booking — Phase 3
- ABHA / Ayushman Bharat Health ID integration — Phase 3
- Insurance claim tracking — Phase 3
- HL7 FHIR lab integrations — Phase 3
- White-label platform for franchise networks — Phase 3
- Patient-initiated rescheduling via WhatsApp — Phase 1 [NOTE FOR PM: high request item; fast-follow if pilot feedback confirms]
- Biometric authentication (Face ID / fingerprint) — Phase 1 with native mobile app
- Automated post-visit follow-up WhatsApp message — Phase 1 [NOTE FOR PM: `follow_up` template in arch doc §4.3 is not in MVP scope; do not pre-implement the template]
- Medication reminder WhatsApp messages — Phase 1 [NOTE FOR PM: `medicine_reminder` template in arch doc §4.3 is not in MVP scope; do not pre-implement]
- Referral program tracking and promo/coupon code application — Phase 1
- Automated Clinic health score and CS-facing usage dashboard — Phase 1
- Automated win-back flow for cancelled Clinic accounts — Phase 1
- Self-serve plan downgrade (e.g., Growth → Starter) — Phase 1; handled manually via Cliniqly support in MVP

---

## 7. Cross-Cutting Non-Functional Requirements

### Performance
- **NFR-1:** WhatsApp webhook processing (inbound message to outbound response): p95 < 3 seconds.
- **NFR-2:** Web Booking Link page load: < 3 seconds on 4G (Lighthouse mobile simulation, India network profile).
- **NFR-3:** Dashboard initial load: < 2 seconds for a Clinic with up to 500 Appointments in the current month.
- **NFR-4:** Patient search results: < 1 second for a database of up to 5,000 Patients.

### Availability
- **NFR-5:** Platform availability: 99.5% monthly uptime during MVP (0–50 Clinics), measured by synthetic uptime checks on the web portal and WhatsApp webhook endpoint (e.g., AWS CloudWatch or UptimeRobot). Planned maintenance windows (NFR-6) are excluded from SLA calculation. Target 99.9% from Phase 1 (50+ Clinics). External communications to Clinic prospects must reference the 99.5% MVP SLA — not the 99.9% Phase 1 target.
- **NFR-6:** Planned maintenance windows communicated to Clinic Owners 48 hours in advance via WhatsApp; scheduled outside 8am–9pm IST.

### Security and Data Isolation
- **NFR-7:** All data in transit encrypted with TLS 1.3 minimum.
- **NFR-8:** All Patient data at rest encrypted with AES-256.
- **NFR-9:** PostgreSQL Row-Level Security policies enforce strict Tenant isolation; no cross-Clinic data access is possible at the database layer.
- **NFR-10:** Staff phone OTP sessions expire after 30 days; re-authentication required on a new or unrecognised device.
- **NFR-11:** WhatsApp webhook payloads validated against Meta's signature on every inbound request before processing.

### Internationalisation
- **NFR-12:** The entire web portal — all labels, navigation, error messages, and UI copy — is available in both English and Hindi from MVP launch day. i18n infrastructure (e.g., `next-intl` or `i18next`) must be implemented from Week 1 of development.
- **NFR-13:** All WhatsApp message templates (FR-21 through FR-24) and the Web Booking Link are available in both English and Hindi. Clinic Owner selects the preferred language per Clinic in Settings; all communications (portal and patient-facing) use that language. [ASSUMPTION: Per-patient language preference detection is Phase 1; MVP uses Clinic-level language selection throughout.]
- **NFR-14:** All dates and times are displayed in IST (UTC+5:30); no timezone selection is required at MVP.

### Accessibility
- **NFR-15:** Web portal meets WCAG 2.1 AA for all interactive components.

### Mobile and Connectivity
- **NFR-16:** Staff portal core features — calendar view, patient search, appointment creation — must remain functional on a 3G connection (throughput < 1 Mbps). Staff portal initial load: < 3 seconds on 4G; < 6 seconds on 3G (Lighthouse slow-3G profile). All interactive elements must meet 44px minimum touch target size for receptionist use on a mid-range Android phone (WCAG 2.5.5).
- **NFR-17:** Web Booking Link page load: < 5 seconds on a 3G connection (Lighthouse slow-3G simulation).

### Deployment and Reliability
- **NFR-18:** Deployments must not cause more than 60 seconds of service interruption per release. Planned downtime beyond this threshold must follow the NFR-6 advance notice procedure.
- **NFR-19:** RTO (Recovery Time Objective): < 4 hours from confirmed incident to platform restoration. RPO (Recovery Point Objective): < 1 hour maximum data loss on failure. Supported by automated RDS point-in-time recovery and 6-hourly snapshots.
- **NFR-20:** A disaster recovery drill must be conducted monthly to verify backup integrity and automated failover procedures.

### Security (additional)
- **NFR-21:** API rate limiting is enforced per Clinic Tenant. No single Clinic may exceed 100 requests/second to protect platform availability for all Tenants.
- **NFR-22:** Patient-related files stored in cloud object storage are accessible only via time-limited signed URLs (maximum 15-minute validity). Direct public URLs to patient files are not permitted.

### Design Principles
- **NFR-23:** The WhatsApp Booking Flow must be completable by a Patient with no prior instruction — no tutorial, no explainer text, no clinic staff involvement. Pilot test: a Clinic Owner hands their WhatsApp number to a Patient who has never used Cliniqly, and the Patient books without assistance.
- **NFR-24:** All destructive actions in the staff portal (Appointment cancellation, Patient record deletion, staff removal) require an explicit confirmation step before execution. The UI must not permit accidental data loss in the hands of a non-technical Receptionist.
- **NFR-25:** All Cliniqly-to-Clinic communications (onboarding prompts, upgrade alerts, trial expiry messages, error states) must use a respectful, non-alarmist tone appropriate for a medical professional audience. Prefer collaborative framing ("You've reached your limit — here's how to continue") over imperative framing ("Your account is blocked"). The Hindi variant must use conversational Hinglish, not formal Hindi.

---

## 8. Compliance and Regulatory

### 8.1 DPDP Act 2023
- **CR-1:** Explicit, informed Patient consent must be obtained before any personal data is collected. In the WhatsApp Booking Flow, a consent acknowledgment Quick Reply is the first step for any new Patient before name, age, or gender is requested.
- **CR-2:** Data collected is limited to the minimum required for appointment booking. No Patient data is used for marketing communications without a separate explicit consent.
- **CR-3:** Patients have the right to erasure. A Clinic Owner can permanently delete a Patient record (all Appointments and personal data) from the platform Settings. [ASSUMPTION: Manual deletion by Clinic Owner is sufficient for MVP; a self-service patient erasure request portal is Phase 1.]
- **CR-4:** All Patient data is stored in AWS ap-south-1 (Mumbai) to satisfy India data residency requirements.
- **CR-5:** A data breach affecting Patient personal data is logged internally within 24 hours; external notification obligations will follow the Data Protection Board's formal establishment and the enforcement timelines it sets.

### 8.2 IT Act 2000 and SPDI Rules 2011
- **CR-6:** A Privacy Policy and Terms of Service are accessible from the signup page and the Web Booking Link footer before any data is collected.
- **CR-7:** A Grievance Officer is named in the Privacy Policy with a 30-day response commitment.
- **CR-8:** NFR-7 through NFR-11 satisfy SPDI Rules 2011 reasonable security practice obligations for sensitive personal data (health records qualify).

### 8.3 WhatsApp Business Policy
- **CR-9:** All WhatsApp message templates used in automated flows (FR-21 through FR-24) are submitted and pre-approved via Meta's WhatsApp Manager before MVP pilot launch.
- **CR-10:** Cliniqly does not send unsolicited marketing messages via WhatsApp. All messages are transactional, triggered by a Patient-initiated action.
- **CR-11:** Patients can opt out of WhatsApp messages by replying "STOP". The system honours opt-outs within 1 hour and sends no further automated messages to opted-out numbers. [NOTE FOR PM: Opt-out handling must be tested explicitly before pilot launch — Meta policy violations can result in phone number suspension.]

### 8.4 Data Governance
- **CR-12:** Audit logs covering all staff access to Patient records, Appointment modifications, data exports, and Super Admin access are retained for a minimum of 5 years in a separate, immutable schema inaccessible to Clinic staff.
- **CR-13:** Clinic Owners can request a full export of all their Clinic's Patient data (patient profiles and Appointment history) in CSV format at any time — including during trial and within a 30-day grace period after subscription cancellation. This satisfies the "never lose patient history" product promise and prevents data-hostage perception (see MON-3).
- **CR-14:** Cliniqly uses AWS HIPAA-eligible services for infrastructure resilience and security best practices. This does not constitute HIPAA certification or compliance — HIPAA is a US law not applicable to Indian clinics. The term "HIPAA compliant" must not appear in any customer-facing materials, sales collateral, or clinic-owner communications.

---

## 9. Monetisation

### 9.1 Subscription Plans

| Plan | Target | Monthly | Annual | Key Limits |
|---|---|---|---|---|
| Starter | Solo / 1-doctor clinic | ₹999 | ₹8,999 | 1 Doctor, 500 Appointments/month, 200 WhatsApp messages |
| Growth | 2–3 doctor clinic | ₹2,499 | ₹21,999 | 3 Doctors, unlimited Appointments, 1,000 WhatsApp messages |
| Pro | 4–10 doctor clinic | ₹4,999 | ₹43,999 | 10 Doctors, 3,000 WhatsApp messages, analytics |
| Enterprise | Multi-branch / franchise | ₹9,999+/month | Custom | Unlimited branches, white-label, dedicated support |

Setup fee: ₹2,000–5,000 one-time (waived for annual plans). WhatsApp add-on packs: ₹499 per 1,000 additional messages. 14-day free trial, no card required.

### 9.2 Plan Enforcement
- **MON-1:** When a Clinic reaches 90% of its monthly Appointment or WhatsApp message limit, the Clinic Owner receives a WhatsApp alert with an upgrade prompt.
- **MON-2:** Adding a Doctor beyond the plan's Doctor limit is blocked with an upgrade prompt.
- **MON-3:** Trial expiry: on Day 13, Clinic Owner receives a WhatsApp message with a 20% discount offer for annual conversion. On Day 15 without conversion, a soft paywall activates — read-only access; no new bookings accepted via WhatsApp Booking Flow or Web Booking Link. [ASSUMPTION: Soft paywall rather than hard lock — Clinic retains view access to prevent data hostage perception.]
- **MON-4:** The setup fee (₹2,000–5,000 one-time per §9.1) is collected manually by Cliniqly support at trial-to-paid conversion during MVP. Automated setup fee billing is Phase 1 with Razorpay integration.
- **MON-5:** WhatsApp add-on pack purchase (₹499/1,000 messages) is processed manually via Cliniqly support during MVP. When the message limit is reached (SC-32), the WhatsApp alert sent to the Clinic Owner (see SC-32) must direct them to contact Cliniqly support — not imply an in-product purchase flow. Self-serve top-up is Phase 1.
- **MON-6:** If a trial Clinic has not received at least one confirmed WhatsApp Appointment by Day 7, the system generates an internal flag for Cliniqly Customer Success review. In MVP this is surfaced via the Super Admin role (see TA-G12 in addendum); CS follow-up is manual.

**Note on plan upgrades and downgrades (MVP):** Plan upgrades are processed manually by Cliniqly support (SC-41); prorated billing and self-serve upgrades are Phase 1. Plan downgrades are handled manually on request — see §6.2 Out of Scope. MON-1, MON-2, and MON-3 are automated product requirements. MON-4 through MON-6 are operational at MVP. Cross-reference: SC-31 (appointment limit), SC-32 (message limit), SC-40 (trial expiry), SC-41 (upgrade).

---

## 10. Platform

- **Web application:** Next.js 15, React 19, Tailwind CSS v4 — deployed on the existing monorepo at `apps/web/`. Mobile-responsive. No native app at MVP.
- **Supported browsers:** Android Chrome (latest), iOS Safari 16+, Chrome desktop (latest), Safari desktop (latest).
- **Minimum device:** Android 8+ / iOS 14+ on a mid-range smartphone (2GB RAM).
- **Connectivity:** Core features (calendar, patient lookup, appointment creation) degrade gracefully on 3G. WhatsApp automation operates server-side; no clinic-device connectivity is required for Reminders once Appointments are confirmed.
- **White-label branding:** Multi-tenant theming infrastructure is in `packages/branding/`. Enterprise white-label (custom domain, custom logo) is Phase 3; MVP is Cliniqly-branded only.

---

## 11. Integration and Dependencies

| Integration | Provider | Phase | Risk |
|---|---|---|---|
| WhatsApp Business API | Meta WhatsApp Cloud API (direct) | MVP | **High** — entire booking flow depends on this; Meta Business verification and number registration must begin Week 1 |
| SMS fallback | MSG91 | MVP | Low — fallback channel; alternative providers available |
| Database | PostgreSQL 16, AWS RDS ap-south-1 | MVP | Low |
| DNS + SSL | AWS Route 53 + ACM | MVP | Low |
| Email (transactional) | AWS SES | MVP | Low |
| Payment gateway | Razorpay | Phase 1 | — |
| Google Business Profile | Google My Business API | Phase 1 | — |
| Push notifications | FCM / APNs | Phase 1 | — |

**Critical path note:** Meta Business Account verification, WhatsApp Business number registration, and message template pre-approval via WhatsApp Manager must all begin in Week 1 of development. Meta Business verification: 1–3 business days. Number registration: 1–2 business days. Template approval: 3–5 business days. Green tick (official business verification) is eligible from day one with the direct API but approval timeline is variable (days to weeks) — the platform functions without a green tick; it improves Patient trust but is not a launch blocker. This is the longest external lead-time item in the MVP build.

---

## 12. Why Now

Three conditions align in 2026 that have not aligned before:

1. **WhatsApp Business API maturity.** Meta's Cloud API (2022+) made WhatsApp programmatic messaging accessible to startups at low cost. Quick Replies and List Messages — the interaction patterns that make a 60-second booking possible — are production-ready and proven in India.

2. **Post-COVID digital urgency.** Indian clinic owners who resisted software pre-2020 were forced to experiment with digital tools during COVID. The objection has shifted from "why would I use software?" to "is there something simple enough?" The window for a frictionless entry point is open now.

3. **DPDP Act 2023 — compliance window is open.** India's Digital Personal Data Protection Act was passed in 2023; the Data Protection Board is being constituted and enforcement is expected to begin progressively through 2025–2026. Healthcare data compliance is becoming an active concern for clinic owners for the first time. Being DPDP-compliant from day one is a differentiator — the window to establish credibility before competitors are forced to catch up is limited, and early compliance is a genuine trust signal to doctors handling sensitive patient data.

---

## 13. Success Metrics

**Primary**

- **SM-1: WhatsApp booking completion rate** — percentage of WhatsApp Booking Flows initiated (FR-1) that result in a confirmed Appointment (FR-5). Target: > 65% within 60 days of pilot launch. Validates FR-1 through FR-5.
- **SM-2: Trial-to-paid conversion rate** — percentage of trial Clinics that convert to a paid plan within 15 days of trial expiry. Target: > 40%. Validates overall product value delivery.
- **SM-3: Day-30 Clinic retention** — percentage of paying Clinics still active 30 days after first payment. Target: > 85%. Validates onboarding and core loop stickiness.

**Secondary**

- **SM-4: Time-to-first-WhatsApp-booking** — time from Clinic signup completion to the first real Patient booking via WhatsApp Booking Flow. Target: median < 24 hours after WhatsApp number goes live. Validates FR-36 (onboarding) and Meta API setup speed.
- **SM-5: No-show rate reduction** — self-reported no-show rate at pilot Clinics at Day 30 vs. stated baseline. Target: > 25% reduction. Validates FR-22 and FR-23.
- **SM-6: Dual-channel activation** — percentage of active Clinics with at least one booking via WhatsApp AND one via Web Booking Link within their first 30 days. Target: > 60%. Validates FR-7 through FR-9.
- **SM-7: Dashboard weekly active rate** — percentage of paying Clinics with at least 3 Dashboard sessions in a given week. Target: > 70%. Validates FR-26 through FR-30 as a daily habit.
- **SM-8: Annual Clinic churn** — percentage of paying Clinics that cancel or lapse within 12 months of first payment. Target: < 8% annual. Tracked from Month 6 onwards (requires sufficient cohort data). Validates long-term product value and CS effectiveness.

**Counter-metrics (do not optimise)**

- **SM-C1: WhatsApp messages per Appointment** — must not exceed 3 automated messages per Appointment (confirmation + 2 Reminders). Optimising for more messages to reduce no-shows risks Patient opt-outs and WhatsApp number flagging by Meta.
- **SM-C2: Onboarding wizard completion time** — do not optimise completion speed by cutting steps if it results in Clinics going live with incomplete slot configurations. Quality of setup matters more than speed of setup.

---

## 14. Open Questions

1. **Shared vs Clinic-owned WhatsApp number (Starter plan):** Do Starter plan Clinics use a Cliniqly shared sender number (header: "Cliniqly | Dr. Mehta's Clinic") or their own WhatsApp Business number registered individually via Meta? Shared number simplifies MVP setup; own number gives the Clinic full brand control but requires a separate Meta Business Account per Clinic. *Owner: Priyanka. Resolve before Week 3 — affects Meta Cloud API integration architecture.* **Default if unresolved by Day 14:** each Clinic registers their own WhatsApp Business number individually via the FR-36 onboarding wizard. This maximises Clinic brand identity and avoids shared-number tenant routing complexity. Revisit shared-number option at Phase 1.

2. **Web Booking Link phone verification:** No OTP at web booking assumed (FR-8). Revisit if fake or spam bookings appear during pilot. *Owner: Priyanka. Revisit at pilot review, Week 10.*

3. ~~**Hindi UI scope**~~ — **CLOSED.** Full bilingual support confirmed: entire web portal (all labels, navigation, error messages) + patient-facing surfaces (Web Booking Link + WhatsApp templates) in both English and Hindi from MVP launch. i18n infrastructure required from Day 1.

4. ~~**Google Review automation**~~ — **CLOSED. Phase 1 confirmed.** Deferred to Phase 1 per §6.2 and consistent with arch doc §7 integration table. Business plan GTM value noted; it remains a fast-follow priority post-MVP.

5. ~~**Appointment limit enforcement message (Starter plan)**~~ — **CLOSED.** Answered in SC-31 step 2: patient-facing WhatsApp message reads "We are unable to accept online bookings at this time. Please call us at [clinic phone] to schedule your appointment." Web Booking Link shows "Online booking is temporarily unavailable. Please contact the clinic directly." This copy may be refined at implementation.

---

## 15. Assumptions Index

- **§2.2** — Less than 5% of urban/semi-urban target Patients are not on WhatsApp; based on 95%+ WhatsApp penetration data cited in business plan.
- **§4.1** — Patients in the target market are comfortable with a guided WhatsApp conversation for appointment booking.
- **§4.2 / FR-7** — `cliniqly.com` domain secured; clinic-slug auto-derived from Clinic name at signup.
- **§4.2 / FR-8** — No phone OTP required at web booking for MVP; friction reduction prioritised over fraud prevention.
- **§4.3 / FR-11** — Clinic Owners expect flexibility to override Slot limits for emergency walk-ins.
- **§4.6** — WhatsApp message templates submitted and pre-approved via Meta's WhatsApp Manager before MVP pilot launch; approval takes 3–5 business days.
- **§4.7** — Dashboard is the default landing screen after login for all roles.
- **§4.5 / FR-18** — Full clinical notes deferred; 500-character visit note is sufficient for MVP.
- **§8.1 / CR-3** — Manual Patient deletion by Clinic Owner is sufficient for DPDP Act erasure obligations at MVP scale; self-service patient erasure portal is Phase 1.
- **§9.2 / MON-3** — Day 15 soft paywall (read-only access) rather than hard lock on trial expiry.
- **§11** — Meta WhatsApp Cloud API used directly from MVP (no BSP intermediary). Green tick verification is eligible from day one but not a launch blocker.
- **§NFR-13** — Patient WhatsApp messages use the Clinic's selected language for MVP; per-patient language detection is Phase 1.
- **§4.11 / FR-45** — 12-month custom date range cap is sufficient for MVP Clinic Owners; reports beyond 12 months available via Cliniqly support on request.
- **§4.11 / FR-39** — A Doctor who has treated a Patient shares that Patient record with other Doctors at the same Clinic. The Doctor can view the Patient's full visit history (all Doctors, read-only) but can add visit notes only to their own completed Appointments.
- **§2.4 / SC-23** — No automated "you missed your appointment" message is sent to no-show Patients in MVP; avoid patient friction. Revisit in Phase 1.
- **§9.2 / SC-32** — Within the WhatsApp message allowance, booking confirmations are prioritised over Reminders when the monthly limit is reached.
- **§4.9 / SC-37** — Patient records are Clinic-scoped, not Doctor-scoped. A Patient who has visited multiple Doctors at the same Clinic is accessible to all those Doctors (read-only for visits with other Doctors).
