---
epic: 1
title: Platform Foundation & Clinic Authentication
status: Not Started
created: 2026-06-07
stories: 5
---

# Epic 1: Platform Foundation & Clinic Authentication

## Goal

Clinic Owners can sign up, log in with phone OTP, invite Doctors and Receptionists, and access a working portal with role-appropriate navigation and a consistent design system — all infrastructure wired and ready for every subsequent feature.

## User Outcome

After this epic is complete:
- A Clinic Owner can sign up and log in with a 6-digit OTP sent via SMS
- The Owner can invite Doctors and Receptionists by phone number
- Each role sees only their permitted navigation and features
- The portal has the full design system (tokens, themes, layout shell, core components) applied
- The bilingual (English + Hindi) i18n system is in place
- The CI/CD pipeline enforces code quality on every PR
- All infrastructure (Prisma, Redis, Inngest, Pusher, audit logging) is wired and ready

## Requirements Covered

| Category | Items |
|---|---|
| Functional | FR-33 (RBAC), FR-34 (Phone OTP login), FR-35 (Staff invitation & management) |
| Architecture | ARCH-1 (Prisma + RLS + tenant schema), ARCH-2 (next-auth v5 + RBAC middleware), ARCH-3 (next-intl), ARCH-4 (Inngest setup), ARCH-5 (Pusher Channels setup), ARCH-6 (Upstash Redis), ARCH-7 (Zod schemas), ARCH-8 (Vitest + Playwright + testcontainers), ARCH-10 (audit schema), ARCH-11 (CI/CD), ARCH-12 (API versioning + security headers), ARCH-14 (rate limiting) |
| NFRs | NFR-7 (TLS 1.3), NFR-8 (AES-256 at rest), NFR-9 (PostgreSQL RLS), NFR-10 (sessions), NFR-11 (webhook validation infrastructure), NFR-12 (i18n), NFR-15 (WCAG 2.1 AA), NFR-16 (3G capable, 44px targets), NFR-21 (API rate limiting) |
| Compliance | CR-4 (AWS ap-south-1 data residency), CR-5 (breach logging infrastructure), CR-8 (SPDI security practices), CR-12 (5-year immutable audit schema), CR-14 (no HIPAA claims) |
| UX Design | UX-DR1 (design tokens), UX-DR2/3 (theming + theme priority stack), UX-DR6 (Alert), UX-DR9 (EmptyState), UX-DR10 (Input), UX-DR11 (Select), UX-DR12 (Spinner), UX-DR16 (sidebar nav), UX-DR17 (header), UX-DR30 (keyboard navigation), UX-DR31 (focus rings), UX-DR32 (skeleton loaders), UX-DR36/37/38 (i18n bilingual + Hinglish), UX-DR39 (optimistic UI pattern), UX-DR40 (toast system) |

## Stories

| # | Title | Status |
|---|---|---|
| [1.1](story-01-01-core-stack-and-database.md) | Core Stack Installation & Database Schema | Not Started |
| [1.2](story-01-02-i18n-and-ci-pipeline.md) | i18n Infrastructure & CI/CD Pipeline | Not Started |
| [1.3](story-01-03-design-system-and-layout.md) | Design System & Application Layout Shell | Not Started |
| [1.4](story-01-04-phone-otp-auth.md) | Phone OTP Authentication | Not Started |
| [1.5](story-01-05-rbac-and-staff-management.md) | Role-Based Access Control & Staff Management | Not Started |

## Dependencies

None — this is the first epic. All subsequent epics depend on this one.

## Key Technical Decisions (from Architecture Doc)

- **ORM:** Prisma with PostgreSQL 16 (Neon for dev, AWS RDS ap-south-1 for prod)
- **Multi-tenancy:** Shared DB, separate schema per clinic (`clinic_{clinicId}`)
- **RLS:** PostgreSQL Row-Level Security policies (not Prisma-managed)
- **Auth:** next-auth v5 + custom phone OTP Credentials provider + MSG91
- **Session:** HttpOnly cookie, 30-day, re-auth on new device
- **Jobs:** Inngest (serverless-native, Vercel Free compatible)
- **Real-time:** Pusher Channels for MVP (→ Socket.io Phase 1)
- **Redis:** Upstash (conversation state + rate limiting + OTP attempts)
- **i18n:** next-intl (App Router native, compile-time messages)
- **Testing:** Vitest + React Testing Library + Playwright + testcontainers-node

## Notes

- Monorepo is already initialised (Turborepo + pnpm, Next.js 15, Tailwind v4, `@chikitsa360/ui`, `@chikitsa360/branding`). This epic installs the new stack layers on top.
- The audit schema is created in Story 1.1 but populated by subsequent epics as staff actions on patient data are implemented.
- ARCH-9 (slot race condition: `SELECT ... FOR UPDATE SKIP LOCKED`) is implemented in Epic 3 when appointment booking is built.
- ARCH-13 (Meta webhook handler) is implemented in Epic 3.
- ARCH-15 (starter template note) — existing monorepo infrastructure already in place.
