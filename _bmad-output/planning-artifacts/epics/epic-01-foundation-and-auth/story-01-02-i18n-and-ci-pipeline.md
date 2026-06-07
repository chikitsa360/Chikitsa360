---
story: 1.2
epic: 1
title: i18n Infrastructure & CI/CD Pipeline
status: Not Started
created: 2026-06-07
requirements:
  arch: [ARCH-3, ARCH-8, ARCH-11]
  nfr: [NFR-12, NFR-13, NFR-25]
  ux: [UX-DR36, UX-DR37, UX-DR38]
---

# Story 1.2: i18n Infrastructure & CI/CD Pipeline

## User Story

As a developer,
I want a bilingual i18n system and an automated CI pipeline configured from Day 1,
So that all UI copy is translatable from the first commit and code quality is enforced automatically on every pull request.

## Context

**Why i18n must be Week 1 (NFR-12):**
> "i18n infrastructure must be implemented from Week 1 of development. Retrofitting i18n onto a mature codebase is expensive — all components must be written with translation keys from the first commit."

**Language requirements:**
- English (en) — primary
- Hindi (hi) — uses conversational Hinglish, not formal Sanskrit-heavy Hindi (NFR-25)
- Language is set per Clinic by the Owner; all portal copy and patient-facing WhatsApp messages use the Clinic's selected language
- All dates/times displayed in IST (UTC+5:30) — NFR-14

**CI requirements:**
- Unit + integration tests run on every PR
- E2E tests run on merge to `main`
- Database migrations tested against fresh PostgreSQL container
- Coverage report on every PR

## Acceptance Criteria

**Given** next-intl is installed in `apps/web`,
**When** a developer adds any user-facing string to a component,
**Then** the string must use `useTranslations('namespace')('key')` or `getTranslations('namespace')` — no raw string literals for user-visible text in `.tsx` files outside message JSON files.
**And** an ESLint rule (`no-raw-text` or equivalent) is configured to flag hardcoded user-visible strings in JSX as a linting error.

**Given** `apps/web/messages/en.json` and `apps/web/messages/hi.json` exist,
**When** a user switches language to Hindi via the language toggle,
**Then** all of the following render in Hindi without page reload:
- Navigation labels (Dashboard → डैशबोर्ड)
- Button text (Book Appointment → Appointment book karein)
- Error messages
- Empty state descriptions
- Toast notification text
- Form labels and helper text

**Given** Hindi translations are written,
**When** the translation file is reviewed,
**Then** all Hindi strings use conversational Hinglish — English technical/medical terms (Appointment, Doctor, Slot, Token) remain in English; Hindi is used for action words and conjunctions (e.g. "Appointment book karein", "Slot select karein", "Baad mein karein").
**And** no string uses formal Hindi that would feel unnatural to an urban Indian clinic receptionist.

**Given** all dates and times are displayed in the portal,
**When** a date/time value is rendered,
**Then** it uses IST (UTC+5:30) — no timezone selector; UTC dates stored in DB are converted to IST for display using a shared `formatIST()` utility in `packages/core/src/utils/date.ts`.

**Given** a pull request is opened,
**When** the GitHub Actions CI workflow runs (`.github/workflows/ci.yml`),
**Then** all of the following steps complete successfully before the PR can be merged:
1. `pnpm type-check` — zero TypeScript errors (strict mode)
2. `pnpm lint` — zero ESLint errors or warnings configured as errors
3. `pnpm test` — all Vitest unit tests pass
4. Prisma migration test — `prisma migrate deploy` runs against fresh PostgreSQL 16 container (testcontainers); failure fails the build
5. Coverage report generated and artifact uploaded to Codecov

**Given** a commit is merged to `main`,
**When** the CI workflow runs the E2E stage,
**Then** Playwright tests execute in headless mode against a production-built Next.js app; test results are reported in the Actions summary.

**Given** the CI pipeline runs on a standard PR,
**When** all checks are executing,
**Then** the complete CI workflow completes within 10 minutes (target; alert if consistently exceeded).

**Given** i18n keys are defined in `en.json`,
**When** `hi.json` is missing a key present in `en.json`,
**Then** a CI step (`pnpm check-translations`) fails with a list of missing keys; this prevents shipping an untranslated string to Hindi users.

## File Locations

```
apps/web/
  messages/
    en.json                     ← English message keys (namespaced)
    hi.json                     ← Hindi translations (matching key structure)
  src/
    i18n/
      routing.ts                ← next-intl routing config (locale detection)
      request.ts                ← next-intl server-side request config
    middleware.ts               ← next-intl locale middleware (merged with auth middleware)
    lib/
      locale.ts                 ← Language switcher logic; clinicId → locale mapping
packages/core/
  src/utils/
    date.ts                     ← formatIST(), parseIST() utilities
.github/
  workflows/
    ci.yml                      ← CI/CD pipeline definition
scripts/
  check-translations.ts         ← Key parity checker (en.json vs hi.json)
```

## Message File Structure (example)

```json
// en.json
{
  "nav": {
    "dashboard": "Dashboard",
    "appointments": "Appointments",
    "patients": "Patients",
    "doctors": "Doctors",
    "billing": "Billing",
    "reports": "Reports",
    "settings": "Settings"
  },
  "auth": {
    "login.title": "Welcome back",
    "login.phone.label": "Mobile Number",
    "login.otp.label": "Enter OTP",
    "login.send-otp": "Send OTP",
    "login.verify": "Verify & Login",
    "login.otp-sent": "Code sent to {phone}",
    "login.error.invalid-otp": "Invalid OTP. {remaining} attempts left.",
    "login.error.locked": "Too many attempts. Try again in {minutes} minutes."
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "delete": "Delete",
    "loading": "Loading...",
    "empty.no-data": "No data for this period"
  }
}
```

```json
// hi.json (Hinglish — not formal Hindi)
{
  "nav": {
    "dashboard": "डैशबोर्ड",
    "appointments": "Appointments",
    "patients": "Patients",
    "doctors": "Doctors",
    "billing": "Billing",
    "reports": "Reports",
    "settings": "Settings"
  },
  "auth": {
    "login.title": "Wapas aaye hain!",
    "login.phone.label": "Mobile Number",
    "login.otp.label": "OTP enter karein",
    "login.send-otp": "OTP bhejein",
    "login.verify": "Verify karein",
    "login.otp-sent": "{phone} pe code bheja gaya",
    "login.error.invalid-otp": "OTP galat hai. {remaining} attempts bache hain.",
    "login.error.locked": "Bahut zyada attempts. {minutes} minute baad try karein."
  },
  "common": {
    "save": "Save karein",
    "cancel": "Cancel",
    "confirm": "Confirm karein",
    "delete": "Delete karein",
    "loading": "Load ho raha hai...",
    "empty.no-data": "Is period ke liye koi data nahi"
  }
}
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | `formatIST()` edge cases (DST, midnight, timezone boundary) | 100% |
| Unit | Translation key parity check script | Core logic |
| CI | Translation key parity check runs and fails when keys missing | Must pass in CI |

## UX Design Reference

**UX-DR36:** All UI copy must have corresponding entries in both `en.json` and `hi.json`.
**UX-DR37:** Hindi copy uses conversational Hinglish — natural mix, not formal Sanskrit-heavy Hindi. Examples from EXPERIENCE.md Voice & Tone section:
- "Appointment book karein" ✓ (not "नियुक्ति निर्धारित करें" ✗)
- "Slot select karein" ✓
- "Baad mein karein" ✓

**UX-DR38:** Language toggle accessible from user avatar menu (portal) and Clinic Settings → Language preference. Changing language updates the portal immediately; all patient-facing WhatsApp messages use the same Clinic-level language setting.

## Compliance Notes

- **NFR-12:** i18n infrastructure must be wired before any UI component is written. This story is ordered before Story 1.3 (Design System) intentionally.
- **NFR-13:** Clinic Owner selects language in Settings → Language. All portal copy + patient WhatsApp messages follow this setting.
- **NFR-14:** All datetime values displayed in IST. UTC stored in DB; IST rendered in UI.
- **NFR-25:** Hindi copy uses respectful, non-alarmist, collaborative framing — not imperative Hindi.
