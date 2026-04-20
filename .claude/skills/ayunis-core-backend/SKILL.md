---
name: ayunis-core-backend
description: Ayunis Core backend specifics — module boundaries, key files, and project conventions. Complements the nestjs-hexagonal-backend skill.
---

# Ayunis Core Backend

Load the `nestjs-hexagonal-backend` skill first — this skill adds project-specific context on top.

## Working Directory

**All commands run from `ayunis-core-backend/`:**

```bash
cd ayunis-core-backend
```

## Module Boundaries

The backend enforces strict bounded contexts:

- **`src/domain/*`** — Core business logic (agents, threads, messages, runs, models, tools, prompts, sources, RAG, etc.)
- **`src/iam/*`** — Identity and access management (auth, users, orgs, subscriptions, quotas, teams, etc.)
- **`src/common/*`** — Shared infrastructure only (base classes, utilities)
- **`src/admin/*`** — Super admin routes

Cross-module communication uses **exported use cases**, not ports/adapters. When module A needs functionality from module B, module A imports B's module and injects B's use case directly — do NOT create a port in A with an adapter that wraps B. Ports (abstract interfaces) are only for **infrastructure boundaries within a module** (e.g., a repository port implemented by a persistence adapter).

**Persistence records are an exception to the cross-module rule.** TypeORM schema records (`*.record.ts`) may reference records from other modules via `@ManyToOne` / `@OneToOne` + `@JoinColumn` to declare foreign-key relationships — this is required for referential integrity (see the `typeorm-migrations` skill). The "don't cross modules" guidance applies to application-layer code (use cases, services), not to schema records, which are infrastructure that must mirror the DB.

Before modifying any module, read its `SUMMARY.md`. See [ARCHITECTURE.md](../../ARCHITECTURE.md) for the complete module index.

## User Context

User identity comes from `ContextService`, not method parameters:

```typescript
// CORRECT ✓
const userId = this.contextService.get('userId');

// WRONG ✗
async execute(command: { userId: string })  // Don't pass context
```

## Key Files

| Purpose                     | Location                                        |
| --------------------------- | ----------------------------------------------- |
| Architecture & module index | `ARCHITECTURE.md`                               |
| Module summaries            | `src/[area]/[module]/SUMMARY.md`                |
| TypeORM config              | `src/db/datasource.ts`                          |
| OpenAPI spec                | `http://localhost:PORT/api/docs` (when running) |

> [!IMPORTANT] Always update `ARCHITECTURE.md` and the module's `SUMMARY.md` file if necessary!

## Health Check

After changes, verify the service responds:

```bash
curl http://localhost:PORT/api/health
```

The port depends on the dev slot — check with `./dev status` from the repo root.
