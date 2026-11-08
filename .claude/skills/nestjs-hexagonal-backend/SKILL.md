---
name: nestjs-hexagonal-backend
description: Backend development with NestJS, TypeORM, and hexagonal architecture. Use when creating, modifying, or debugging backend code.
---

# NestJS Hexagonal Backend Development

## Testing

Load the `backend-testing` skill before writing, changing, or deleting a spec,
or deciding how to verify a change. It defines when a change needs a committed
test, which layer it belongs to, and how to run the suite.

## Validation Sequence

Choose validation breadth using the repository's Proportional Workflow.

Fast Path:

```bash
pnpm exec eslint <touched-files>              # Lint without rewriting unrelated files
```

Run `pnpm test <module-path>` when behavior or test code changed. Also run `pnpm exec tsc --noEmit` when types, imports, dependency injection, or other compile-time behavior could be affected.

Standard Path:

```bash
pnpm exec eslint <touched-files>     # Lint without rewriting unrelated files
pnpm exec tsc --noEmit               # 0 type errors
pnpm test <module-path>              # Affected module suites pass
```

High-Risk changes and changes to shared test infrastructure or broad behavior also run `pnpm test` for the full suite.

> ⚠ **`pnpm run lint` is wired with `--fix`** in `ayunis-core-backend/package.json` — running it as a verification step will auto-rewrite unrelated files (migrations, fixtures, entities) and leave them in the working tree. Prefer `pnpm exec eslint <paths>` for verification. If you do run `pnpm run lint`, immediately check `git status --short` and `git restore` any files outside your change set.

When module boundaries or imports change, run dep-cruiser as an architecture cross-check (it catches the no-cross-module-port-imports / no-domain-imports-presenters rules that the pre-commit hook enforces):

```bash
pnpm exec depcruise src        # or whatever the project's depcheck script is
```

## Backend-Specific TypeScript Rules

- `strict: true` with `strictPropertyInitialization: false` (for TypeORM entities)
- `noImplicitReturns: true` — every code path must return
- Use `Logger` (from `@nestjs/common`) instead of `console.*`

## Module Structure (Hexagonal)

Every domain module ships a `SUMMARY.md`. Read it first when editing an existing module, and **create one when you scaffold a new module** — don't submit a PR for a new module without it. The repo convention is uniform: ~96% of existing modules have one, and Bugbot will flag any new module that lands without it.

```text
[module]/
├── SUMMARY.md           # ← Read this first; required for every module
├── domain/              # Pure entities, no decorators
├── application/
│   ├── use-cases/       # Business operations
│   ├── ports/           # Abstract classes (DI tokens, not interfaces)
│   └── dtos/            # Validation decorators
├── infrastructure/
│   └── persistence/postgres/
│       ├── schema/      # TypeORM records
│       ├── mappers/     # Domain ↔ Record conversion
│       └── *.repository.ts
├── presenters/http/     # Controllers (thin)
└── [module].module.ts   # NestJS wiring
```

### Extract module services by responsibility

Keep each class focused on one cohesive responsibility. When a change introduces substantial state, lifecycle management, policy, coordination, caching, pooling, retrying, throttling, or other independently testable behavior, extract it into a dedicated injectable service in the same module instead of growing the existing use case or adapter.

Use cases orchestrate reusable application services. Infrastructure adapters stay focused on translating between an application port and an external technology.

Place the extracted service according to what it owns:

- **`application/services/`** — reusable application or domain policy consumed by use cases.
- **`infrastructure/.../*.service.ts`** — technical behavior tied to an SDK, transport, process lifecycle, cache, pool, queue, or another external mechanism. Application code depends on an application port rather than importing the concrete infrastructure service directly.

Before extending an existing class, ask:

1. Does the new behavior have a separate reason to change?
2. Does it own independent state or lifecycle?
3. Can it be named and tested independently?
4. Could more than one operation or use case need it?

If any answer is yes, prefer a dedicated module service, test it directly, and register it with the NestJS module. Keep a small behavior inline only when it is inseparable from the class's primary responsibility.

### File & class naming

Suffixes carry structural meaning — the wrong one silently breaks the layer contract readers rely on and triggers review churn. **Before naming a new file, grep how the suffix is already used** (`find src -name "*.<suffix>.ts"`) and match that role.

- **`*.service.ts`** — application-layer domain service (`application/services/`). In `infrastructure/`, only for adapters wrapping an *external* capability (encryption, export, transcription, queue) — never a persistence read helper.
- **`*.repository.ts`** — port-backed persistence adapter. **Must `extends` an abstract port** (every `*Repository` does). No port → it is not a repository.
- **`*.query.ts`** — query-input DTO in the application layer: the parameter object for a query use case (`GetXQuery`). Not a persistence read class.
- **`*.command.ts`** — command-input DTO in the application layer: the parameter object for a write use case.
- **`*.mapper.ts`** — object conversion, always in a `mappers/` dir. Two roles: domain ↔ record in `infrastructure/persistence/*/mappers/`, and domain → response DTO in `presenters/http/mappers/` (some modules also keep application-layer mappers in `application/mappers/`).

**Ports are abstract classes, not interfaces** — NestJS DI needs a runtime token. Impls `extends` the port; the module wires `{ provide: Port, useClass: Impl }`; consumers inject the abstract class directly (no `@Inject('TOKEN')`).

A **read-only collaborator of a repository** (a `findOne*`/`findMany*` helper with no port, often extracted to keep the repository under the file-size limit) is neither a repository nor a service — name it `*.finder.ts` / `*Finder`.

## Key Patterns

### Entity IDs — Generated in domain layer, not database

```typescript
// Domain entity
constructor(id: string | null) {
  this.id = id ?? randomUUID();  // ID generated HERE
}

// Record uses @PrimaryColumn, NOT @PrimaryGeneratedColumn
@PrimaryColumn('uuid')
id: string;
```

### Errors — Domain errors, not HTTP exceptions

```typescript
// In use case
throw new AgentNotFoundError(agentId); // Domain error

// NOT
throw new NotFoundException(); // ✗ HTTP exception
```

## Database Migrations

For schema changes, use the `typeorm-migrations` skill. Never write migrations by hand — always auto-generate from entity changes.

## Persistence Queries

When creating or modifying repositories, finders, QueryBuilder code, or database calls in loops, load the `persistence-query-review` skill when it is available. Count the complete call path's database round trips and prefer an atomic database operation when it preserves the same behavior.

## CLS transaction enrollment

Repositories and finders reached from `@Transactional()` methods must resolve
reads and writes through the ambient transaction host at operation time. Review
all records, subtype repositories, QueryBuilders, raw SQL and synchronous
collaborators using [the enrollment checklist](../../../ayunis-core-backend/TRANSACTIONS.md).
Use a real PostgreSQL rollback test for multi-statement atomicity.

## Completion Checklist

- [ ] `pnpm exec eslint <touched-files>` passes (avoid `pnpm run lint` — it's wired with `--fix`)
- [ ] Focused regression or module tests pass when behavior or test code changed
- [ ] Type-check, full suite, and dep-cruiser run when required by the Proportional Workflow and affected failure modes
- [ ] `git status --short` shows only files you intended to change
- [ ] No `any` types introduced
- [ ] DTOs have validation decorators
- [ ] New entities have proper mappers
- [ ] New module has a `SUMMARY.md` at its root (the repo convention; missing files are flagged by Bugbot)
- [ ] New stateful or reusable responsibilities are extracted into dedicated module services
- [ ] Changed persistence paths have no avoidable round trips, check-then-act races, or N+1 queries

## Anti-Patterns

| Don't                                                 | Why                                  | Instead                                |
| ----------------------------------------------------- | ------------------------------------ | -------------------------------------- |
| Throw HTTP exceptions from use cases                  | Couples domain to HTTP               | Throw domain errors                    |
| Name a portless read helper `*.repository`            | Implies a port-backed adapter        | `*.finder.ts` / `*Finder`              |
