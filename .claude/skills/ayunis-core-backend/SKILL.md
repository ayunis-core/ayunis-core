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

**The injection point must be module A's application layer (a use case or service) — never an infrastructure adapter. Infrastructure must not import use cases** (enforced by the `adapters-no-use-cases` dependency-cruiser rule; inbound/driving adapters like queue consumers and scheduled tasks are exempt). If an adapter seems to need another module's functionality because the relevant data only appears mid-fetch, restructure so the adapter returns raw data and the application layer makes the cross-module call (e.g. the Cheerio URL adapter returns raw bytes, and `RetrieveUrlUseCase` decides whether to delegate PDFs to the file-retrieval use case).

**Persistence records are an exception to the cross-module rule.** TypeORM schema records (`*.record.ts`) may reference records from other modules via `@ManyToOne` / `@OneToOne` + `@JoinColumn` to declare foreign-key relationships — this is required for referential integrity (see the `typeorm-migrations` skill). The "don't cross modules" guidance applies to application-layer code (use cases, services), not to schema records, which are infrastructure that must mirror the DB.

Before modifying any module, read its `SUMMARY.md`. See [ARCHITECTURE.md](../../ARCHITECTURE.md) for the complete module index.

## ConfigService access — match the `registerAs` namespace

Backend config is loaded via `registerAs('<namespace>', () => ({...}))` factories. **The lookup key must be prefixed with the namespace**, or `ConfigService.get(...)` returns `undefined` and the call site silently uses a missing value (e.g. `apiKey: undefined` → 401 at runtime, not at boot).

For model providers, the namespace is `models`:

```typescript
// CORRECT ✓
this.configService.get<string>('models.mistral.apiKey')
this.configService.get<string>('models.openai.apiKey')
this.configService.get<string>('models.anthropic.apiKey')

// WRONG ✗ — un-namespaced; returns undefined
this.configService.get<string>('mistral.apiKey')
```

Before adding a new provider handler, **grep an existing one** for the exact key path rather than transcribing from the `.env` variable name — the env-var → config-key mapping lives in the `registerAs` factory and the namespace is easy to drop on the floor.

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
