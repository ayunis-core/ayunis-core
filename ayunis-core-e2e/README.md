# ayunis-core-e2e

End-to-end tests for Ayunis Core, using [Playwright](https://playwright.dev).
Tests drive the real frontend against a locally-running `./dev` stack in
**e2e mode**: all LLM providers are replaced by deterministic mocks
(`MOCK_INFERENCE=true`), so no API keys are needed and chat responses are
assertable (`{provider}::{model}`).

See [PLAN.md](./PLAN.md) for the architecture and roadmap.

## Prerequisites

A running e2e-mode stack with the global seed (models, platform config).
From the repo root:

```bash
./dev up --slot 2 --e2e                    # frontend → http://localhost:3021
(cd ayunis-core-backend && pnpm seed)
```

## Install

```bash
pnpm install                  # from the repo root (installs this workspace)
pnpm --filter ayunis-core-e2e install:browsers   # one-time Chromium download
```

## Run

```bash
pnpm --filter ayunis-core-e2e test          # headless
pnpm --filter ayunis-core-e2e test:ui       # interactive UI mode
pnpm --filter ayunis-core-e2e test:headed   # headed browser
pnpm --filter ayunis-core-e2e report        # open last HTML report
pnpm --filter ayunis-core-e2e lint          # selector/flake policy
pnpm --filter ayunis-core-e2e typecheck
pnpm --filter ayunis-core-e2e openapi:generate # regenerate typed API client
pnpm --filter ayunis-core-e2e pr-media:capture # temporary PR media scenes
```

## Configuration

Copy `.env.example` to `.env` (or export the vars) to override defaults:

| Variable       | Default                 | Purpose                                        |
| -------------- | ----------------------- | ---------------------------------------------- |
| `E2E_BASE_URL` | `http://localhost:3021` | Frontend URL (slot 2). Slot N → `3001 + N×10`. |
| `E2E_API_URL`  | derived from slot       | Backend URL (`3000 + N×10`).                   |
| `E2E_MAIL_URL` | derived from slot       | Mailcatcher web/JSON API (`1080 + N×10`).      |

## Architecture

- **Worker-scoped orgs** — each Playwright worker registers its own org via
  `src/factories/org.factory.ts`: admin user, email confirmation through
  Mailcatcher, a permitted default language model, welcome video dismissed.
  Workers never share mutable data, so tests run fully parallel.
- **API-first auth** — pages start authenticated via storageState captured
  from API login; the login *form* is covered once in `tests/auth/`.
- **`api` fixture** — an authenticated `APIRequestContext` for setup and
  side-effect assertions.
- **Page-error guard** — any uncaught client error fails the test
  (opt out per test: `test.use({ allowPageErrors: true })`).
- **Generated API client** — `src/clients/generated/` is Orval-generated from
  the frontend's checked-in OpenAPI schema. Do not edit it manually; run
  `pnpm --filter ayunis-core-e2e openapi:generate`.
- **Clients/factories/flows split** — raw endpoint calls belong behind
  `src/clients/api/`, data composition in `src/factories/`, and reusable UI
  journeys in `src/flows/`.
- **Mail client** — `src/clients/mailcatcher.client.ts` reads Mailcatcher's JSON
  API to await emails and extract tokens (confirm/invite/reset links).

## Source layout

```text
src/
  fixtures/       Playwright fixture composition only
  clients/
    generated/    Orval-generated backend API client, do not edit
    api/          Semantic test-facing wrappers around generated endpoints
    *.client.ts   External clients/adapters, e.g. Mailcatcher + Playwright mutator
  factories/      Test data creation composed from clients
  flows/          Reusable browser journeys and page interactions
  assertions/     Shared assertion helpers when repetition appears
tests/            Product journeys grouped by domain
pr-media/         Temporary PR media capture infrastructure; scenes live on pr-media/pr-<n>
```

## Conventions

- Import `test`/`expect` from `src/fixtures/test`, never from
  `@playwright/test` directly (except inside fixtures).
- **Selectors: `getByTestId` / `getByRole` only.** The UI defaults to German
  and text can be rewritten by Chrome auto-translate — text selectors are
  banned by ESLint. Add a `data-testid` to the frontend when a stable hook is
  missing (same PR as the feature; naming: `<feature>-<element>`, kebab-case).
- No `waitForTimeout`, no `force: true` — both are ESLint errors. Wait on
  conditions (locators, `expect.poll`) instead.
- Tests that exercise login opt out of the shared session with
  `test.use({ storageState: { cookies: [], origins: [] } })`.

## CI

`.github/workflows/e2e-tests.yml` runs the suite on PRs touching backend,
frontend, packages, or this package. It mirrors production serving: the
built backend serves the built SPA from `dist/frontend` (same origin), with
Postgres/Redis/MinIO/Mailcatcher as service containers and
`MOCK_INFERENCE=true`. `E2E_BASE_URL`/`E2E_API_URL` both point at the
backend (port 3000); Playwright report, traces, and the backend log upload
as artifacts on failure.

Temporary screenshots/GIFs are opt-in per PR. Add `.pr-media/scenes.ts` to the disposable `pr-media/pr-<n>` branch with `scripts/pr-media/update-scenes.sh --branch current <scenes.ts>`; CI fetches that scene file, captures exactly those scenes, publishes the media back to `pr-media/pr-<n>`, and deletes the branch/comment when the PR closes. No PR media scenes are committed to product branches.
