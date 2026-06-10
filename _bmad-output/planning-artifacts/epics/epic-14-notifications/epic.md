---
epic: 14
title: Notifications & Patient Self-Cancellation
status: Not Started
created: 2026-06-10
stories: 6
---

# Epic 14: Notifications & Patient Self-Cancellation

## Goal

Every registrant receives a WhatsApp confirmation after booking, a 24h reminder before the event, and change/cancel notifications if the event is updated or cancelled. Patients can self-cancel via a single-use token link or a WhatsApp keyword.

## User Outcome

After this epic is complete:
- Patients receive a WhatsApp confirmation with reference number and cancellation link immediately after registration
- Patients receive a 24h WhatsApp reminder (respects clinic toggle + patient opt-out)
- If event details change, all confirmed registrants are notified via WhatsApp
- If the event is cancelled, all registrants and waitlist entries are notified
- Patients can self-cancel by clicking the token link (public page, no login) or replying CANCEL_EVENT_REG:{id} on WhatsApp
- On self-cancel, the first waitlist entry is auto-promoted and receives a confirmation

## Requirements Covered

| Category | Items |
|---|---|
| Functional | FR-13 (reg confirmation WA), FR-14 (24h reminder), FR-15 (change notification), FR-16 (cancel notification), FR-17 (self-cancel confirmation WA), FR-18 (self-cancellation methods) |
| NFRs | NFR-3 (WA template pre-approval), NFR-4 (SMS fallback), NFR-8 (token expiry at event start_time) |
| Technical | TECH-4 (Inngest functions), TECH-6 (reuse WA sender + SMS fallback), TECH-7 (CANCEL_EVENT_REG keyword in webhook) |

## Stories

| # | Title | Status |
|---|---|---|
| [14.1](story-14-01-registration-confirmation.md) | Registration Confirmation WhatsApp | Not Started |
| [14.2](story-14-02-24h-event-reminder.md) | 24h Event Reminder | Not Started |
| [14.3](story-14-03-event-change-notification.md) | Event Change Notification | Not Started |
| [14.4](story-14-04-event-cancellation-notification.md) | Event Cancellation Notification | Not Started |
| [14.5](story-14-05-self-cancellation-token.md) | Patient Self-Cancellation via Token URL | Not Started |
| [14.6](story-14-06-self-cancellation-whatsapp.md) | Patient Self-Cancellation via WhatsApp Keyword + Auto-Promotion | Not Started |

## Dependencies

Depends on Epics 12 and 13. The `event/registration.confirm` Inngest event is fired from Epic 13 (Story 13.5); this epic implements the consumer function.

## Key Technical Decisions

- **Inngest functions:** `event-registration-confirm`, `event-reminder-24h`, `event-change-notification`, `event-cancel-notification`, `event-registration-cancelled` — all registered in `/api/inngest/route.ts`
- **WA templates required (submit to Meta before go-live):** `event_invitation`, `event_confirmation`, `event_reminder_24h`, `event_change_notification`, `event_cancellation`
- **SMS fallback:** All 5 WA sends wrapped in try/catch; on failure, call `sendSms()` from `lib/sms/msg91.ts`
- **Token URL:** `/events/[slug]/cancel?token=...` — public route (no auth), single-use, expires at event `start_time`
- **WhatsApp keyword:** Parse `CANCEL_EVENT_REG:{registrationId}` in `whatsapp-message-received.ts` BEFORE `isKeyword()` check — same pattern as `CANCEL_APPOINTMENT:{aptId}` added in Epic 07
- **Reminder scheduling:** `inngest.send({ name: 'event/reminder.24h', ts: eventStartTime - 86400000 })` — `ts` is number (epoch ms), not Date object
- **Reminder toggle:** New `eventReminder24hEnabled` boolean on Prisma `Clinic` model (PATCH /api/v1/clinics/settings, same as appointment reminder toggles)
