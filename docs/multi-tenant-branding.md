# Multi-Tenant Branding Guide

Cliniqly is a white-label SaaS platform. The same codebase can be deployed as a
branded product for any client by setting a single environment variable.

## How It Works

```
NEXT_PUBLIC_CLIENT_ID=mediflow pnpm dev
```

1. At build/runtime, `apps/web/src/lib/brand.ts` reads `NEXT_PUBLIC_CLIENT_ID`
2. It calls `getBrandTheme(clientId)` from `@cliniqly/branding`
3. The brand's `cssVariables` are injected as CSS custom properties into `<head>`
4. All Tailwind utility classes resolve through those CSS vars
5. App name, logo, support email, and tagline all come from `BrandMeta`

## Adding a New Client

### 1. Create a theme file

```
packages/branding/src/themes/<client-slug>.ts
```

Copy `demo-client.ts` as a starting point. Fill in:

- `meta` — app name, clientId (slug), emails, URLs
- `assets` — logo paths (place SVGs in `apps/web/public/brand/<client-slug>/`)
- `colors` — full color scale (use Tailwind v4 palette as reference)
- `typography` — font stack
- `cssVariables` — RGB triplets matching your primary/secondary/accent colors

### 2. Register the theme

In `packages/branding/src/index.ts`, add:

```ts
import { myClientTheme } from './themes/my-client'

const themes: Record<string, BrandTheme> = {
  cliniqly: cliniqlyTheme,
  mediflow: demoClientTheme,
  'my-client': myClientTheme,   // ← add here
}
```

### 3. Deploy with the client env var

Create a Vercel/Netlify deployment (or Docker container) with:

```
NEXT_PUBLIC_CLIENT_ID=my-client
```

Each client gets their own deployment pointing to the same codebase.

## Color System

All colors use CSS custom properties with RGB triplets (no # hex) so they work
with Tailwind v4's opacity modifier syntax:

```css
/* Set by BrandTheme.cssVariables */
--color-primary: 14 165 233;

/* Used in Tailwind classes */
.element { background: rgb(var(--color-primary) / 0.5); }
```

## File Structure

```
packages/branding/
├── src/
│   ├── types.ts              ← BrandTheme interface
│   ├── index.ts              ← getBrandTheme(), themeToCssVars()
│   └── themes/
│       ├── cliniqly.ts       ← Default brand
│       └── demo-client.ts    ← MediFlow white-label example
apps/web/
├── public/brand/
│   ├── cliniqly/             ← Cliniqly logo assets
│   └── mediflow/             ← MediFlow logo assets
└── src/lib/brand.ts          ← Resolves brand from env var
```
