# AI Coding Agent Guidelines

> **Philosophy**: Code is opaque weights. Correctness is inferred from externally observable behavior.

For architecture overview and module navigation, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Repository Overview

**Ayunis Core** is an open-source AI gateway enabling municipalities to run customizable AI assistants with multi-provider LLM support, tool integration, document retrieval (RAG), and organization-scoped access control.

```text
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

## Code Quality Enforcement

The following rules are enforced by ESLint, pre-commit hooks, and CI. Violations block commits and PRs.

- **Strict TypeScript** — Backend uses `strict: true` (no implicit any, strict null checks, strict bind/call/apply). Frontend uses strict null checks.
- **`no-explicit-any: error`** — Both backend and frontend. Use `unknown` or specific types. If `any` is truly unavoidable (e.g., TypeORM pgvector), add a targeted `eslint-disable` comment with a justification.
- **sonarjs** — Both packages use `eslint-plugin-sonarjs` (recommended config). Cognitive complexity threshold: 15. Lizard enforces the stricter CCN ≤ 10 for individual functions.
- **File size limit** — 500 lines per file (excluding tests, migrations, records, generated code). Enforced by `scripts/check-file-size.sh` in pre-commit.
- **No `console.*`** — Use NestJS `Logger` on the backend. `console.warn` and `console.error` are allowed in specific infrastructure code.
- **Circular dependency detection** — `madge` runs in pre-commit and CI.

---

## Development Skills

For detailed development workflows, patterns, and validation checklists, load the appropriate skill. Skills are listed with descriptions in the system prompt — pick the one that matches the task.
