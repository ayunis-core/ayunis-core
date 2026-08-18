---
name: e2e
description: Write and run Playwright e2e tests in ayunis-core-e2e. MUST be loaded when a user-facing feature is built or changed — the definition of done includes a green e2e spec — and whenever running, writing, or debugging browser tests.
---

# E2E Tests — ayunis-core-e2e

Browser tests against the real stack with deterministic LLM mocks. A
user-facing feature is **done when its e2e spec passes** — no manual browser
check needed. Architecture and history: `ayunis-core-e2e/PLAN.md`.

## Stack setup (once per session)

Tests need a running `./dev` stack in **e2e mode** plus the global seed:

```bash
./dev up --slot 2 --e2e                    # from the repo root; pick a free slot
(cd ayunis-core-backend && pnpm seed)
```

- `--e2e` writes `MOCK_INFERENCE=true` (all LLM providers become mocks that
  reply `{provider}::{model}`) and `ORG_EVENTS_WEBHOOK_URL=` (no outbound
  webhooks) into `.env.dev`.
- Check slot availability first: `docker ps --format '{{.Names}}' | grep ayunis-dev`.
  Never touch someone else's running slot.
- **Env-change gotcha**: if the stack was already running without `--e2e`,
  the backend must fully restart (`./dev down && ./dev up --e2e`). A
  `nest --watch` respawn is NOT enough — the watch supervisor caches env
  (appsignal.cjs preloads dotenv) and children inherit it.

## Running

```bash
pnpm --filter ayunis-core-e2e test                       # full suite
pnpm --filter ayunis-core-e2e test --grep "<pattern>"    # one spec/test
pnpm --filter ayunis-core-e2e run lint                   # selector/flake policy
pnpm --filter ayunis-core-e2e run typecheck
pnpm --filter ayunis-core-e2e run openapi:generate       # refresh generated API client
```

Non-default slot: `E2E_BASE_URL=http://localhost:30N1 pnpm --filter ...`
(API and Mailcatcher URLs derive from the slot; see `src/config.ts`).

Temporary PR-review screenshots/GIFs use `pnpm --filter ayunis-core-e2e run pr-media:capture`. Scene definitions are not committed to product branches; use the `pr-media` skill to put `.pr-media/scenes.ts` on the disposable `pr-media/pr-<n>` branch for the PR.

For visible frontend changes, PR media is part of the post-submit workflow: after the product PR exists, create temporary PR media unless the user explicitly opts out. Include desktop and mobile screenshots of the changed UI, plus a short GIF for changed interactions, dialogs, menus, or flows.

## Fixtures — import from `src/fixtures/test`, never `@playwright/test`

```ts
import { test, expect } from '../../src/fixtures/test';
```

- `org` (worker-scoped) — every worker gets its own org created via the API:
  admin user (`org.admin.email` / `org.admin.password`), email confirmed,
  one permitted language model set as org default (`org.defaultModel`),
  welcome video + personalization wizard dismissed. Tests in a worker share
  it; workers never collide — this is what makes `fullyParallel` safe.
- `page` — starts authenticated as the worker org's admin. Specs that test
  login/registration opt out:
  `test.use({ storageState: { cookies: [], origins: [] } })`.
- `api` — authenticated `APIRequestContext` for setup and side-effect
  assertions (e.g. assert a toggle persisted via `GET`), not for the
  behaviour under test.
- `mail` — Mailcatcher client; `mail.extractLinkToken(email, '/accept-invite')`
  polls for the email and pulls the token from the frontend link.
- `pageErrorGuard` (auto) — any uncaught page error fails the test. Opt out
  per test with `test.use({ allowPageErrors: true })` only with a comment why.
- Chat flow helpers (`src/flows/chat.flow.ts`): `sendMessage`, `startThread`
  (returns threadId), `sidebarThreadItem`.
- Mock replies are assertable:
  `expect(...).toContainText(`${org.defaultModel.provider}::${org.defaultModel.name}`)`
  proves routing end to end.

## Selector policy (ESLint-enforced)

- **Only `getByTestId` / `getByRole`.** Text selectors are banned: the UI
  defaults to German and Chrome auto-translate can rewrite DOM text.
- No `page.waitForTimeout`, no `{ force: true }` — wait on locators or
  `expect.poll`.
- Missing a stable hook? **Add a `data-testid` to the frontend in the same
  PR** — that is part of building the feature, not test scaffolding.
  Naming: `<feature>-<element>[-<action>]`, kebab-case (`register-email`,
  `invite-accept-submit`, `confirmation-confirm`).

## Source layout

```text
src/fixtures/       Playwright fixture composition only
src/clients/generated/ Orval-generated backend API client (do not edit)
src/clients/api/    Semantic wrappers around generated endpoints
src/clients/*.ts    External clients/adapters, e.g. Mailcatcher + Playwright mutator
src/factories/      Test data creation composed from clients
src/flows/          Reusable UI journeys/page interactions
src/assertions/     Shared assertion helpers when repetition appears
tests/<domain>/     Product journeys, one journey per spec file
```

## Adding a spec for a new feature

1. One user journey per file under `tests/<domain>/`. Copy the closest
   reference:
   - CRUD + dialogs: `tests/chat/thread-crud.spec.ts` (rename/delete via shared dialogs)
   - Email-driven flow: `tests/auth/invite.spec.ts`, `tests/auth/password-reset.spec.ts`
   - Public form journey: `tests/auth/register.spec.ts`
   - Admin mutation with API assertion: `tests/admin/instructions.spec.ts`
2. Prefer generated endpoint calls behind `src/clients/api/`; do not hardcode backend routes in specs. Compose test data in `src/factories/`, reusable UI journeys in `src/flows/`, and assert behaviour through the UI.
3. Unique data per test (`Date.now()` suffixes) — tests share the worker org.
4. Run the spec, then the full suite, then lint + typecheck.

## Debugging a failure

1. Read the failure output, then **look at the screenshot** —
   `test-results/<test>/test-failed-1.png` (readable directly).
2. `test-results/<test>/error-context.md` has the accessibility snapshot at
   failure time; `trace.zip` has the full network/DOM timeline
   (`pnpm exec playwright show-trace <path>`; the `*.network` files inside
   are JSON if headless analysis is needed).
3. Backend side: `./dev logs backend --tail 200` (or `.dev/slot-N/backend.log`).
4. A request stuck "in flight" on a cold dev stack is usually a Vite
   on-demand transform — the warmup project (`tests/setup/warmup.setup.ts`)
   should prevent it; suspect real bugs before suspecting the suite.
5. If the app is genuinely broken, that's the suite working: report the bug,
   keep the intended behaviour as `test.fixme` with a comment, and reference
   it (pattern: "deletes the currently viewed thread" in `tests/chat/thread-crud.spec.ts`).

## Gotchas

- The seeded fixture (`admin@demo.local`, Usage Org users) is shared global
  state — specs that mutate it don't parallelize; prefer worker orgs. Rich
  seeded scenarios (usage limits, academy states) are Phase 5 (`@seeded-org`).
- Local runs cap at 4 workers and disable video deliberately (CPU contention
  causes 30s-timeout cascades) — don't raise them to "speed things up".
- CI (`.github/workflows/e2e-tests.yml`) serves the **built** frontend from
  the backend (same origin, port 3000) — dev-server-only behaviour won't
  reproduce there.
