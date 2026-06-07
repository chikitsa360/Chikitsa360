# Monorepo Structure

## Overview

```
cliniqly/
├── apps/
│   ├── web/              Next.js 15 patient/clinic-facing app
│   └── admin/            Admin portal (future)
├── packages/
│   ├── branding/         Multi-tenant theme system
│   ├── core/             Shared types and utilities
│   ├── ui/               Shared React component library
│   └── config/
│       ├── typescript/   Shared tsconfig bases
│       └── eslint/       Shared ESLint configs
├── _bmad/                BMAD-METHOD AI context files
├── .claude/skills/       BMAD skills for Claude Code
├── docs/                 Project documentation
├── turbo.json            Turborepo pipeline
└── pnpm-workspace.yaml   Workspace definition
```

## Package Dependency Graph

```
apps/web
  ├── @cliniqly/branding   (theme resolution)
  ├── @cliniqly/core       (shared types/utils)
  └── @cliniqly/ui         (components)

packages/ui
  └── @cliniqly/core

packages/branding
  (no internal deps)

packages/core
  (no internal deps)
```

## Running the Stack

```bash
# All apps in watch mode
pnpm dev

# Build everything
pnpm build

# Run only the web app
pnpm --filter @cliniqly/web dev

# Type-check everything
pnpm type-check

# Run as a specific client brand
NEXT_PUBLIC_CLIENT_ID=mediflow pnpm --filter @cliniqly/web dev
```

## Adding a New App

```bash
mkdir apps/my-new-app
# Create apps/my-new-app/package.json with name: "@cliniqly/my-new-app"
# Add to turbo.json pipeline if needed
```

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Web framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS v4 |
| Language | TypeScript 5 |
| AI context | BMAD-METHOD v6.8 |
| Multi-tenant | CSS custom properties via `@cliniqly/branding` |
