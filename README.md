# Chikitsa360

> Complete Care. 360° Health Insight. — white-label SaaS platform

## Quick Start

```bash
# Install dependencies
pnpm install

# Start the default brand (Chikitsa360)
pnpm dev

# Start as a white-label client
NEXT_PUBLIC_CLIENT_ID=mediflow pnpm --filter @chikitsa360/web dev
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
| `@chikitsa360/branding` | `packages/branding` | Client theme system |
| `@chikitsa360/core` | `packages/core` | Shared types & utilities |
| `@chikitsa360/ui` | `packages/ui` | React component library |
| `@chikitsa360/typescript-config` | `packages/config/typescript` | Shared TS configs |
| `@chikitsa360/eslint-config` | `packages/config/eslint` | Shared ESLint configs |
