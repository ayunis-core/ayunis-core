# AI Coding Agent Guidelines

> **Philosophy**: Code is opaque weights. Correctness is inferred from externally observable behavior.

For architecture overview and module navigation, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Repository Overview

**Ayunis Core** is an open-source AI gateway enabling municipalities to run customizable AI assistants with multi-provider LLM support, tool integration, document retrieval (RAG), and organization-scoped access control.

```
ayunis-core/
├── ayunis-core-backend/          # NestJS API server (hexagonal architecture)
├── ayunis-core-frontend/         # React SPA (Feature-Sliced Design)
├── ayunis-core-code-execution/   # Sandboxed code execution microservice
├── ayunis-core-anonymize/        # PII anonymization service
├── ayunis-core-e2e-ui-tests/     # Cypress E2E tests
├── docker-compose.yml            # Local dev infrastructure
├── ARCHITECTURE.md               # Full architecture docs with module index
└── AGENTS.md                     # This file
```

---

## Module Boundaries

The backend enforces strict bounded contexts:

- **`src/domain/*`** — Core business logic (agents, threads, messages, runs, models, tools, prompts, sources, RAG, etc.)
- **`src/iam/*`** — Identity and access management (auth, users, orgs, subscriptions, quotas, teams, etc.)
- **`src/common/*`** — Shared infrastructure only (base classes, utilities)
- **`src/admin/*`** — Super admin routes

Cross-module dependencies go through **ports** (abstract interfaces), not direct imports.

Before modifying any module, read its `SUMMARY.md`:

```bash
# Backend modules
cat ayunis-core-backend/src/domain/[module]/SUMMARY.md

# Frontend layers
cat ayunis-core-frontend/src/[layer]/SUMMARY.md   # layer = pages, widgets, features, shared
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the complete module index with links to every SUMMARY.md.

---

## Key Files

| Purpose                     | Location                                             |
| --------------------------- | ---------------------------------------------------- |
| Architecture & module index | [ARCHITECTURE.md](ARCHITECTURE.md)                   |
| Backend module summaries    | `ayunis-core-backend/src/[area]/[module]/SUMMARY.md` |
| Frontend layer summaries    | `ayunis-core-frontend/src/[layer]/SUMMARY.md`        |
| TypeORM config              | `ayunis-core-backend/src/db/datasource.ts`           |
| OpenAPI spec                | `http://localhost:3000/api/docs` (when running)      |
| Frontend summary            | `ayunis-core-frontend/src/SUMMARY.md`                |

---

## Core Principles

### 1. Validation-First

Do NOT trust your own assessment of code correctness. Verify through observable behavior — lint, type-check, tests, and runtime. See the development skills below for specific validation sequences.

### 2. Incremental Progress

- Make one change at a time
- Validate after each change
- Commit after each validated change
- Never batch multiple logical changes

### 3. Respect Boundaries

- Read the target module's SUMMARY.md before making changes
- Never import across module boundaries — use ports/adapters
- Never edit generated code (e.g., the frontend API client)

---

## Forbidden Actions

These rules exist because an agent violated them and caused data loss. They are non-negotiable.

### Never kill processes

You do not understand what is running on the host machine. Processes that look like "just postgres" or "just ssh" may be Colima's infrastructure, SSH tunnels, or other critical services. If a port is occupied or a process is blocking something, **describe the problem and ask** — never `kill`, `pkill`, or `killall`.

### Never use destructive Docker flags

Never use `docker compose down -v`, `docker volume rm`, `docker system prune`, or any command that deletes volumes. Volumes contain database data that cannot be restored. The only safe Docker commands are:

- `docker compose up` / `docker compose down` (without `-v`)
- `docker compose ps` / `docker compose logs`
- `docker compose exec` (to run commands inside containers)

### Never modify system or infrastructure state

Do not stop/restart Colima, edit Docker configs, change network settings, modify `/etc/hosts`, or touch anything outside the repository that isn't a source file.

### When the environment is broken, stop and ask

If Docker won't start, ports are occupied, containers won't come up, or anything infrastructure-related is failing: **describe what you see and ask for instructions.** Do not attempt to diagnose or fix environment issues autonomously. Every escalating "fix" risks making things worse.

### General rule

If an action is irreversible and isn't writing/editing source code, **ask first**.

---

## Development Skills

For detailed development workflows, patterns, and validation checklists, use the appropriate skill:

- **Environment setup** → `worktree-dev` skill (create worktree, start dev stack, isolated per-slot environment)
- **Backend work** → `ayunis-core-backend-dev` skill (NestJS, hexagonal patterns, TDD, validation)
- **Frontend work** → `ayunis-core-frontend-dev` skill (React, Feature-Sliced Design, API client, hooks)
- **Database migrations** → `ayunis-core-migrations` skill (TypeORM entity changes, auto-generated migrations)
