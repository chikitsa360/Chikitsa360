---
story: 4.2
epic: 4
title: Web Booking Real-Time Integration & Portal Sync
status: review
baseline_commit: 4726811ba8737c9ef0947d6d2fd43d7eda09bca7
created: 2026-06-07
requirements:
  functional: [FR-7, FR-8, FR-9]
  nfr: [NFR-2, NFR-16]
  ux: [UX-DR27]
---

# Story 4.2: Web Booking Real-Time Integration & Portal Sync

## User Story

As a Clinic Owner,
I want web bookings to appear instantly in the portal calendar and the booking page to always show accurate slot availability,
So that staff always have an accurate view and patients never accidentally book an already-taken slot they see in a stale page.

## Context

This story focuses on the integration side of the Web Booking Link:
1. **Portal real-time:** Web bookings trigger Pusher events → portal calendar updates within 5 seconds
2. **Slot freshness:** Slot availability API is optimised for fast response; stale page handling is graceful
3. **Booking link sharing UX:** Clinic Settings → Clinic Profile surfaces the booking URL with copy, WhatsApp share, and QR code
4. **Accessibility pass:** Automated contrast audit (axe-core) on the public booking page in CI

## Acceptance Criteria

**Given** a patient completes a booking via the Web Booking Link,
**When** the Appointment is created in the DB,
**Then** a Pusher event `appointment.created` is published to `private-clinic-{clinicId}` channel within 500ms of DB commit.
**And** any open portal session subscribed to this channel receives the event and calls `queryClient.invalidateQueries(['appointments', clinicId])`.
**And** the portal dashboard and calendar show the new appointment within 5 seconds without a manual refresh.

**Given** a Receptionist has the calendar open on the portal and a patient books via the web link simultaneously,
**When** the Pusher event arrives,
**Then** the calendar appointment count updates in real time (animated counter transition — UX-DR42).
**And** if the Receptionist is viewing today's slots, the booked slot is no longer shown as available.

**Given** a patient opens the Web Booking Link and sits on the page for 5 minutes before selecting a slot,
**When** they tap a slot that another patient booked in the interim,
**Then** the `SELECT FOR UPDATE SKIP LOCKED` on submission detects the conflict.
**And** the page shows "That slot was just taken. Please choose another time." and the grid refreshes with current availability (no page reload — just a React Query `invalidate` on the slots API).

**Given** the slot availability API `GET /api/v1/slots/available` is called,
**When** the request is processed,
**Then** it responds in under 500ms for a clinic with up to 500 appointments in the current month (NFR-4 alignment).
**And** it does NOT require authentication — the endpoint is public (rate-limited by IP + slug).
**And** the response is never cached server-side with stale data — always computed fresh from current DB state.

**Given** I am a Clinic Owner viewing Settings → Clinic Profile,
**When** the page renders,
**Then** the Booking URL section shows:
- The full booking URL: `cliniqly.com/book/{slug}` in a monospace/code-styled box
- A "Copy Link" button: copies URL to clipboard; shows "Copied! ✓" feedback for 2 seconds
- A "Share on WhatsApp" button: opens `https://wa.me/?text=Book+at+our+clinic%3A+{encodedURL}` (WhatsApp share)
- A "Download QR Code" button: downloads a PNG QR code (400×400px) of the booking URL, branded with clinic name below the QR code

**Given** I click "Download QR Code",
**When** the QR PNG is generated,
**Then** it contains a valid QR code encoding `https://cliniqly.com/book/{slug}`.
**And** the clinic name appears as text below the QR code (for printing on visiting cards/posters).
**And** the PNG is 400×400px minimum at 72 DPI.
**And** the file is named `{clinic-slug}-booking-qr.png`.

**Given** axe-core runs against the public booking page in Playwright CI,
**When** the automated accessibility audit runs,
**Then** zero WCAG 2.1 AA violations are reported.
**And** all slot buttons have discernible accessible names (e.g. `aria-label="10:00 AM with Dr. Sharma"`).
**And** the patient form's inputs have associated labels.

**Given** the booking page is loaded on a 3G connection (Lighthouse slow-3G simulation),
**When** the performance audit runs,
**Then** the page loads in under 5 seconds (NFR-17).

**Given** the booking page is crawled by search engines or link preview bots (WhatsApp, Twitter, etc.),
**When** the bot fetches the page,
**Then** the following meta tags are present in the `<head>`:
- `<title>{Clinic Name} — Book an Appointment | Cliniqly</title>`
- `<meta name="description" content="Book your appointment at {Clinic Name} in {City}. Choose from available slots. No app needed.">`
- `<meta property="og:title" content="{Clinic Name} — Book an Appointment">`
- `<meta property="og:description" content="Book your appointment easily at {Clinic Name}. No app download needed.">`
- `<meta property="og:image" content="https://cliniqly.com/og/book/{slug}.png">` (dynamically generated OG image)
- `<meta property="og:url" content="https://cliniqly.com/book/{slug}">`

**Given** a Clinic changes their working hours (via Settings → Working Hours),
**When** the change takes effect the following day,
**Then** the Web Booking Link's slot grid automatically reflects the updated hours from midnight IST — no manual action needed (slot computation is always live from DB).

## UX Design Reference

**EXPERIENCE.md — Multi-tenancy & Theme Switching applied to the booking page:**
The public booking page applies the clinic-level theme override (Step 2 of the theme priority stack — UX-DR2). If the Clinic has custom brand colors configured (Phase 1 feature), the booking page reflects their brand. For MVP, the Chikitsa360/Cliniqly default theme is used for all clinics.

**DESIGN.md — QR code download:**
- QR code itself: black on white, high error correction (level H — survives printing degradation)
- Container: white card, clinic name below QR in 14px semibold Inter, small Cliniqly logo in corner
- PNG dimensions: 400×400px for the QR + 40px padding + 40px clinic name text below = ~480×480px total

**EXPERIENCE.md — Real-time update behaviour (from 4-layer reliability pattern):**
- Layer 1: Pusher push event → React Query `invalidateQueries` → refetch → calendar updates
- Layer 2: On Pusher reconnect → full cache invalidation (in case events were missed during disconnect)
- Layer 3: 10-second polling fallback when Pusher connection is down
- Layer 4: Optimistic UI on Receptionist-initiated actions (not applicable to web booking — portal is the consumer, not the actor here)

## File Locations

```
apps/web/
  src/
    app/
      (booking)/
        book/
          [slug]/
            page.tsx                        ← Updated: add meta tags, OG image link
      api/
        v1/
          slots/
            available/
              route.ts                      ← GET: public slot availability (rate-limited by IP)
          clinics/
            [clinicId]/
              qr-code/
                route.ts                    ← GET: generate QR PNG (authenticated — from Settings)
        og/
          book/
            [slug].png/
              route.ts                      ← GET: dynamic OG image generation (public)
    components/
      settings/
        BookingLinkCard.tsx                 ← Copy link + WhatsApp share + QR download in Settings
    lib/
      qr-code.ts                            ← QR code generation using `qrcode` npm package
      og-image.ts                           ← OG image generation using `@vercel/og` or `satori`
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | QR code: encodes correct URL; clinic name included in output | 100% |
| Integration | Slot availability API: responds in < 500ms for 500-appointment clinic | Performance assertion |
| Integration | Slot availability API: public (no auth); rate-limited by IP | 100% |
| Integration | Web booking → Pusher event published to correct channel | 100% |
| Playwright (E2E) | Pusher event → portal calendar counter updates within 5s | Core path |
| Playwright | Copy link button: clipboard content = correct booking URL | Core path |
| Playwright | axe-core audit on booking page: zero violations | Must pass in CI |
| Lighthouse | 3G load time < 5s (NFR-17) | Must pass in CI |

## Notes

- OG image generation: use `@vercel/og` (Edge Runtime compatible) for fast image generation without a separate server
- QR code library: `qrcode` npm package (small, well-maintained, supports Buffer output for PNG)
- Rate limiting on public slot API: use Upstash Rate Limit with `{clinicSlug}:{clientIP}` key (prevents scraping all clinic slots)
- The slot availability API returns slots as computed from working_hours — NOT from a pre-generated slots table. This ensures always-fresh data.
- The booking page does NOT use next-auth or session cookies — no auth cookies are set for public visitors
