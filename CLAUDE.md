# CLAUDE.md — Cliniqly / Chikitsa360

Auto-loaded by Claude Code on every session. Overrides any default behavior.

---

## Development Guidelines

1. Do not start by agreeing with assumptions. Before suggesting or implementing changes, verify the actual issue.

2. Do not make fixes based on assumptions. Always identify the root cause by analyzing:
   - relevant files
   - existing code flow
   - dependencies
   - error logs
   - expected vs actual behavior

3. Fix the root cause, not only the visible symptom. Avoid temporary workarounds unless explicitly discussed.

4. Before modifying code:
   - understand the current implementation
   - check related components/services/hooks/APIs
   - identify possible side effects

5. When an approach is incorrect, explain:
   "I disagree because [reason]. Here's what I would do instead [alternative]. The risk in the current approach is [specific downside]."

6. Do not provide solutions based on guesses. If information is missing, state what needs to be verified first.

7. After changes, validate:
   - linting
   - type safety
   - existing patterns/conventions
   - impacted flows

8. Keep answers direct. Skip unnecessary introductions and focus on the most useful information first.

---

## Project Overview

White-label SaaS clinic management platform (internal name: Chikitsa360 / brand: Cliniqly).

- **Monorepo**: Turborepo + pnpm workspaces (pnpm@11.5.2, node v22.17.0)
- **Web**: Next.js 15, React 19, Tailwind CSS v4, TypeScript 5 (strict mode)
- **Package manager**: Always `pnpm`. Never `npm install` — it corrupts the lockfile.

### Workspace Packages

```
apps/web/                         → @chikitsa360/web (Next.js app)
packages/ui/                      → @chikitsa360/ui (shared components)
packages/branding/                → @chikitsa360/branding (multi-tenant themes)
packages/core/                    → @chikitsa360/core (shared types/utils)
packages/config/eslint/           → @chikitsa360/eslint-config
packages/config/typescript/       → @chikitsa360/typescript-config
```

### Key Commands

```bash
pnpm dev                                      # all apps
pnpm --filter @chikitsa360/web dev            # web only
NEXT_PUBLIC_CLIENT_ID=mediflow pnpm dev       # as alternate brand
pnpm build / pnpm lint / pnpm type-check
```

---

## Architecture Patterns

### Multi-Tenant Branding

- Client identified by `NEXT_PUBLIC_CLIENT_ID` env var.
- Theme resolved in `apps/web/src/lib/brand.ts` → CSS vars injected in `layout.tsx`.
- **Always use semantic tokens** (`text-primary`, `bg-muted`, `border-border`, `rounded-[--radius]`) — never hardcode colors.
- Color format: RGB triplets only (e.g. `14 165 233`) — required for Tailwind v4 opacity modifiers (`bg-primary/50`).

### Database / Tenant Isolation

- Tenant DB: `clinic_{clinicId}` PostgreSQL schemas; raw queries via `db.$queryRawUnsafe`.
- Array destructuring: use `parts[0] ?? NaN` not `const [h, m]` — TypeScript `noUncheckedIndexedAccess` is on.

### Auth & Routing

- Auth flow: Owner → `/onboarding` if no clinic; `/dashboard` if complete. Doctor/Receptionist → `/dashboard` always.
- Onboarding route group: `app/(onboarding)/onboarding/` (no sidebar).
- Middleware public paths: `PUBLIC_API_PATHS` array skips auth for `/api/v1/clinics/by-slug/`, `/api/v1/slots/available`, `/api/v1/booking`, `/api/og/`.

### Server vs Client Components

- Default is Server Component. Add `'use client'` only when using hooks, browser APIs, or event handlers.
- `app/layout.tsx` is always a Server Component.
- Components in `packages/ui` that use hooks must have `'use client'`.

### Testing

- Mock casts: always use `as unknown as T` for Prisma/Inngest mocks.
- Vitest mock reset: use `vi.resetAllMocks()` in `beforeEach` (not `clearAllMocks`).
- Env vars: read inside route functions (not module level) for testability with `vi.stubEnv`.

---

## Code Style

### Prettier

- No semicolons, single quotes, trailing commas (es5), 2-space indent, 100 char print width.

### TypeScript

- `strict: true` — never use `any` without `// eslint-disable`.
- `noUnusedLocals` + `noUnusedParameters` enforced.
- Use `export type` for type-only exports (`isolatedModules: true`).
- Prefer `const`, `async/await`. Narrow caught errors with `instanceof Error`.

### Import Order

```ts
// 1. React
// 2. Next.js
// 3. External packages
// 4. Internal workspace packages (@chikitsa360/*)
// 5. App-local (@ alias)
// 6. Types (import type)
```

### Class Names

Always use `cn()` from `@chikitsa360/core` — never template literals for class merging.

### Naming

| Thing | Convention |
|---|---|
| React components / files | PascalCase |
| Utils / lib files | camelCase |
| CSS custom properties | kebab-case |
| Brand slugs | kebab-case |

---

## UI / UX Rule

**Always check mockups before implementing any UI change.**

Mockup files: `_bmad-output/planning-artifacts/ux-designs/ux-Cliniqly-2026-06-07/mockups/`

Available: `login.html`, `dashboard.html`, `onboarding.html`, `settings.html`, `appointments-agenda.html`, `appointment-calendar.html`, `appointment-detail.html`, `appointments-waitlist.html`, `new-appointment.html`, `patients-list.html`, `patient-profile.html`, `new-patient.html`, `doctors-list.html`, `doctor-profile.html`, `prescriptions.html`, `new-prescription.html`, `billing-list.html`, `invoice-detail.html`, `new-invoice.html`, `reports.html`, `events-list.html`, `event-detail.html`, `new-event.html`, `event-registration.html`

For anything not covered by a mockup, follow the same design system (colors, spacing, component patterns) from existing mockups.

---

## Critical Don'ts

- Never hardcode brand colors — always use CSS token classes.
- Never `npm install` — always `pnpm install`.
- Never use `rounded-md` for brand radius — use `rounded-[--radius]`.
- Never add `'use client'` to `app/layout.tsx`.
- Never read env vars at module level in route files — read inside the handler function.
- Never use `clearAllMocks()` in tests — use `resetAllMocks()`.
