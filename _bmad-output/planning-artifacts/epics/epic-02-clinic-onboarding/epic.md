---
epic: 2
title: Clinic Onboarding & Setup
status: Not Started
created: 2026-06-07
stories: 4
depends_on: [Epic 1]
---

# Epic 2: Clinic Onboarding & Setup

## Goal

A new Clinic Owner completes the guided 4-step setup wizard — clinic profile, doctors, working hours, WhatsApp Business number connection — in under 30 minutes, with the platform ready to accept its first booking.

## User Outcome

After this epic is complete:
- Clinic Owner can create their clinic profile and accept legal terms (ToS, Privacy Policy, DPA)
- At least one Doctor is added with their schedule and slot duration configured
- Working hours are set per Doctor, generating bookable slots from the next calendar day
- WhatsApp Business number is connected (or skipped with a persistent reminder)
- A sample appointment is auto-created to show the Owner how the calendar looks
- All Settings pages for Clinic Profile, Working Hours, and Doctors are editable post-wizard
- The platform is in a bookable state for Epic 3 (WhatsApp Booking Flow)

## Requirements Covered

| Category | Items |
|---|---|
| Functional | FR-13 (working hours + slot config), FR-36 (guided setup wizard), FR-37 (sample appointment on signup) |
| Compliance | CR-6 (ToS + Privacy Policy accessible before data collection), CR-7 (Grievance Officer in Privacy Policy) |
| NFRs | NFR-23 (wizard median completion < 30 minutes), NFR-25 (respectful tone in all wizard copy) |
| UX Design | UX-DR27 (Settings pages: Clinic Profile, Working Hours, Doctors, WhatsApp), UX-DR28 (4-step onboarding wizard) |

## Stories

| # | Title | Status |
|---|---|---|
| [2.1](story-02-01-clinic-profile-and-legal.md) | Clinic Profile Setup & Legal Acceptance | Not Started |
| [2.2](story-02-02-doctor-setup-and-working-hours.md) | Doctor Setup & Working Hours Configuration | Not Started |
| [2.3](story-02-03-whatsapp-business-connection.md) | WhatsApp Business Number Connection | Not Started |
| [2.4](story-02-04-wizard-completion-and-sample-appointment.md) | Wizard Completion & Sample Appointment | Not Started |

## Dependencies

- **Epic 1** must be complete: next-auth sessions, DB schema (clinics, users, doctors, working_hours, notification_settings tables), layout shell, i18n, design tokens.

## Key Technical Notes

- Wizard state persists in DB (each step is independently saveable) — not in-memory/session only
- WhatsApp connection uses Meta Embedded Signup (iframe/popup) — Meta Cloud API credentials stored encrypted in Clinic settings
- Working hours changes take effect the NEXT calendar day — intra-day slot structure is frozen at day-start (FR-13)
- `notification_settings` record created with both reminders enabled by default (FR-25) — used by Epic 7
- Slug is auto-generated from clinic name; one-time editability constraint enforced at DB + API layer
- Legal acceptance timestamps (`tos_accepted_at`, `privacy_accepted_at`, `dpa_accepted_at`) stored on Clinic record — required before any patient data collection (CR-1 enforcement in Epic 3 depends on this)
