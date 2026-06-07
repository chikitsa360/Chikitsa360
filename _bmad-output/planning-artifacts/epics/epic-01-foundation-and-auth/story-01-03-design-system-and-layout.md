---
story: 1.3
epic: 1
title: Design System & Application Layout Shell
status: Not Started
created: 2026-06-07
requirements:
  nfr: [NFR-15, NFR-16]
  ux: [UX-DR1, UX-DR2, UX-DR3, UX-DR6, UX-DR9, UX-DR10, UX-DR11, UX-DR12, UX-DR16, UX-DR17, UX-DR30, UX-DR31, UX-DR32, UX-DR39, UX-DR40]
---

# Story 1.3: Design System & Application Layout Shell

## User Story

As a Clinic staff member,
I want a consistent application shell with a sidebar, header, and design system,
So that I can orient myself and navigate the platform immediately after login on any device or theme.

## Context

**Design language:** "Stripe meets Linear meets Modern Healthcare" — minimalist, premium, enterprise-grade, healthcare-compliant. Full spec in `DESIGN.md`.

**Color system (from DESIGN.md):**
- Primary: Medical Blue `#0A6EFF` (RGB: `10 110 255`)
- Secondary: Healthcare Teal `#00B8A9` (RGB: `0 184 169`)
- Accent: Soft Cyan `#4FD9FF` (RGB: `79 217 255`)
- Neutrals: Modern grayscale (similar to Linear/Notion)

**Typography (from DESIGN.md):**
- Primary: Plus Jakarta Sans (headings, UI labels)
- Secondary: Inter (body, data)
- Both loaded via `next/font` — zero FOUT, no layout shift

**Spacing:** 8pt grid system throughout

**Theme priority stack (UX-DR2 from EXPERIENCE.md):**
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

**Navigation (from EXPERIENCE.md — Navigation Model):**
- Desktop left sidebar: 240px expanded, 64px collapsed
- Mobile: hidden sidebar + bottom tab bar (5 destinations)
- Global ⌘K command palette (built in Epic 5; slot in shell now)
- Quick action "+" button (opens menu — built in Epic 5; shell button now)

## Acceptance Criteria

**Given** I am logged in and the portal loads on a desktop viewport (≥ 1024px),
**When** the layout renders,
**Then** a left sidebar (240px wide) is visible with the following navigation items and icons:
- Dashboard (home icon)
- Appointments (calendar icon)
- Patients (users icon)
- Doctors (stethoscope icon)
- Billing (credit card icon)
- Reports (chart icon)
- Settings (gear icon)
**And** the active navigation item has a brand-primary (`#0A6EFF`) background with 4px left-edge accent bar.
**And** each item shows both icon and label when expanded.

**Given** the portal loads on a mobile viewport (< 768px),
**When** the layout renders,
**Then** the left sidebar is hidden (not rendered in DOM) and a bottom tab bar is fixed at the bottom showing 5 destinations: Dashboard, Appointments, Patients, Reports, Settings — each with icon and label below icon.

**Given** the sidebar is expanded on desktop,
**When** I click the collapse toggle button (chevron at the sidebar edge),
**Then** the sidebar animates from 240px to 64px in 200ms (CSS transition); labels disappear; only icons remain; the main content area fills the reclaimed space; the collapsed state persists to `localStorage['sidebar-collapsed']`.

**Given** the portal header renders,
**When** I inspect it,
**Then** it shows (left to right):
- Clinic name (truncated at 20 chars; full name in `title` tooltip)
- Spacer (flex-grow)
- "+" quick-action button (rounded, brand-primary bg — placeholder action, wired in Epic 5)
- Notification bell with integer badge count (placeholder count = 0 until Epic 8)
- User avatar circle (initials from user name, color derived from name hash)
**And** clicking the avatar opens a dropdown with: "Profile", "Language (English / हिंदी)", "Theme (Light / Dark / High Contrast)", "Logout".

**Given** design tokens are defined in `apps/web/src/styles/tokens.css`,
**When** any themed element is inspected in DevTools,
**Then** the following CSS custom properties are present and correctly valued (Light theme defaults):
- `--color-primary: 10 110 255` (RGB triplet for Tailwind opacity support)
- `--color-teal: 0 184 169`
- `--color-cyan: 79 217 255`
- `--color-bg: 255 255 255`
- `--color-surface: 249 250 251`
- `--color-border: 229 231 235`
- `--color-text-primary: 17 24 39`
- `--color-text-secondary: 107 114 128`
- `--radius-sm: 6px`
- `--radius-md: 8px`
- `--radius-lg: 12px`
- `--shadow-card: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)`

**Given** the Light theme is active,
**When** I select Dark theme from the avatar dropdown,
**Then** all surfaces switch to dark mode in ≤ 100ms (CSS class swap on `<html>`).
**And** the preference is saved to `localStorage['theme-preference']`.
**And** the next cold page load renders in Dark theme without a flash of Light theme.
**And** Dark theme token overrides are applied (dark surface, dark border, light text on dark bg).

**Given** the High Contrast theme is selected,
**When** axe-core runs in Playwright CI against the portal,
**Then** all text/background combinations pass WCAG 2.1 AA contrast: ≥ 4.5:1 for normal text, ≥ 3:1 for large text (≥ 18pt or ≥ 14pt bold) and UI components.
**And** zero automated contrast violations are reported.

**Given** `next/font` loads Plus Jakarta Sans and Inter,
**When** the portal first renders,
**Then** `font-display: swap` is used; no FOUT (Flash of Unstyled Text); no layout shift from font loading (CLS contribution from fonts = 0).

**Given** any interactive element (button, link, input, dropdown, tab, nav item) is reached via Tab key,
**When** it receives keyboard focus,
**Then** a 2px solid brand-primary (`#0A6EFF`) outline with 2px offset is rendered.
**And** no element in the portal uses `outline: none` without an equivalent visible custom focus indicator.
**And** Tab order matches the visual left-to-right, top-to-bottom reading order.

**Given** a page or section is fetching data (e.g., navigating to Patients list),
**When** the skeleton loader renders,
**Then** grey shimmer placeholder blocks appear at the correct positions matching the expected content's layout.
**And** when real data arrives and replaces the skeleton, there is zero Cumulative Layout Shift (CLS = 0).
**And** the shimmer animation uses a CSS `@keyframes` sweep — no JavaScript animation.

**Given** an action produces a result (booking created, error, plan limit warning, etc.),
**When** the toast notification system renders,
**Then** toasts appear in the top-right corner on desktop (≥ 768px) and top-center on mobile (< 768px).
**And** success and info toasts auto-dismiss after 4 seconds; error toasts after 8 seconds.
**And** a ✕ dismiss button allows manual dismissal at any time.
**And** up to 3 toasts stack vertically; when a 4th arrives, the oldest is removed.
**And** each toast is announced to screen readers via `aria-live="polite"` region.

**Given** the `@chikitsa360/ui` package,
**When** the following components are imported and rendered in isolation,
**Then** they render correctly across all variants and are fully keyboard accessible:

| Component | Variants | Key Keyboard Behaviour |
|---|---|---|
| `Alert` | info, success, warning, error; dismissable | ✕ button focusable + Enter/Space to dismiss |
| `EmptyState` | with CTA, without CTA; 6 context variants | CTA button focusable + Enter activates |
| `Spinner` | sm (16px), md (24px), lg (40px) | `role="status"` + aria-label; not focusable |
| `Input` | default, error, with prefix icon, with suffix icon, with char count | Tab to focus; error announced via aria-describedby |
| `Select` | single, searchable (> 10 items) | ↑↓ to navigate options; Enter to select; Escape to close |

**Given** the `Avatar` component (UX-DR7, needed for header and staff list),
**When** rendered with a user who has no profile photo,
**Then** it shows initials (first letter of first name + first letter of last name) in a circle; background color is derived deterministically from the name string (consistent across renders); 4 sizes: xs (24px), sm (32px), md (40px), lg (48px).

## UX Design Reference

**DESIGN.md — Colors (exact tokens):**
```yaml
colors:
  primary: "10 110 255"        # Medical Blue #0A6EFF
  secondary: "0 184 169"       # Healthcare Teal #00B8A9
  accent: "79 217 255"         # Soft Cyan #4FD9FF
  neutral-50: "249 250 251"
  neutral-100: "243 244 246"
  neutral-200: "229 231 235"
  neutral-500: "107 114 128"
  neutral-900: "17 24 39"
  success: "34 197 94"
  warning: "245 158 11"
  error: "239 68 68"
```

**DESIGN.md — Typography:**
```yaml
typography:
  heading: "Plus Jakarta Sans"
  body: "Inter"
  mono: "JetBrains Mono"
  scale:
    xs: "12px / 16px"
    sm: "14px / 20px"
    base: "16px / 24px"
    lg: "18px / 28px"
    xl: "20px / 28px"
    2xl: "24px / 32px"
    3xl: "30px / 36px"
```

**DESIGN.md — Spacing (8pt grid):**
- Base unit: 8px
- Scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64px

**DESIGN.md — Components: Sidebar**
- Background: `--color-surface` (Light) / dark equivalent (Dark)
- Border-right: 1px `--color-border`
- Active item: `bg-primary/10` + `text-primary` + 4px left bar
- Hover: `bg-neutral-100` (Light) / hover equivalent (Dark)
- Collapsed: show icons only; tooltip on hover (full label)

**DESIGN.md — Components: Header**
- Height: 56px
- Background: `--color-bg` with `border-bottom: 1px --color-border`
- Clinic name: `font-semibold text-lg text-text-primary`
- Badge on bell: `bg-error text-white text-xs rounded-full`

**EXPERIENCE.md — Navigation Model (desktop):**
- Sidebar items: Dashboard, Appointments, Patients, Doctors, Billing, Reports, Settings
- Each item: 44px height (touch target), 16px icon, 14px label
- Hover: 100ms background transition
- Active: persistent; no hover state on active item

**EXPERIENCE.md — Navigation Model (mobile bottom tabs):**
- 5 tabs: Dashboard, Appointments, Patients, Reports, Settings
- Tab height: 56px (safe area padding accounted for on iOS)
- Icons: 24px; labels: 10px (below icon)
- Active: brand-primary icon + label; inactive: neutral-500

**EXPERIENCE.md — Responsive & Platform:**
- sm: < 640px (mobile portrait)
- md: 640px–1023px (tablet / mobile landscape)
- lg: 1024px–1279px (small desktop)
- xl: 1280px+ (full desktop)

## File Locations

```
apps/web/
  src/
    styles/
      tokens.css                    ← CSS custom properties (all design tokens)
      themes/
        light.css                   ← Light theme overrides
        dark.css                    ← Dark theme overrides
        high-contrast.css           ← High contrast theme overrides
    components/
      layout/
        AppShell.tsx                ← Root layout: sidebar + header + main
        Sidebar.tsx                 ← Collapsible sidebar with nav items
        Header.tsx                  ← Global header
        BottomTabBar.tsx            ← Mobile bottom navigation
        UserMenu.tsx                ← Avatar dropdown (theme, language, logout)
      ui/                           ← App-level UI (not in packages/ui)
        ToastProvider.tsx           ← Toast context + renderer
packages/ui/
  src/components/
    Alert.tsx                       ← (already exists — may need variant additions)
    Avatar.tsx                      ← (new — UX-DR7)
    EmptyState.tsx                  ← (new)
    Input.tsx                       ← (new)
    Select.tsx                      ← (new)
    Spinner.tsx                     ← (new)
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest + RTL) | Alert, EmptyState, Input, Select, Spinner — all variants render; keyboard interactions | ≥ 70% |
| Unit | Avatar — initials generation; color hash consistency | 100% of logic |
| Unit | Theme switching — token application; localStorage persistence | Core paths |
| Playwright (E2E) | Sidebar collapse/expand; mobile bottom tab bar visibility; theme switch; toast appearance; focus ring on Tab | All scenarios |
| Playwright | axe-core contrast audit (Light, Dark, High Contrast) | Zero violations |

## Notes

- Tailwind v4 is already in the monorepo. CSS custom properties from `tokens.css` map to Tailwind's `theme()` via `@theme` block in `tailwind.config.ts`.
- Do not use `outline: none` anywhere in component styles. If default outline is overridden, always provide a custom visible focus indicator.
- All interactive elements must be ≥ 44×44px on mobile (NFR-16 / UX-DR34). The layout shell items (nav items, header buttons) must meet this on mobile viewports.
- Theme switching: Use a `data-theme` attribute on `<html>` element; CSS custom properties are scoped per theme using `[data-theme='dark'] { ... }` selectors.
