---
name: Chikitsa360
status: final
updated: 2026-06-07
sources:
  - .decision-log.md
---

# Chikitsa360 — Experience Spine

> Owns *how it works*. Visual tokens and component specs live in `DESIGN.md`.
> Cross-references use `{path.to.token}` syntax pointing to DESIGN.md.
> Spines win on conflict with any mock, wireframe, or import.

---

## Foundation

**Multi-surface responsive web.** Desktop (1024px+) is the primary surface where clinic staff and doctors spend the majority of their session time. Tablet (768–1023px) is primary for doctors in examination rooms — typically iPad landscape, 2-column layouts. Mobile (< 768px) is primary for on-the-go clinic admin review and urgent patient lookups. All critical flows must complete on any surface.

**Technology base:** Next.js 15 App Router + Tailwind CSS v4 + `@chikitsa360/ui` component library. This spine specifies behavioral deltas — component visual specs live in `DESIGN.md`.

**Multi-tenancy:** Visual identity is injected per deployment via `NEXT_PUBLIC_CLIENT_ID` and the `@chikitsa360/branding` package. Theme tokens are CSS custom properties. In-app theme switching (Light, Dark, High Contrast, client custom) is stored in `user_preferences` on the server and synced across devices. `DESIGN.md` is the visual identity reference.

**IA reference:** `mockups/` directory contains HTML key-screen mocks for Dashboard, Patient Profile, Appointment Calendar, and Login. Spines win on conflict.

---

## Personas

### Priya Nair — Reception Staff

26, B.Sc. grad, first job at an urban clinic in Pune. Manages 60+ patients/day across 2 doctors. Primary device: 15" Windows laptop; occasionally uses her Android phone to check the waitlist from the break room.

**Jobs-to-be-done:**
- Register a walk-in patient and book them with the right doctor in under 90 seconds
- Confirm tomorrow's appointments via WhatsApp with one click
- Find a patient's phone number instantly when they call to reschedule
- Manage the physical waiting queue without losing context of who arrived when

**Pain points:** Re-entering the same patient information across multiple screens. Double-booking two patients at the same time slot. Patients asking "what time is my appointment?" and having to alt-tab to find it. Slow page loads when the waiting room is full and she's juggling multiple tasks.

**Success looks like:** Priya books a new appointment in 3 clicks. She never double-books. When a patient calls, she has their full contact + upcoming appointment on screen within 5 seconds.

---

### Dr. Arjun Mehta — General Practitioner

38, 12 years in clinical practice, sees 35–40 patients/day. Works at a clinic that sees 3 doctors. Uses an iPad Pro (landscape) at the consultation desk; keeps a phone in his coat pocket.

**Jobs-to-be-done:**
- See the last 3 diagnoses and current medications before the patient enters the room
- Write a consultation note in under 2 minutes without breaking eye contact with the patient
- Generate and sign a prescription without re-typing drug names
- Know which follow-up patients are overdue so he can flag them

**Pain points:** Clicking through 5 screens to find the patient's last prescription. Drug name autocomplete that suggests irrelevant drugs. Consultation notes lost when a session times out. Having to repeat the same prescription for a chronic patient every visit.

**Success looks like:** Dr. Arjun opens the patient profile 30 seconds before the patient enters. He sees their last visit summary, active prescriptions, and any unresolved follow-ups in one view. He writes a note and issues a prescription without leaving the patient's profile.

---

### Rakesh Sharma — Clinic Owner / Administrator

45, owns and operates 3 clinics in Mumbai. Primarily on MacBook Pro; checks mobile during commute. Has a clinic manager at each location; reviews performance weekly.

**Jobs-to-be-done:**
- See consolidated revenue, appointment counts, and no-show rates across all 3 clinics in one view
- Identify which doctor has the highest cancellation rate this month
- Add a new staff member to a specific clinic without creating duplicate accounts
- Export a monthly billing summary to share with his accountant

**Success looks like:** Rakesh opens the dashboard on Monday morning and immediately knows which clinic had a bad week and why. He drills into the underperforming clinic's metrics in 2 clicks. He exports the month-end report in one action.

---

## Information Architecture

### Sitemap

| Surface | Route | Primary audience | Access via |
|---|---|---|---|
| Login | `/login` | All | Direct URL |
| Dashboard | `/` | All | Sidebar, Home |
| Appointments — Calendar | `/appointments` | Reception, Doctors | Sidebar |
| Appointments — Agenda | `/appointments?view=agenda` | Reception | View toggle |
| Appointments — Waitlist | `/appointments?view=waitlist` | Reception | View toggle |
| Appointment Detail | `/appointments/[id]` | All | Calendar click, Patient profile |
| New Appointment | `/appointments/new` | Reception | Quick Actions, "+ New" |
| Patients — List | `/patients` | All | Sidebar |
| Patient Profile — Overview | `/patients/[id]` | All | Patient list, search |
| Patient Profile — Timeline | `/patients/[id]?tab=timeline` | Doctors, Reception | Tab |
| Patient Profile — EMR | `/patients/[id]?tab=emr` | Doctors | Tab |
| Patient Profile — Prescriptions | `/patients/[id]?tab=prescriptions` | Doctors | Tab |
| Patient Profile — Billing | `/patients/[id]?tab=billing` | Reception, Admin | Tab |
| Patient Profile — Communication | `/patients/[id]?tab=communication` | Reception | Tab |
| New Patient | `/patients/new` | Reception | Quick Actions, "+ New" |
| Doctors — List | `/doctors` | Admin | Sidebar |
| Doctor Profile | `/doctors/[id]` | Admin | Doctor list |
| Prescriptions | `/prescriptions` | Doctors | Sidebar |
| New Prescription | `/prescriptions/new` | Doctors | Quick Actions |
| Billing — List | `/billing` | Admin, Reception | Sidebar |
| Invoice Detail | `/billing/[id]` | Admin, Reception | Billing list |
| New Invoice | `/billing/new` | Reception | Quick Actions |
| Reports | `/reports` | Admin | Sidebar |
| Reports — Revenue | `/reports?tab=revenue` | Admin | Tab |
| Reports — Appointments | `/reports?tab=appointments` | Admin | Tab |
| Reports — Doctors | `/reports?tab=doctors` | Admin | Tab |
| Reports — Follow-ups | `/reports?tab=followups` | Admin | Tab |
| Settings — Clinic Profile | `/settings` | Admin | Sidebar, footer |
| Settings — Users & Roles | `/settings?tab=users` | Admin | Tab |
| Settings — Appearance | `/settings?tab=appearance` | Admin, All | Tab |
| Settings — Integrations | `/settings?tab=integrations` | Admin | Tab |
| Settings — Billing Plan | `/settings?tab=plan` | Admin | Tab |
| Clinic Switcher | global overlay | Multi-clinic admin | Sidebar header dropdown |

### Navigation Model

**Desktop sidebar (persistent):**

```
[Clinic logo + name + switcher dropdown]
[Global search bar, Cmd+K]

MAIN
  Dashboard                  (D)
  Appointments               (A)
  Patients                   (P)
  Doctors                    (Dr)
  Prescriptions              (Rx)
  Billing                    (B)

INSIGHTS
  Reports                    (R)

[collapse to icon-only button at bottom]

ACCOUNT
  [User avatar + name]
  Settings
  Help
  Sign out
```

**Mobile bottom tab bar:**

```
[ Dashboard | Appointments | [+ FAB] | Patients | More ]
```

"More" opens a sheet with: Doctors, Prescriptions, Billing, Reports, Settings.

**Quick Actions (universal "+" button in top bar):**

Opens command palette pre-filtered to creation actions:
- New Patient
- Book Appointment
- New Prescription
- New Invoice
- [custom actions per role]

**Command palette (Cmd/Ctrl+K):**

Two modes:
1. *Search*: Type anything — returns patients, appointments, doctors, prescriptions, invoices ranked by recency and relevance
2. *Command*: Prefix with `>` — returns action commands ("Go to Reports", "Switch to Dark Mode", "Export current view")

Results grouped: Patients | Appointments | Recent | Actions. Max 8 results before "Show all."

### Role-based Access Model

| Feature area | Reception | Doctor | Admin / Owner |
|---|---|---|---|
| Patient registration & editing | Full | Read-only | Full |
| Appointment booking | Full | Own slots only | Full |
| EMR / consultation notes | None | Full | Read-only |
| Prescriptions | View | Full | Read-only |
| Billing | Full | None | Full |
| Reports | None | Own stats | Full |
| Settings | None | Appearance only | Full |
| Multi-clinic view | Own clinic | Own clinic | All clinics |

---

## Voice and Tone

Microcopy. Brand voice and aesthetic posture live in `DESIGN.md.Brand & Style`.

Chikitsa360 speaks like a highly competent colleague — precise, direct, never condescending, never cheerful-performative. It acknowledges errors without blaming the user. It confirms successes briefly. It never asks a question it can answer itself.

| Context | Do | Don't |
|---|---|---|
| Empty appointment list | "No appointments today. Book one now." | "Wow, no appointments! Enjoy your free day! 🎉" |
| Successful save | "Saved." or "Appointment confirmed." | "Awesome! Your appointment has been successfully saved! ✓" |
| Error saving | "Couldn't save. Check your connection and try again." | "Oops! Something went wrong! Error code: 4032" |
| Patient created | "Anjali Sharma added." | "New patient record created successfully." |
| Destructive confirmation | "Cancel this appointment for Anjali Sharma?" | "Are you sure you want to do this?" |
| Form validation | "Phone number must be 10 digits." | "Invalid input. Please check field #3." |
| Loading (first visit) | "Loading appointments..." | skeleton only (no spinner copy) |
| Session expiry warning | "You'll be signed out in 5 minutes due to inactivity." | "Session timeout warning!" |
| Drug allergy conflict | "Amoxicillin conflicts with Priya's penicillin allergy." | "ALERT: Drug interaction detected (Code: ALG-04)" |
| Permission denied | "You don't have access to this section. Contact your admin." | "403 Forbidden" or generic error page |

**Form microcopy rules:**
- Field labels: sentence case, no colons
- Placeholder text: an example value, not a repetition of the label ("e.g. 9876543210")
- Error messages: state the problem + how to fix it
- Helper text: appears below input, explains why the field matters ("Used for appointment reminders")

**Dates and times:**
- Always show day name + date for appointments ("Wed, 12 Jun 2026")
- Times in 12-hour format by default, configurable in Settings
- "Today", "Yesterday", "Tomorrow" replace date strings for recency context

---

## Component Patterns

Behavioral. Visual specs live in `DESIGN.md.Components`.

### Sidebar

- Always visible on desktop (`lg+`). Collapses to icon-only at `{DESIGN.md components.sidebar.collapsed-width}` via toggle button at bottom.
- Collapsed state: nav item shows icon + tooltip on hover. Clinic name shows first letter only.
- On `md` (tablet): starts collapsed; user can expand.
- Active route highlighted. Active section (e.g. any `/patients/*`) keeps Patients nav item in active style.
- Keyboard: `G` then section letter for instant navigation (G→D: Dashboard, G→A: Appointments, G→P: Patients, G→R: Reports).
- Multi-clinic admin: clinic switcher dropdown in sidebar header. Switching clinic reloads all data silently; a brief toast "Switched to Andheri Clinic" confirms.

### Data Tables

- Column headers: sortable by click (first click: ASC, second: DESC, third: remove sort). Active sort column shows arrow icon.
- Row selection: checkbox column on left. Header checkbox selects/deselects all visible rows. Selecting any row activates the Bulk Actions bar (floating, above table).
- Bulk Actions: contextual per surface. Appointments: "Confirm All", "Send WhatsApp Reminder", "Export". Patients: "Export", "Assign Doctor", "Archive".
- Row click: opens detail view (sheet on desktop, full-screen on mobile). Exception: checkbox click never opens detail.
- Empty rows: never show blank rows to fill height. Table ends at last data row.
- Pagination: "Previous / Next" with page info ("Showing 1–15 of 247"). Jump to page input. Items per page selector (15, 25, 50).
- Saved views: users can save a filter+sort combination as a named view. Views saved per user per surface, not global. View switcher dropdown in table header.
- Column visibility: "Columns" button in table header opens a popover to toggle columns on/off. Preference saved per user.
- Export: "Export" button opens a sheet: format (CSV, PDF), scope (current view, all pages, date range). PDF export uses the branded invoice/report template.

### Patient Profile

- Header is always visible, regardless of active tab. Contains: avatar, name, age + gender, phone (masked by default, click to reveal), tags (chronic conditions), and a "Quick Actions" dropdown (Book Appointment, New Prescription, New Invoice, Send WhatsApp).
- Six tabs: Overview, Timeline, EMR, Prescriptions, Billing, Communication.
- Tab navigation sticks to top of viewport on scroll.
- **Overview tab:** 3-column grid: Personal Information (left), Vitals snapshot (center), Emergency Contacts (right). All fields inline-editable (click to edit, blur to save, Esc to cancel). Edit confirmation toast on save.
- **Timeline tab:** Chronological reverse list of all clinic interactions. Each entry: date badge, type badge (Appointment / Consultation / Lab / Prescription / Payment / Communication), summary text, and expand chevron for full detail. Filter bar above: date range, type multi-select, doctor filter. Infinite scroll (exception to the pagination rule — timeline is narrative, not tabular).
- **EMR tab:** List of consultation notes + button to start a new consultation. Each note: date, attending doctor, chief complaint, diagnosis, plan. Notes are not editable after 24 hours (audit compliance). Export button per note.
- **Prescriptions tab:** List of prescriptions, newest first. Each prescription: date, drugs listed (name + dosage + frequency + duration), doctor, print/download button. "Repeat" button creates a new prescription pre-filled with the same drugs.
- **Billing tab:** List of invoices and payments. Running balance at top. Each invoice: date, services, amount, status (Draft/Sent/Paid/Overdue). "Pay Now" quick action on outstanding invoices.
- **Communication tab:** WhatsApp and SMS history. Timeline of messages sent and received. "Send WhatsApp" button opens compose sheet with message template selector.

### Appointment Booking Flow

3-step wizard in a modal (desktop) or full-screen flow (mobile).

**Step 1 — Patient:**
- Search existing patient (type-ahead, debounced 200ms). Result cards show name, DOB, last visit.
- "Or register new patient" link opens a mini-registration form inline (not a new page).

**Step 2 — Doctor + Time:**
- Doctor selector: card grid with photo, name, specialty, today's slot availability at a glance.
- Time picker: a compact week-view grid for the selected doctor. Available slots in `{DESIGN.md components.appointment-slot-available}`, booked in `{DESIGN.md components.appointment-slot-booked}`, selected in `{DESIGN.md components.appointment-slot-selected}`.
- Slot duration: set by doctor's schedule (15 or 30 min default). Shown on slot.
- "Next available" shortcut pre-selects the earliest open slot.

**Step 3 — Confirm:**
- Summary card: patient name + photo, doctor, date/time, appointment type (New / Follow-up / Emergency), optional notes.
- "Send WhatsApp confirmation" toggle (default ON).
- "Book" button. Optimistic update: modal closes, appointment appears in calendar/list immediately. Toast: "Appointment booked for Anjali Sharma — Wed 12 Jun, 10:30am."

Failure path: if slot was taken by a concurrent booking, modal re-opens at Step 2 with error "This slot was just taken. Pick another time."

### Calendar

- Default view: **Week** (Mon–Sun or Mon–Sat based on clinic settings). Visible hours: 8am–8pm.
- Views: Week | Day | Month | Agenda. Toggle in top-right of the calendar surface.
- Doctor filter: chip strip above the calendar. Each doctor chip has their color indicator (assigned at setup). Deselecting a chip hides their appointments.
- Appointment blocks: `{DESIGN.md components.appointment-block}`. Click opens appointment detail sheet (not a new page).
- Drag-to-reschedule on desktop: grab an appointment block, drag to a new slot. Drop triggers confirmation sheet ("Move to 11:00am with Dr. Patel?"). Optimistic update on confirm.
- Mobile: drag-to-reschedule disabled. Long-press opens action sheet: "Reschedule", "Cancel", "View Patient".
- New appointment: click an empty slot on the calendar pre-fills Step 2 of the booking flow with that time.
- Waitlist view: queue of patients with no confirmed slot. Drag from waitlist onto calendar to assign a slot.

### Forms

- **Smart defaults:** Clinic city pre-fills city field. Appointment type defaults to "Follow-up" if patient has a prior visit, "New Patient" if first visit. Date defaults to today. Duration defaults to doctor's standard slot.
- **Autofill:** Patient name, phone, and email auto-fill from existing records when any field uniquely resolves to one patient.
- **Inline validation:** Validate on blur (not on keypress). Error message appears below the field immediately on blur. Form-level submit validation catches remaining errors.
- **Prescription form specifics:** Drug name: autocomplete from formulary (500ms debounce, fuzzy match). Dosage: structured picker (amount + unit + frequency + duration). Allergy conflict: real-time check against patient's allergy list — if conflict found, a `{DESIGN.md components.prescription-card.warning-border}` warning card appears with the conflicting drug name. Requires explicit "Override (note reason)" confirmation.
- **Multi-field groups:** Related fields grouped visually (e.g., "Contact Information" group with phone, email, emergency contact). Group labels in `{DESIGN.md typography.label}`.
- **Keyboard navigation:** Tab advances through fields in visual order. Enter submits on single-field forms. Shift+Tab goes backwards. All modals trap focus.

### Consultation (EMR)

- Accessed only from the patient profile EMR tab or from the appointment detail.
- Layout (desktop/tablet): 2-column split. Left: patient context (last 3 visits, active medications, allergy list). Right: current consultation form.
- Consultation form sections: Chief Complaint (free text), History (free text), Examination (structured or free text), Diagnosis (ICD-10 code lookup with description), Plan (free text), Follow-up (date picker + reminder toggle).
- Auto-save every 30 seconds with "Draft saved at 10:34am" indicator.
- Close confirmation if unsaved changes: "You have unsaved changes. Save or discard?"
- Post-save: consultation appears in Timeline immediately (optimistic update).

### WhatsApp Communication

- Triggered from: Appointment booking (confirmation), Appointment list (bulk reminder), Patient profile Communication tab, and Reports > Follow-ups (bulk follow-up send).
- Message templates: pre-built for Appointment Confirmation, Appointment Reminder (1 day prior), Follow-up Reminder, Lab Report Ready, Invoice.
- Template variables auto-filled from patient/appointment data. User can edit before sending.
- Status tracking per message: Sent, Delivered, Read. Shown in Communication tab.
- Bulk send limit: max 200 per session to prevent abuse.

### Multi-Clinic Management

- Accessible to Admin/Owner role only.
- Clinic switcher: top-left of sidebar. Dropdown lists all clinics. "All Clinics" option for aggregate Reports view.
- Per-clinic settings (staff, doctors, hours, branding) managed via Settings when that clinic is active.
- Cross-clinic patient records: patients can be registered at multiple clinics. Profile shows which clinics they've visited. Data is clinic-scoped by default; admin can enable record sharing between clinics in Settings.

---

## State Patterns

### Loading States

| Surface | Skeleton shape | Notes |
|---|---|---|
| Dashboard stat cards | 4 fixed-height skeleton cards | Matches real card dimensions |
| Appointment list / table | 8 skeleton rows, column widths matching real data | Row height 52px |
| Patient list | 10 skeleton rows with avatar circle + 3 text bars | |
| Patient profile header | Avatar circle + 4 text bars | |
| Calendar | Grid of 12 skeleton blocks distributed across week | Time labels visible during load |
| Timeline | 5 skeleton entries with left node + text block | |
| Command palette results | 4 skeleton result rows | Appears after 200ms debounce, before API response |
| Reports charts | Full-width skeleton rectangle at chart height | |

### Empty States

Never show a blank surface. Every empty state: icon (Lucide, 32px, centered in 56px muted circle) + headline (`{DESIGN.md typography.display-sm}`) + description (`{DESIGN.md typography.body}`) + primary action button.

| Surface | Headline | Description | Action |
|---|---|---|---|
| Appointments (no appointments today) | "Clear schedule today" | "No appointments booked yet. Start accepting patients." | Book Appointment |
| Patients (first time) | "Your patients, in one place" | "Register your first patient to start building their care record." | Add Patient |
| Doctor's prescription list (none) | "No prescriptions yet" | "Write your first prescription from a patient's profile during a consultation." | Go to Patients |
| Billing (no invoices) | "No invoices generated" | "Billing records will appear here once you generate invoices for consultations." | New Invoice |
| Reports (no data in range) | "No data for this period" | "Try a wider date range or check that appointments are being recorded." | Change Date Range |
| Timeline (new patient) | "Anjali Sharma's journey begins here" | "Their full appointment history, prescriptions, and communications will appear as they visit." | Book First Appointment |
| WhatsApp (no messages) | "No messages yet" | "Send an appointment confirmation or reminder to start the conversation." | Send Message |
| Search (no results) | "No results for '{query}'" | "Try a patient's phone number or partial name." | — |
| Waitlist (empty) | "Waitlist is clear" | "Walk-in patients added to the waitlist will appear here." | Add to Waitlist |

### Error States

- **Network error / API failure:** Toast (persistent): "Couldn't load [surface name]. Check your connection." + "Try again" button. Page content remains in last-good state (stale data) rather than replacing with an error screen.
- **Form submission error:** Inline field errors for validation; toast for server errors.
- **404:** "We couldn't find that [patient/appointment/invoice]." with a back button and search.
- **Permission error:** "You don't have access to this section. Contact your admin." — not a generic 403.
- **Session expired:** Full-page "Your session ended" screen with sign-in button. Attempted URL preserved — user returns to same page after re-auth.
- **Concurrent edit conflict:** Toast: "This record was updated by {user_name} at {time}. Reload to see changes." Manual reload; no auto-refresh that loses the user's in-progress edit.

### Confirmation Patterns

| Action | Confirmation type | Copy pattern |
|---|---|---|
| Delete patient record | Modal, type patient name to confirm | "Type 'Anjali Sharma' to permanently delete this record." |
| Cancel appointment | Dialog | "Cancel the 10:30am appointment for Anjali Sharma with Dr. Patel?" |
| Bulk cancel appointments | Dialog with count | "Cancel 5 appointments? This will notify patients via WhatsApp." |
| Archive patient | Dialog | "Archive Anjali Sharma? They won't appear in search until you unarchive." |
| Override drug allergy | Inline warning | "Amoxicillin conflicts with Anjali's penicillin allergy. Add a reason to override." |
| Send bulk WhatsApp | Dialog | "Send reminders to 47 patients for tomorrow's appointments?" |
| Unsaved form close | Dialog | "[Form name] has unsaved changes. Discard changes?" |

---

## Interaction Primitives

**Keyboard-first for desktop.** Clinic staff completing 60+ operations/day must never be forced to reach for the mouse for primary tasks.

### Global Shortcuts

| Key | Action |
|---|---|
| `Cmd/Ctrl+K` | Open command palette |
| `N` | New — context-aware (New Appointment on /appointments, New Patient on /patients) |
| `Esc` | Close modal/sheet/palette; cancel edit mode |
| `G then D` | Go to Dashboard |
| `G then A` | Go to Appointments |
| `G then P` | Go to Patients |
| `G then R` | Go to Reports |
| `G then S` | Go to Settings |
| `/` | Focus search within the current surface |
| `?` | Open keyboard shortcuts help sheet |

### Table Shortcuts

| Key | Action |
|---|---|
| `↑ / ↓` | Navigate rows |
| `Enter` | Open selected row detail |
| `Space` | Toggle row selection checkbox |
| `Shift+Space` | Select range from last selection |
| `Cmd+A` | Select all rows on current page |
| `E` | Export current view |

### Calendar Shortcuts

| Key | Action |
|---|---|
| `← / →` | Previous / Next week (in week view) |
| `T` | Jump to today |
| `D` | Switch to day view |
| `W` | Switch to week view |
| `M` | Switch to month view |
| `L` | Switch to agenda (list) view |

### Form Conventions

- `Tab` / `Shift+Tab`: advance / retreat through fields in visual order
- `Enter` on last field: submit (single-step forms only; wizard forms require explicit "Next" click)
- `Esc`: cancel edit / close modal
- `Cmd+Enter`: submit at any time in a multi-field form
- Focus management: when a modal opens, focus moves to the first interactive element. When it closes, focus returns to the trigger element.

### Drag & Drop

- Appointment drag (calendar, desktop only): threshold 4px before drag initiates (prevents accidental drags on click).
- Visual feedback during drag: dragged block at 80% opacity, drop targets highlight with `{DESIGN.md components.appointment-slot-available}` style.
- Drop targets: valid slots only. Invalid drops animate back to origin.
- Confirm-on-drop: sheet appears with "Move [patient] to [new time]?" — not an immediate action. Prevents accidental reschedule.

### Animations

All animations: `ease-out`, max 200ms. Never block interaction.

| Element | Animation | Duration |
|---|---|---|
| Modal open | Scale 95%→100% + fade in | 150ms |
| Modal close | Scale 100%→97% + fade out | 100ms |
| Sheet slide (bottom/right) | translateY(100%)→0 / translateX(100%)→0 | 200ms |
| Toast appear | Slide in from right | 200ms |
| Toast dismiss | Fade + slide out | 150ms |
| Skeleton shimmer | Continuous left-to-right shimmer | 1.5s loop |
| Nav item active | Background fill cross-fade | 100ms |
| Appointment drag | No animation (real-time) | — |
| Success action (e.g. Appointment Booked) | Brief scale pulse on the element (1.0→1.02→1.0) | 200ms |
| Calendar slot selection | Background fill transition | 80ms |
| Tab switch | Instant (no animation) | — |

**Reduced motion:** All transitions respect `prefers-reduced-motion: reduce`. Animations collapse to instant show/hide. Skeleton shimmer pauses (static muted background).

---

## Accessibility Floor

Behavioral. Visual contrast ratios live in `DESIGN.md.Colors`.

**Target: WCAG 2.1 AA across all surfaces.**

- **Contrast:** All text vs background meets 4.5:1 (normal text) or 3:1 (large text / graphical elements). Status badges: text+background combination validated. `{DESIGN.md colors.primary}` (#0A6EFF) on white: 4.52:1 (AA pass). `{DESIGN.md colors.muted-foreground}` (#64748B) on white: 4.65:1 (AA pass). Theme override input in Settings > Appearance shows live contrast ratio and blocks values that fail AA.
- **Keyboard navigation:** Complete tab order on all surfaces. No keyboard trap except intentional modal focus trap. `Tab` sequence matches visual reading order (left-to-right, top-to-bottom).
- **Focus rings:** All interactive elements show a visible `{DESIGN.md components.input.focus-ring}` (2px solid primary/30) on focus. Never remove `outline` without providing a custom focus indicator.
- **Screen reader announcements:**
  - Page surface announced on route change: "Appointments, calendar view" / "Patient profile, Anjali Sharma, 34 years"
  - Toast messages announced via `aria-live="polite"` (success/info) or `aria-live="assertive"` (error/warning)
  - Table sort state announced: "Name column, sorted ascending"
  - Command palette results announced as they update via `aria-live="polite"`
  - Skeleton loaders: `aria-busy="true"` on the loading region; announced as "Loading" to screen readers
  - Drug allergy conflict: `role="alert"` — announced immediately on conflict detection
- **Color independence:** Status badges always show icon + text label + color (never color alone). Appointment blocks show initials + time in addition to color. Charts always include text labels and a data table alternative.
- **Touch targets:** Minimum 44x44px for all interactive elements on mobile. Nav items, buttons, and table row tap areas meet this minimum.
- **Dynamic type / zoom:** Layouts tested to 200% browser zoom. No horizontal scrolling at 1280px viewport + 200% zoom. Text does not truncate critically at 150% browser text size.
- **Forms:**
  - `<label>` elements explicitly associated with all inputs via `htmlFor`/`id`.
  - Required fields marked with `aria-required="true"` (not just visual asterisk).
  - Error messages linked to their input via `aria-describedby`.
  - Autocomplete suggestions use `role="listbox"` / `role="option"`.
- **Motion:** All transitions respect `prefers-reduced-motion: reduce` (see Interaction Primitives).
- **Language:** `lang="en"` on root; locale attribute updated when UI language changes (future i18n).
- **Session timeout:** 5-minute idle warning announced via `aria-live="assertive"` before auto-logout. Screen reader users receive the same warning as sighted users.

---

## Responsive & Platform

### Breakpoints

| Breakpoint | Min width | Layout changes |
|---|---|---|
| `sm` | 0px | Mobile — full-width, bottom tab bar, stack everything |
| `md` | 768px | Tablet — sidebar collapsed, 2-column content possible |
| `lg` | 1024px | Desktop — sidebar expanded, multi-column dashboard |
| `xl` | 1280px | Wide desktop — content max-width capped at 1280px |
| `2xl` | 1536px | Large display — sidebar stays; no new layouts |

### Surface-by-Surface Adaptation

**Dashboard:**
- `lg+`: 4 stat cards in a row; 2-column main content (appointment queue + quick info panel)
- `md`: 2 stat cards per row; single-column main content
- `sm`: 2 stat cards per row; vertically stacked sections; FAB for quick actions

**Appointments — Calendar:**
- `lg+`: Full week grid visible; right panel shows appointment detail inline
- `md`: 3-day view; detail in a bottom sheet
- `sm`: Agenda view as default (day-by-day list); calendar icon toggles to a mini monthly picker

**Patient Profile:**
- `lg+`: Header + sticky tabs + tabbed content; tab navigation horizontal
- `md`: Same layout, narrower columns
- `sm`: Header stacks vertically; horizontal scroll tabs stick to top on scroll; full-width sections

**Consultation / EMR:**
- `lg+` and `md`: 2-column split (patient context + consultation form)
- `sm`: Accordion sections; patient context collapses above consultation form

**Tables (general):**
- `lg+`: Full column set
- `md`: Reduce to 4–5 most important columns; "..." cell reveals hidden columns
- `sm`: Card view — each row becomes a card with key fields. Sorting and bulk actions available via action sheet.

### Platform-Specific Notes

**iPad (primary doctor surface):**
- Landscape: 2-column split layout for consultation. Sidebar visible.
- Portrait: Sidebar auto-collapses. Tabs accessible.
- Touch: Tap-to-select instead of hover-to-reveal for row actions. Long-press for drag operations.
- Keyboard (Magic Keyboard): all keyboard shortcuts active. Global shortcuts work.

**Android / Chrome mobile:**
- Bottom navigation respects system gesture navigation (avoids conflict with system swipe areas).
- Minimum font size enforced (no sub-12px text) for Android text scaling compatibility.

**Print:**
- Prescription pages and invoices have `@media print` styles that remove chrome (sidebar, topbar, action buttons) and render clean, letterhead-quality output.
- All print views include clinic logo, clinic address, and date/time of print.

---

## Healthcare-Specific Concerns

### Privacy by Default

- Patient phone numbers, email, and date of birth are masked in all list views and the dashboard waiting queue (`• • • • • • 4 3 2 1`, `a***@email.com`). Click-to-reveal with a brief highlight animation confirms the data is now visible.
- Reveal expires: masked again after 60 seconds of inactivity on that record.
- On-screen patient lists in reception contexts (appointment queue) show full name only — demographic details masked by default.

### Audit Trail

- Every create/edit/delete action on patient records, prescriptions, and invoices is logged server-side.
- In the UI, all editable records show "Last updated by {user_name} on {date}" below the record. This is not editable.
- Consultation notes locked from editing after 24 hours (an addendum note must be created instead).
- Delete operations are soft-deletes; records recoverable by admin within 30 days.

### Drug Conflict Checks

- Prescription form performs a real-time (200ms debounced) check of the selected drug against:
  - Patient's known allergies (pulled from patient record)
  - Patient's active medications (from active prescriptions)
- Conflict states:
  - Allergy conflict: `{DESIGN.md components.prescription-card.warning-border}` card with allergy name and drug class
  - Drug interaction: amber warning card with interaction severity (Major / Moderate / Minor)
- Both require explicit "Override — add reason" action. The reason is logged in the prescription record.

### Session Security

- 15-minute auto-logout on inactivity (configurable by admin, 5–60 min).
- Warning at T-5 minutes via `{DESIGN.md components.toast.warning-*}` toast (persistent) + screen reader announcement.
- After logout: return to login page; attempted URL preserved in query param for post-auth redirect.

### Multi-Tenancy Theme Safety

- Client color overrides in Settings > Appearance are validated against WCAG AA before saving.
- Invalid combinations show an inline error: "This color combination fails accessibility standards (contrast ratio: 2.1:1, minimum 4.5:1). Choose a darker primary color."
- Theme changes apply immediately (CSS custom property update in-memory) but require "Save" to persist.
- Preview pane in Settings > Appearance shows affected elements in real-time.

---

## Inspiration & Anti-patterns

**Lifted from Linear:**
- Command palette (`Cmd+K`) as the primary navigation instrument for power users
- Keyboard shortcuts using single keys on primary surfaces (`N` for new, `G→D` for go to dashboard)
- Collapsed sidebar with icon-only mode
- Dense but breathable data lists — no wasted vertical space
- "Instant" feel: optimistic updates everywhere

**Lifted from Stripe:**
- Stat card design — large numeric value, label above, trend below; trust through precision
- Table design — horizontal density, clear row separation, functional over decorative
- Form design — inline validation, micro-copy that explains rather than warns
- The concept of "surfaces" — each major domain has its own coherent surface, not a sea of nested modals

**Lifted from Notion:**
- Inline editing (click to edit, blur to save) on patient profile fields
- Section-based layout within profiles (groups of related fields, not a giant form)
- Calm, unhurried empty states that feel like an invitation, not a failure

**Lifted from Vercel/Framer:**
- Premium card design with border-instead-of-shadow
- Sidebar organization with label-grouped sections
- Consistent visual weight — no element screams for attention

**Rejected patterns:**

- **Dashboard as "command center" with 20 widgets**: Cognitive overload. Chikitsa360 dashboard answers 4 questions; not a BI tool masquerading as a clinic tool.
- **Date pickers that require clicking through 3 months**: Always show a compact calendar + a text input that accepts natural language ("next monday", "3 jun").
- **Tabs that navigate away (router tabs)**: All tabs within a patient profile or settings page are client-side tab panels. Back button takes you to the list, not to the previous tab.
- **Toast for every save**: Auto-save is silent. Explicit user actions (button click saves, form submits) show a toast. Background auto-saves show only the "Draft saved at X:XX" inline indicator.
- **Multi-page appointment booking**: The 3-step wizard fits in a modal. Sending the user through 3 separate pages for booking is a clinic workflow killer.
- **Admin-only reports behind a "Reports" module nobody visits**: Key KPIs surfaced directly on the Dashboard (today's revenue, no-show count). Reports module is for deep-dive; not the daily awareness layer.
- **"Are you sure?" dialogs**: Every confirmation names the subject ("Cancel Anjali Sharma's 10:30am appointment?"). Generic OK/Cancel dialogs are banned.

---

## Key Flows

### Flow 1 — Priya registers a walk-in patient and books an appointment (Reception)

Priya, 26, is at the reception desk. It's 9:45am. A woman walks in and says she needs to see the doctor. She's never visited this clinic before.

1. Priya hits `N` (keyboard shortcut). Command palette opens pre-filtered to creation actions.
2. She selects "Add Patient." New Patient form opens as a modal.
3. She types the patient's name — "Anjali Sharma." The form's remaining fields are blank (no autofill match).
4. Phone number entered. Date of birth selected from the date picker. Clinic city auto-fills address.
5. Priya clicks "Save & Book Appointment." Patient saved; form transitions directly to Step 2 of the booking flow (patient pre-filled from the new record).
6. She selects Dr. Patel (the available doctor), picks the earliest open slot (10:15am — green background).
7. Step 3: Confirmation. "Send WhatsApp confirmation" toggle is ON. She clicks "Book."
8. **Climax:** The modal closes. In the Appointments calendar, a new block appears at 10:15am for Anjali Sharma. The Waiting Queue widget on the dashboard shows +1. Priya's screen is already back to the main view. She turns to Anjali and says, "You're booked with Dr. Patel at 10:15."

Total clicks: 6. Total time (experienced): ~45 seconds.

Failure: If Anjali turns out to be in the system (same phone number), the form shows a duplicate warning: "A patient matching this phone number exists — Anjali Sharma, DOB 14/06/1988. Use this record?" Priya confirms, and the booking flow continues with the existing record.

---

### Flow 2 — Dr. Arjun reviews a returning patient and writes a prescription (Doctor)

Dr. Arjun, 38, between consultations. He has 3 minutes before Priya Kapoor (hypertensive, on 2 medications) enters. He's on his iPad, Chikitsa360 open in landscape.

1. Arjun opens the Patient list, searches "Priya Kapoor." Her card appears instantly — last visit 6 weeks ago, 2 active prescriptions flagged.
2. He taps her profile. The Patient Profile opens on the **Timeline** tab (default). Last visit: "14 Apr — Consultation, Dr. Arjun — BP 148/92, Amlodipine 5mg increased to 10mg."
3. He taps the **Prescriptions** tab. He sees Amlodipine 10mg and Telmisartan 40mg are active.
4. Priya enters. He taps "New Consultation" from the patient header's Quick Actions.
5. The consultation form opens in a 2-column view: left shows Priya's vitals history (sparkline), allergies, and active meds; right shows the consultation form.
6. He types chief complaint: "BP review." Selects diagnosis: "Hypertension, essential (I10)." Types plan: "Continue current medications. Lifestyle counseling."
7. He taps "Add Prescription." Drug name: starts typing "Amlo" — autocomplete shows Amlodipine. Duration 30 days, twice daily. Drug-allergy check: no conflict. Drug-interaction check: no conflict with Telmisartan.
8. **Climax:** He taps "Save Consultation." The note appears in the Timeline instantly. The prescription PDF is auto-generated and available for download. Priya sees the doctor close the iPad and hand her the prescription. Total time in the app: 4 minutes.

Failure: If he types "Amoxicillin" by mistake, the prescription form immediately shows a `{DESIGN.md components.prescription-card.warning-border}` alert: "Amoxicillin conflicts with Priya Kapoor's penicillin allergy (noted 2021)." He clears the drug and selects the correct one.

---

### Flow 3 — Rakesh reviews monthly performance across 3 clinics (Admin)

Rakesh, 45, Monday 8am. On his MacBook. He runs 3 clinics and wants to know if last month was up or down.

1. He opens Chikitsa360. The clinic switcher in the sidebar header shows "Andheri Clinic" (his default). He clicks it and selects "All Clinics."
2. The Dashboard refreshes: stat cards now show consolidated figures across all 3 clinics. Revenue: ₹4,82,000 (May 2026), +12% vs April. Appointments: 1,847. No-shows: 6.2%.
3. He clicks "Reports" in the sidebar. Goes directly to the **Revenue** tab. A chart shows all 3 clinics with separate lines.
4. He notices Bandra Clinic is the outlier — flat revenue month-over-month. He clicks on the Bandra line in the chart. The table below filters to Bandra data only.
5. He sees no-shows at Bandra are 11% (vs 4–5% at other clinics). He clicks "No-shows" column header to sort descending — Dr. Iyer has 14 no-shows, significantly above others.
6. He clicks Dr. Iyer's row. Doctor profile opens: appointment schedule is sparse on Thursdays.
7. **Climax:** Rakesh closes the report and opens WhatsApp from his phone to message his Bandra clinic manager. He has the specific insight (Dr. Iyer, Thursdays, no-show pattern) without having exported a single spreadsheet. Total time: 6 minutes.

Failure: If the date range is set to the current month (partial), the comparison is skewed. Reports surface shows "May 2026 (in progress — showing 1–7 Jun)" — clear labeling prevents misreading partial month data.

---

### Flow 4 — Priya sends WhatsApp appointment reminders for tomorrow (Reception)

End of day, 6pm. Priya wants to ensure tomorrow's patients are confirmed.

1. She opens the Appointments surface, switches to **Agenda** view. Sets the date filter to "Tomorrow" (single click on the date chip).
2. The list shows 24 appointments. She clicks the header checkbox — all 24 selected. The Bulk Actions bar appears: "24 selected — Send WhatsApp Reminder, Confirm All, Export."
3. She clicks "Send WhatsApp Reminder." A dialog: "Send appointment reminders to 24 patients for tomorrow, Wed 8 Jun?" Shows the template: "Hi {name}, your appointment with Dr. {doctor} is confirmed for tomorrow at {time}. Reply CONFIRM or CANCEL."
4. She clicks "Send." Bulk send dispatches. A toast: "Sending reminders to 24 patients..." (progress indicator).
5. After ~5 seconds: "24 reminders sent. Delivery updates will appear in each patient's Communication tab."
6. **Climax:** Priya closes her laptop. Tomorrow morning, the Communication tab for each patient will show Delivered / Read status. Patients who reply CANCEL will trigger an automatic appointment status update to "Cancelled" and a notification to Priya.

Failure: If 3 patients have no WhatsApp number registered, the dialog shows: "21 of 24 patients have WhatsApp numbers registered. 3 will not receive reminders." She can click "View 3 patients" to add their numbers before proceeding.

---

## Multi-tenancy & Theme Switching

### How Theme Switching Works (End-to-End)

1. **Deployment-level (default):** `NEXT_PUBLIC_CLIENT_ID` is set at build time (e.g. `chikitsa360`, `mediflow`). The branding package resolves the client's theme JSON and injects CSS custom properties into `<head>` via the root layout. This is the client's brand identity.

2. **User-level (in-app):** Logged-in users can override the base theme via Settings > Appearance.
   - **Preset:** Light, Dark, High Contrast. Overrides only the surface/card/border tokens; brand colors unchanged.
   - **Custom brand colors:** Admin can input a primary and secondary hex. The system validates contrast in real-time. Saved as `user_preferences.theme_overrides` on the server.
   - **Scope:** User-level overrides apply to that user's session only, across devices (server-synced). They do not affect other users' experience.

3. **Theme token architecture:** All tokens use CSS custom properties (`--chikitsa-color-primary`, etc.). JavaScript applies overrides by updating the `<style>` tag in `<head>` in real-time. On next page load, server renders the correct tokens server-side to prevent flash of wrong theme (FOUT).

4. **Client custom themes:** Clinic admin can also define clinic-wide theme overrides (apply to all staff at that clinic) via a separate "Clinic Branding" sub-section (admin-only). These are lower priority than user-level overrides — if a user sets their own dark mode, it overrides the clinic's light theme.

### Theme Priority Stack (lowest to highest)

```
@chikitsa360/branding default (Chikitsa360 brand)
  ↑
Deployment-level client theme (NEXT_PUBLIC_CLIENT_ID)
  ↑
Clinic-level admin overrides (clinic branding settings)
  ↑
User-level preset (Light / Dark / High Contrast)
  ↑
User-level custom color overrides
```
