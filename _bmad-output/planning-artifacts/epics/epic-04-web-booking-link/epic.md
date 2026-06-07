---
epic: 4
title: Web Booking Link
status: Not Started
created: 2026-06-07
stories: 2
depends_on: [Epic 1, Epic 2, Epic 3]
---

# Epic 4: Web Booking Link

## Goal

Every clinic has a shareable public URL (`cliniqly.com/book/{slug}`) patients can open on any phone browser to browse available slots and confirm a booking — no app download, no account required, WhatsApp confirmation sent automatically.

## User Outcome

After this epic is complete:
- Each clinic's public booking page is live from Day 1 at a unique URL
- Patients on mobile browsers can view available slots and book in under 60 seconds
- Patient de-duplication works (existing records matched by phone number)
- WhatsApp confirmation sent automatically after web booking (shared with Epic 3's confirmation service)
- Web bookings appear instantly in the clinic portal calendar
- Slot race conditions are handled gracefully (same `SELECT FOR UPDATE SKIP LOCKED` logic)
- The page loads in < 3s on 4G and works on iOS Safari 16+ and Android Chrome
- Clinic booking link is shareable with copy, WhatsApp share, and QR code

## Requirements Covered

| Category | Items |
|---|---|
| Functional | FR-7 (unique web booking URL), FR-8 (slot browsing + booking), FR-9 (post-web-booking WhatsApp confirmation) |
| NFRs | NFR-2 (< 3s page load on 4G), NFR-16 (44px touch targets on mobile), NFR-17 (< 5s on 3G) |
| UX Design | UX-DR29 (web booking page — mobile-first, slot grid, patient form, success screen) |
| Monetisation | MON-3 (soft paywall: show "unavailable" message when plan expired) |

## Stories

| # | Title | Status |
|---|---|---|
| [4.1](story-04-01-public-booking-page.md) | Public Booking Page (Slot Browser & Patient Form) | Not Started |
| [4.2](story-04-02-real-time-slot-availability.md) | Web Booking Real-Time Integration & Portal Sync | Not Started |

## Dependencies

- **Epic 1:** Prisma DB schema, Pusher, audit logging
- **Epic 2:** Working hours config (slot computation), clinic profile (name, address, slug)
- **Epic 3:** `scheduleConfirmation(appointmentId)` shared service (Story 3.4), slot locking (`SELECT FOR UPDATE SKIP LOCKED`), Pusher `appointment.created` event

## Key Technical Notes

- Web Booking page is a Next.js App Router route in the `(booking)` route group — NO sidebar, NO auth, fully public
- Slot availability is fetched client-side on page load (React Query) — not in page's initial HTML (privacy)
- The `(booking)` route group has NO next-auth middleware — explicitly excluded from protected routes
- Slug → clinicId lookup: public `GET /api/v1/clinics/by-slug/{slug}` endpoint (rate-limited, returns only public clinic info)
- Reuses the slot computation logic from Story 2.2 (`computeAvailableSlots(clinicId, doctorId?, date)`)
- QR code: generated server-side using `qrcode` npm package; served as PNG from an API route
