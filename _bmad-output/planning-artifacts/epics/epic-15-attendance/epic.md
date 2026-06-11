---
epic: 15
title: Attendance Tracking & Manual Management
status: review
created: 2026-06-10
stories: 4
---

# Epic 15: Attendance Tracking & Manual Management

## Goal

Clinic staff can mark each registrant as attended or no-show after the event starts, bulk-mark all attendees, manually remove registrants or promote waiting list entries, and events auto-transition to completed 24 hours after end time.

## User Outcome

After this epic is complete:
- Staff can open the Registrants tab after an event starts and see "Mark Attended" / "No-Show" buttons per row
- Selecting multiple rows shows a bulk action bar for bulk attendance marking
- Buttons are disabled (with tooltip) when the event has not yet started
- Staff can remove a registrant (frees their seat and triggers auto-promotion) or promote a waiting list entry manually
- Events automatically move to `completed` status 24h after `end_time` if not already closed
- All actions are written to the audit log

## Requirements Covered

| Category | Items |
|---|---|
| Functional | FR-21 (manual management), FR-22 (attendance marking) |
| NFRs | NFR-7 (audit log) |
| UX Design | UX-6 (attendance marking UI — post start_time enabled, bulk action bar) |

## Stories

| # | Title | Status |
|---|---|---|
| [15.1](story-15-01-attendance-marking-api.md) | Attendance Marking API | Not Started |
| [15.2](story-15-02-attendance-marking-ui.md) | Attendance Marking UI | Not Started |
| [15.3](story-15-03-manual-registrant-management.md) | Manual Registrant Management | Not Started |
| [15.4](story-15-04-event-auto-completion.md) | Event Auto-Completion | Not Started |

## Dependencies

Depends on Epics 12 and 13 (event and registration tables must exist). Story 15.3 fires `event/registration.cancelled` which requires Epic 14 Story 14.6's Inngest function to be in place for auto-promotion to work.

## Key Technical Decisions

- **Attendance gate:** API returns 422 with code `EVENT_NOT_STARTED` if `event.start_time > NOW()`
- **Status transitions:** `registered → attended | no_show` only; cannot mark cancelled registrations
- **Manual remove:** Sets registration status=cancelled, decrements `seats_registered` (SELECT FOR UPDATE guard), fires `event/registration.cancelled` Inngest event (triggers auto-promotion from Epic 14)
- **Manual promote:** Directly creates registration record, increments `seats_registered`, fires `event/registration.confirm` Inngest event
- **Auto-completion:** Inngest cron `0 * * * *` (every hour) — find all `status=published` events where `end_time < NOW() - INTERVAL '24 hours'`; update to `completed`
- **Audit actions:** `ATTENDANCE_MARKED`, `REGISTRANT_REMOVED`, `WAITLIST_PROMOTED`, `EVENT_AUTO_COMPLETED`
