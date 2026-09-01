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

## Place Responsibilities Before Writing Code

Before adding a backend file, inventory the target module's existing directories and inspect the two closest analogues. Follow the module's established vocabulary and placement; do not create a file directly under a layer root such as `application/` when its role belongs in an existing subdirectory.

Assign each responsibility to one layer before implementation:

- **Presenter DTOs** validate transport input completely, including conditional requirements and exact confirmation values.
- **Controllers** translate validated HTTP input, invoke use cases, and translate results. They do not repeat DTO validation, make business decisions, or query repositories.
- **Application models** hold data and behavior shared across commands or use cases without becoming domain state. Put them under `application/models/`.
- **Application services/use cases** coordinate policy decisions and cross-module calls. Prefer a service when multiple entry points enforce the same policy.
- **Domain objects** own business invariants intrinsic to persisted domain state.
- **Infrastructure records and mappers** mirror persistence; they do not decide application policy.

Before finalizing the design, check for the same policy or entity lookup in adjacent controllers and use cases. Consolidate duplicated decisions at the narrowest shared application boundary and avoid loading the same entity twice in one request path.

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

## Outbound Provider Errors

Any code path that calls an external provider over the network (LLM inference, embeddings, Mistral OCR, vendor SDKs) must classify failures through the shared taxonomy in `src/common/errors` (AYC-538) — do **not** invent per-adapter "service busy / timeout" error classes:

```typescript
const providerError = wrapProviderFailure(error, { provider, modelId });
if (providerError) throw providerError; // ProviderUnavailableError family
// else: ApplicationError rethrows as-is; upstream 4xx and unknown errors
// stay in the module's own error family (potentially OUR bug — must remain
// a distinct, first-occurrence-alerting AppSignal incident)
```

- `wrapProviderFailure` returns `ProviderConnectionError` (502) / `ProviderTimeoutError` (504) / `ProviderServerError` (502) for transport failures (errno, undici, TLS codes, SDK wrapper names — cause chains are walked) and upstream 5xx; `undefined` for everything else.
- **Grouping contract**: each error sets `name === code === PROVIDER_UNAVAILABLE_<CLASS>_<PROVIDER>` so AppSignal opens one incident per provider+failure-class. There is only one reporting path — `setError()` *is* `span.recordException()`, and AppSignal's SpanProcessor forwards every `exception` span event from every span — and OpenTelemetry derives the grouping key `exception.type` as **`code ?? name`** (truthy `code` wins). Setting both to the same string is what makes the key stable no matter which span records it. Never add these errors to `ignoreErrors` in `appsignal.cjs` — per-occurrence notifications are disabled AppSignal-side so rate-based anomaly triggers keep working.
- **Suppressions are a registry, not a config literal**: every `ignoreErrors` / `ignoreRequestHook` / disabled-instrumentation entry lives in `SUPPRESSIONS` in `appsignal-hooks.cjs` (AYC-563) and must carry a `reason` and an owning `ticket`. The spec asserts each `ignoreErrors` entry against a real instance of its error, because an entry naming a class whose instances carry a `.code` suppresses nothing at all — silently. `appsignal.cjs` only consumes the registry; it decides nothing.
- Reference choke points: `stream-inference.use-case.ts`, `get-inference.use-case.ts` (models), `embed-text.use-case.ts` (embeddings), `mistral-file-retriever.handler.ts` (OCR, incl. `ProviderRequestRejectedError` for machine-generated 4xx — but not 401/403 auth-config bugs).
- **Not a provider**: fetching customer-pasted URLs. Keep `UrlRetrieverRetrievalError` (422) and enrich its metadata with `classifyTransportError()` output instead.
- This hand-written translate-catch at outbound choke points is the sanctioned exception to `use-case-reference`'s "no hand-written try/catch error boundaries" rule.

## Key Files

| Purpose                     | Location                                        |
| --------------------------- | ----------------------------------------------- |
| Architecture & module index | `ARCHITECTURE.md`                               |
| Module summaries            | `src/[area]/[module]/SUMMARY.md`                |
| TypeORM config              | `src/db/datasource.ts`                          |
| OpenAPI spec                | `http://localhost:PORT/api/docs` (when running) |

> [!IMPORTANT] Always update `ARCHITECTURE.md` and the module's `SUMMARY.md` file if necessary!

## Running Tests

Run backend tests with **`pnpm test`** from `ayunis-core-backend/` — never bare `jest` or `npx jest`.

```bash
cd ayunis-core-backend
pnpm test                      # full suite
pnpm test <path-or-pattern>    # a subset
```

`pnpm test` runs Jest through the project's configured runner (Node ESM flags, module-name mapping). Invoking `jest` / `npx jest` directly bypasses that setup, and the ESM-only `p-queue` dependency then fails to resolve — the `embeddings-throttle` and `ingest-bulk-content` RAG suites blow up with module-resolution errors.

**Those failures are an artifact of the wrong invocation, not a real regression.** Do not report them as "pre-existing failures on main" or hang caveats on a PR summary because of them — re-run with `pnpm test` and they pass. A suite that fails under `pnpm test` is a genuine signal worth investigating.

## Health Check

After changes, verify the service responds:

```bash
curl http://localhost:PORT/api/health
```

The port depends on the dev slot — check with `./dev status` from the repo root.
