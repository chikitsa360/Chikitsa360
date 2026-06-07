# Cliniqly

> Smarter Clinic Management — white-label SaaS platform

## Quick Start

```bash
# Install dependencies
pnpm install

# Start the default brand (Cliniqly)
pnpm dev

# Start as a white-label client
NEXT_PUBLIC_CLIENT_ID=mediflow pnpm --filter @cliniqly/web dev
```

## Repository Structure

See [docs/monorepo-structure.md](docs/monorepo-structure.md)

## Multi-Tenant Branding

See [docs/multi-tenant-branding.md](docs/multi-tenant-branding.md)

## BMAD-METHOD

This project uses [BMAD-METHOD](https://bmadcode.com/) for AI-assisted agile development.

### AI Agents Available (via Claude Code /skills)

| Skill | Purpose |
|---|---|
| `bmad-agent-pm` | Product Manager — PRDs, epics, stories |
| `bmad-agent-architect` | Architect — system design, ADRs |
| `bmad-agent-dev` | Developer — implementation guidance |
| `bmad-agent-analyst` | Analyst — research, requirements |
| `bmad-agent-ux-designer` | UX Designer — wireframes, flows |
| `bmad-create-prd` | Create a Product Requirements Document |
| `bmad-create-architecture` | Design system architecture |
| `bmad-create-story` | Write a user story |

Start with `/bmad-help` in Claude Code to explore all 44 available skills.

## Apps

| App | Path | Description |
|---|---|---|
| Web | `apps/web` | Next.js 15 clinic app (multi-tenant) |

## Packages

| Package | Path | Description |
|---|---|---|
| `@cliniqly/branding` | `packages/branding` | Client theme system |
| `@cliniqly/core` | `packages/core` | Shared types & utilities |
| `@cliniqly/ui` | `packages/ui` | React component library |
| `@cliniqly/typescript-config` | `packages/config/typescript` | Shared TS configs |
| `@cliniqly/eslint-config` | `packages/config/eslint` | Shared ESLint configs |
