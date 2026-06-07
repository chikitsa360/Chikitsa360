---
project_name: 'Chikitsa360'
date: '2026-06-07'
sections_completed:
  - technology_stack
  - monorepo_structure
  - multi_tenant_branding
  - language_rules
  - framework_rules
  - code_quality
  - critical_rules
---

# Project Context for AI Agents

_Critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

| Layer | Technology | Version |
|---|---|---|
| Monorepo orchestration | Turborepo | 2.9.x |
| Package manager | pnpm (workspaces) | 11.5.2 |
| Language | TypeScript | 5.9.3 |
| Web framework | Next.js (App Router) | 15.5.19 |
| UI library | React | 19.2.7 |
| Styling | Tailwind CSS | v4.x |
| Node.js | Node | ≥ 20.0.0 |
| AI context | BMAD-METHOD | 6.8.0 |

### Internal Workspace Packages

```
@chikitsa360/web          apps/web          Next.js app
@chikitsa360/ui           packages/ui       Shared React components
@chikitsa360/branding     packages/branding Multi-tenant theme system
@chikitsa360/core         packages/core     Shared types & utilities
@chikitsa360/typescript-config  packages/config/typescript
@chikitsa360/eslint-config      packages/config/eslint
```

---

## Monorepo Structure Rules

- **All workspace packages are referenced with `workspace:*`** — never use version numbers for internal deps.
- `packages/config/*` is listed separately in `pnpm-workspace.yaml` in addition to `packages/*`.
- Running a single app: `pnpm --filter @chikitsa360/web dev`
- Never run `npm install` — always use `pnpm install`. The project uses a pnpm lockfile.
- Turborepo pipeline is in `turbo.json`. Add new `scripts` entries there when adding new build tasks.
- Output artifacts from BMAD go to `_bmad-output/`. Planning artifacts to `_bmad-output/planning-artifacts/`.

---

## Multi-Tenant Branding System

This is the **most critical architectural detail** in the project. Every UI decision flows through it.

### How it works

1. Each deployment sets `NEXT_PUBLIC_CLIENT_ID` env var (e.g. `chikitsa360`, `mediflow`).
2. `apps/web/src/lib/brand.ts` calls `getBrandTheme(clientId)` from `@chikitsa360/branding`.
3. The theme's `cssVariables` are injected as a `<style>` tag into the `<head>` in `layout.tsx`.
4. All Tailwind utility classes use CSS custom properties — **not hardcoded colors**.

### Color format — RGB triplets only

```ts
// ✅ CORRECT — RGB triplet (no #, no rgb() wrapper)
'--color-primary': '27 64 175'

// ❌ WRONG — hex
'--color-primary': '#1b40af'

// ❌ WRONG — rgb() wrapper
'--color-primary': 'rgb(27, 64, 175)'
```

RGB triplets are required so Tailwind v4 opacity modifiers work: `bg-primary/50`.

### Semantic color tokens (always use these in components, never raw colors)

| Token | Usage |
|---|---|
| `bg-primary` / `text-primary` | Main brand color (CTA buttons, active states) |
| `bg-secondary` / `text-secondary` | Secondary brand color |
| `bg-accent` | Accent highlights |
| `bg-background` | Page background |
| `text-foreground` | Default text |
| `bg-muted` / `text-muted-foreground` | Subtle backgrounds and de-emphasized text |
| `border-border` | All borders |
| `ring-ring` | Focus rings |
| `rounded-[--radius]` | All border radii — uses the brand's `--radius` CSS var |

### Adding a new client brand

1. Create `packages/branding/src/themes/<slug>.ts` — copy from `chikitsa360.ts`.
2. Register in `packages/branding/src/index.ts` `themes` record.
3. Deploy with `NEXT_PUBLIC_CLIENT_ID=<slug>`.

### Current clients

| clientId | Brand | Logo path |
|---|---|---|
| `chikitsa360` | Chikitsa360 (default) | `/brand/chikitsa360/logo-transparent.png` |
| `mediflow` | MediFlow | `/brand/mediflow/logo.svg` |
| `cliniqly` | Cliniqly (legacy fallback) | `/brand/cliniqly/logo.svg` |

---

## Language-Specific Rules (TypeScript)

- **Strict mode is ON** (`strict: true` in `packages/config/typescript/base.json`). Never use `any` without `// eslint-disable`.
- **No unused locals/parameters** — the tsconfig enforces `noUnusedLocals` and `noUnusedParameters`.
- **Module resolution**: `"moduleResolution": "Bundler"` — use ESM-style imports, no `.js` extensions needed.
- **Path alias**: In `apps/web`, `@/*` maps to `./src/*`. Use `@/components/Foo` not relative `../../components/Foo`.
- **`isolatedModules: true`** is set by Next.js — avoid `const enum`, use `export type` for type-only exports.
- Prefer `const` over `let`. Never use `var`.
- **Async patterns**: prefer `async/await` over raw `.then()` chains.
- **Error handling**: always type-narrow caught errors (`if (error instanceof Error)`).

### Import order convention

```ts
// 1. React
import * as React from 'react'
// 2. Next.js
import type { NextConfig } from 'next'
// 3. External packages
import { cn } from '@chikitsa360/core'
// 4. Internal workspace packages
import { Button } from '@chikitsa360/ui'
// 5. App-local (with @ alias)
import { brand } from '@/lib/brand'
// 6. Types (use `import type`)
import type { BrandTheme } from '@chikitsa360/branding'
```

---

## Framework-Specific Rules (Next.js 15 App Router)

### Server vs Client components

- **Default is Server Component**. Only add `'use client'` when the component uses:
  - `useState`, `useEffect`, `useRef`, or any other React hook
  - Browser-only APIs (`window`, `document`, `localStorage`)
  - Event handlers (`onClick`, `onChange`, etc.)
- Components in `packages/ui` that use hooks **must** have `'use client'` at the top (e.g. `Avatar.tsx`).
- `apps/web/src/app/layout.tsx` is a Server Component — never add `'use client'` there.
- `AppShell.tsx` and `SplashScreen.tsx` are Client Components (they use `useState`/`useEffect`).

### File conventions

```
apps/web/src/
  app/                  Next.js App Router pages
    layout.tsx          Root layout (Server Component)
    page.tsx            Home page
    loading.tsx         Suspense fallback (use PageSpinner from @chikitsa360/ui)
    error.tsx           Error boundary
  components/           App-specific components (not shared)
    AppShell.tsx        Client wrapper — mounts SplashScreen
    BrandLogo.tsx       Renders correct logo variant
    SplashScreen.tsx    Animated splash (client component)
  lib/
    brand.ts            Resolves brand from NEXT_PUBLIC_CLIENT_ID
```

### Images

- Use `<img>` (not `next/image`) for brand logos — they are in `public/` and don't need optimization.
- When using `<img>` in Next.js, suppress the lint warning with `// eslint-disable-next-line @next/next/no-img-element`.
- Logo assets live in `apps/web/public/brand/<clientId>/`.

### Environment variables

- `NEXT_PUBLIC_*` — accessible in browser (set in `.env.local` for dev).
- Server-only vars — set without `NEXT_PUBLIC_` prefix.
- Default `NEXT_PUBLIC_CLIENT_ID` falls back to `'chikitsa360'` (set in `next.config.ts`).

---

## Shared UI Components (`@chikitsa360/ui`)

All components use brand CSS tokens — **never hardcode colors**.

### Available components

| Component | File | Notes |
|---|---|---|
| `Button` | `Button.tsx` | variants: primary, secondary, outline, ghost, destructive; `isLoading` prop |
| `Badge` | `Badge.tsx` | variants: default, secondary, success, warning, destructive |
| `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter` | `Card.tsx` | |
| `Input` | `Input.tsx` | label, hint, error, leftIcon, rightIcon |
| `Select` | `Select.tsx` | label, hint, error, options array |
| `Avatar`, `AvatarGroup` | `Avatar.tsx` | **Client Component** — `'use client'` directive |
| `StatCard` | `StatCard.tsx` | label, value, trend auto-computed from previousValue |
| `Spinner`, `PageSpinner` | `Spinner.tsx` | sizes: sm, md, lg, xl |
| `Alert` | `Alert.tsx` | variants: info, success, warning, error; dismissible |
| `EmptyState` | `EmptyState.tsx` | icon, title, description, action slot |
| `Divider` | `Divider.tsx` | optional label |

### Adding a new component to `@chikitsa360/ui`

1. Create file in `packages/ui/src/components/ComponentName.tsx`.
2. Add `'use client'` if it uses hooks.
3. Use `cn()` from `@chikitsa360/core` for className merging.
4. Use brand tokens (`text-foreground`, `border-border`, `rounded-[--radius]`) not raw Tailwind colors.
5. Export from `packages/ui/src/index.ts`.

---

## Code Quality & Style Rules

### Prettier (`.prettierrc`)

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100
}
```

- No semicolons.
- Single quotes for strings.
- Trailing commas in multi-line structures.

### Naming conventions

| Thing | Convention | Example |
|---|---|---|
| React components | PascalCase | `StatCard`, `BrandLogo` |
| Files (components) | PascalCase | `StatCard.tsx` |
| Files (utils/lib) | camelCase | `brand.ts`, `utils.ts` |
| Variables / functions | camelCase | `getBrandTheme()` |
| CSS custom properties | kebab-case | `--color-primary` |
| Client IDs (brand slugs) | kebab-case | `chikitsa360`, `mediflow` |
| Package names | `@chikitsa360/<name>` | `@chikitsa360/ui` |

### `cn()` utility

Always use `cn()` from `@chikitsa360/core` to merge class names — not template literals:

```ts
// ✅
className={cn('base-class', condition && 'conditional-class', className)}

// ❌
className={`base-class ${condition ? 'conditional-class' : ''} ${className}`}
```

---

## Domain Types (clinic management)

Core types live in `@chikitsa360/core` (`packages/core/src/types.ts`):

```ts
Patient, Appointment, Provider, Clinic
ApiResponse<T>, PaginatedResponse<T>
```

- `Appointment.status`: `'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show'`
- `Clinic.clientId` links to `BrandTheme.meta.clientId` — this is how multi-tenancy connects at the data layer.

---

## Critical Don't-Miss Rules

1. **Never hardcode brand colors.** Always use CSS token classes (`text-primary`, `bg-muted`, etc.) or `rgb(var(--color-primary) / <opacity>)` syntax.

2. **Never `npm install`.** Always `pnpm install`. This is a pnpm workspace — npm will corrupt the lockfile.

3. **Client components in shared packages need `'use client'`.** Next.js App Router will throw if a package uses `useState` without it.

4. **`rounded-[--radius]`** — brand border radius uses a CSS variable, not a fixed Tailwind class like `rounded-md`. Always use `rounded-[--radius]` for consistency.

5. **Logo selection matters.** `logo-transparent.png` for light backgrounds, `logoDarkUrl` for dark backgrounds. Use `<BrandLogo variant="dark">` on colored/dark surfaces.

6. **The splash screen blocks the UI.** `AppShell.tsx` wraps all content with opacity 0 until splash is done. Do not add `opacity-0` to root layouts — content fade-in is handled there.

7. **`NEXT_PUBLIC_CLIENT_ID` is baked at build time** (when using `next build`). For true runtime switching, use a middleware approach — the current setup bakes the client ID.

8. **`pnpm-workspace.yaml` has 3 entries** — `apps/*`, `packages/*`, and `packages/config/*`. If you add nested packages under `packages/config/`, the workspace entry is already there.

9. **BMAD output folder is `_bmad-output/`**. Agents writing PRDs, architecture docs, or stories go to `_bmad-output/planning-artifacts/` and `_bmad-output/implementation-artifacts/`.

10. **`docs/` is the `project_knowledge` path** in BMAD config — put reference docs agents should read there.

---

## BMAD Agent Configuration

Configured agents for this project:

| Agent | Name | Role |
|---|---|---|
| `bmad-agent-pm` | John | Product Manager — PRDs, epics |
| `bmad-agent-architect` | Winston | System Architect — ADRs, design |
| `bmad-agent-dev` | Amelia | Senior Engineer — implementation |
| `bmad-agent-analyst` | Mary | Business Analyst — research |
| `bmad-agent-ux-designer` | Sally | UX Designer — wireframes |
| `bmad-agent-tech-writer` | Paige | Technical Writer — docs |

Invoke via `/bmad-agent-pm` etc. in Claude Code.
Output documents go to `_bmad-output/planning-artifacts/`.
