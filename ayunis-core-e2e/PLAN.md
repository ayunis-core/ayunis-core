# E2E Test Architecture Plan — AI-First

> **Goal**: when a feature is built, an e2e test proves it works. Nobody — human or
> agent — opens a browser to check. The suite is designed so that *Claude writes the
> feature, writes the spec, runs it headlessly, and debugs failures from artifacts*.

## Guiding principles

1. **Determinism before coverage.** A flaky suite is worse than no suite — it trains
   everyone (including the agent) to ignore red. Every source of nondeterminism
   (real LLM calls, shared seed data, async queues, i18n text, onboarding modals)
   gets an explicit mechanism before we scale test count.
2. **API-first setup, UI-only assertions.** Test *setup* (users, orgs, threads,
   sessions) goes through the HTTP API — fast, parallel-safe, and it exercises the
   API for free. The *behaviour under test* is asserted through the real UI.
3. **The suite is an agent interface.** Failures must be diagnosable without a
   human: screenshots (Claude reads PNGs directly), traces, page errors, and exact
   selectors in the message. Conventions must be mechanical enough that an agent
   following them produces a correct test on the first try.
4. **e2e spec is part of the feature's definition of done.** Enforced by workflow
   (skills + PR checklist), not by hope.

---

## Architecture decisions

### D1 — Deterministic LLM via the built-in mock (backend change, small)

The backend already has mock inference handlers that replace **all** providers:

- `src/domain/models/infrastructure/stream-inference/mock.stream-inference.ts`
- `.../inference/mock.inference.ts`, `.../image-generation/mock.image-generation.ts`
- Activated in the three handler registries when `app.isTest` (`NODE_ENV=test`).

Problem: flipping `NODE_ENV=test` on a `./dev` stack has side effects
(`typeorm.config.ts` branches on it; `synaforce.baseURL` fallback). So:

- **Add an explicit `MOCK_INFERENCE=true` env flag** read in `app.config.ts`
  (e.g. `mockInference: NODE_ENV === 'test' || MOCK_INFERENCE === 'true'`) and have
  the three registries check that instead of `isTest` directly. `NODE_ENV` stays
  `development`; nothing else changes. Refuse the flag in production config
  (same guard style as `ensureNonProduction()`).
- **Add `./dev up --e2e`** which exports `MOCK_INFERENCE=true` into the backend env.
  Everything else about the slot is identical.
- Later (Phase 5): make the mock emit **multiple chunks with small delays** so
  streaming UX (progressive rendering, stop button, heartbeats) is exercised
  realistically. The mock's `{provider}::{model}` output convention is an assertable
  contract — specs assert the echoed model id to verify routing end-to-end.

Chat/agent features become fully verifiable: zero API keys, zero cost, zero
variance, and the response text encodes which provider/model was actually routed.

*Real API keys were considered and rejected*: real LLM output can't be asserted on
(nondeterministic), adds provider outages/rate limits/latency as flake sources,
costs tokens on every PR push × workers × retries, and would require production
keys in CI. Provider contract coverage already lives in the per-package workflows
(`provider-anthropic.yml`, `provider-openai.yml`, `inference.yml`). An optional
manually-triggered `@real-llm` tag can cover reality-checks later if wanted.

### D2 — Data isolation: worker-scoped orgs via API factories

The global seed is idempotent but **not parameterizable** — parallel workers sharing
`Demo Org` will collide on mutations. Instead:

- **Global seed stays** for globals only: models, platform config (run
  `pnpm run seed:minimal:ts` once per stack).
- **Each Playwright worker creates its own org** via `POST /api/auth/register`
  (worker-scoped fixture, e.g. `e2e-w3-<runId>@test.local`). That admin then
  provisions whatever the test needs through the API (permitted models, invites,
  teams). Unique data per worker ⇒ `fullyParallel: true` is actually safe, and
  no cleanup is needed between runs (`seed:clean:ts` resets a stack when wanted).
- Tests that specifically need the rich seeded fixture (usage limits, academy
  states, credit-limit edge users like `dan@usage.local`) use a tagged
  `@seeded-org` project that runs serially against `Usage Org`.

### D3 — Auth bootstrap via API, not the login form

The login form is tested **once** in `auth.spec.ts`. Everyone else gets a session
programmatically:

- Worker fixture calls `POST /api/auth/login` with an `APIRequestContext`, captures
  the `access_token`/`refresh_token` cookies into a `storageState`, and hands both
  a logged-in `page` and an authed `api` context to the test.
- Replaces the current `auth.setup.ts` project (form-driven, single shared user)
  — the "wait 2.5s after submit" gotcha disappears because we never race the form.
- Immediately after login, the fixture calls the mark-welcome-video-seen endpoint
  (`onboardingControllerMarkWelcomeVideoSeen`) — freshly created users otherwise get
  the `WelcomeVideoDialog` modal over every authenticated route (seed creates no
  `onboarding` rows).

### D4 — Selector policy (mechanically enforceable)

The UI defaults to **German** (`fallbackLng: 'de'`, detector disabled) and a
mismatched `<html lang>` triggers Chrome auto-translate that corrupts streamed
messages. Text selectors are therefore banned, not discouraged:

- **Only `getByTestId` and `getByRole` (with accessible-name via testid'd context)**.
- Adding `data-testid` to touched components is part of building the feature —
  same PR, never a follow-up. Naming: `<feature>-<element>[-<action>]`, kebab-case
  (`chat-input`, `send`, `thread-rename`).
- Enforce with `eslint-plugin-playwright` in the e2e package: `no-wait-for-timeout`,
  `no-force-option`, `expect-expect`, plus a custom rule/`no-restricted-syntax`
  ban on `getByText`/`locator('text=…')`.
- Existing testids (login form, chat input/send, `assistant-message`,
  `user-message`, sidebar items) are the starting vocabulary.

### D5 — Async-aware helpers instead of sleeps

- **Chat/SSE**: `POST /api/runs/send-message` streams SSE over a POST body with 15s
  heartbeats. Helper `sendMessageAndWaitForReply(page, text)` fills
  `chat-input`, clicks `send`, and waits for a new `assistant-message` testid —
  never a timeout.
- **BullMQ ingestion** (sources, documents, URL crawl are all queue-based): helper
  `expectSourceProcessed(api, sourceId)` polls the API with `expect.poll` until the
  document reaches processed state. No UI polling loops in specs.
- **Emails**: Mailcatcher's JSON API (`http://localhost:<1080+offset>/messages`,
  `/messages/:id.html`) wrapped in a `mail` fixture — fetch latest message for a
  recipient, extract invite/reset/confirm tokens by regex on the known frontend
  paths (`/accept-invite`, `/password/reset`, …). Makes invite and password-reset
  flows fully automatable.

### D6 — Runtime target: the existing `./dev` slot system

No Playwright `webServer`. The suite targets a running `./dev` stack (as now), with
one convention: **a dedicated e2e slot per worktree** started with `--e2e`.
Slot resolution stays `E2E_BASE_URL`-driven so any slot works. CI brings up the
same stack (see D8). Rationale: `./dev` already solves port isolation,
migrations, health-gating, and env injection — duplicating it inside Playwright
would drift.

### D7 — AI-first ergonomics (the part that makes "never open a browser" real)

- **`.claude/skills/e2e` skill** (new): how to bring up an `--e2e` stack, run the
  suite/one spec, the fixture API, selector policy, testid naming, how to add a
  spec for a new feature, and how to debug a failure (read the screenshot, open the
  trace, check `./dev logs backend`). This is the contract an agent loads whenever
  it builds a user-facing feature.
- **Definition of done wiring**: `linear-implement` + frontend skills updated to
  require: user-facing change ⇒ new/updated e2e spec ⇒
  `pnpm --filter ayunis-core-e2e test --grep <feature>` green before the PR is
  submitted. The `qa` skill keeps existing (exploratory, PR-level) but delegates
  regression checks to the suite.
- **Agent-readable failures**: keep `screenshot: only-on-failure` (Claude reads the
  PNG directly), `trace: retain-on-failure` locally (not just first retry), and add
  a JSON reporter output (`test-results/results.json`) so an agent can enumerate
  failures without parsing terminal noise. Console/page errors are already captured
  per spec — promote that into a shared fixture that fails any test on uncaught
  page errors (opt-out per test, not opt-in).
- **Spec template + example**: one exemplary spec per pattern (CRUD dialog, chat
  flow, admin toggle, email flow) that agents copy from — reference implementations
  beat prose rules.

### D8 — CI: real browser, mock LLM, non-blocking first

New workflow `e2e-tests.yml`:

1. Services: `pgvector/pgvector:pg16`, `redis:7-alpine`, MinIO, mailcatcher
   (mirror `backend-tests.yml`'s service-container approach; no Infisical — plain
   env like the backend-tests `.env`).
2. Build backend + frontend (`vite build` + `vite preview --port 3001`, or serve
   `dist` — decide during implementation; `VITE_API_BASE_URL` baked accordingly,
   `CORS_ALLOWED_ORIGINS` must include the preview origin).
3. `migration:run:dev` + `seed:minimal:ts`; start backend with `MOCK_INFERENCE=true`.
4. `playwright install chromium --with-deps` (cached by version), run suite,
   `retries: 2`, workers: 2–4 (worker-org isolation makes this safe).
5. Upload HTML report + traces + screenshots as artifacts on failure.
6. **Non-blocking for ~2 weeks** (visible check, not required) while flake is
   burned down, then flip to required. A test that flakes twice gets `@quarantine`
   (excluded from the gate, tracked in an issue) rather than retry-tuned.

### D9 — Suite topology

```text
ayunis-core-e2e/
  playwright.config.ts        # projects: setup, chromium, pr-media
  src/
    fixtures/
      test.ts                 # fixture composition: page(authed), api, org, mail, pageErrors
    clients/
      generated/              # Orval-generated backend API client (do not edit)
      playwright-api-client.ts # generated-client mutator backed by APIRequestContext
      mailcatcher.client.ts   # Mailcatcher JSON client
      api/                    # semantic wrappers around generated endpoints
    factories/
      org.factory.ts          # org/user/model setup composed from clients
    flows/
      chat.flow.ts            # reusable browser journeys/page interactions
    assertions/               # shared assertion helpers when repetition appears
  tests/
    auth/                     # login form, register, invite accept, password reset
    chat/                     # send/receive (mock LLM), thread CRUD, model switch
    admin/                    # org settings, teams, permitted models, toggles
    sources/                  # upload → queue-processed → usable in chat
    smoke.spec.ts             # route-render sweep (kept from scaffold)
  pr-media/                   # temporary PR media capture infrastructure
```

Specs stay under the repo's 500-line file limit; one user journey per file.

---

## What e2e deliberately does NOT cover

- **Real provider behaviour** (API contract drift, model quirks): providers are
  mocked; real-call coverage stays in the per-package provider test workflows.
  Optionally later: a tiny `@real-llm` nightly tag, off by default.
- **Pure logic**: stays in the 609 backend unit specs / 45 frontend vitest files.
  E2e asserts *wiring and journeys*, not permutations.
- **Visual regression**: out of scope for now; the responsive-width check from the
  `qa` skill can become a helper later.

## Phases

All phases land on the current branch (`feat/e2e/work`) — no stacked branches for
now. Each phase ends at a verified checkpoint: the suite runs green against a
local `--e2e` stack before the next phase starts. (Splitting into stacked PRs can
happen later at submit time if the diff warrants it.)

| Phase | Checkpoint | Contents |
| --- | --- | --- |
| **1. Determinism core** | fixtures work, scaffold specs green | `MOCK_INFERENCE` flag + `./dev up --e2e` (small backend/dev-script change, same branch); fixture composition (`test.ts`), org factory, API clients, API login, welcome-video dismissal; eslint policy; rewrite the 3 scaffold specs onto fixtures |
| **2. Core journeys** | journey specs green, parallel-safe | chat send/receive against mock (assert `{provider}::{model}` routing), thread rename/delete, register, invite via Mailcatcher, password reset, admin settings happy paths |
| **3. CI** | workflow green on this branch | `e2e-tests.yml` as above, artifacts, non-blocking check — ✅ written; full CI job rehearsed locally (built backend serving the built SPA from `dist/frontend`, same origin: 15/15 in 11.9s). Green-on-GitHub pending first push |
| **4. AI workflow** | skill usable end-to-end | ✅ `.claude/skills/e2e` (stack setup, fixture API, selector policy, add-a-spec guide with reference specs, failure debugging); DoD wired into `ayunis-core-frontend-dev` (validation sequence) and `linear-implement` (step 4); `qa` skill now runs relevant specs first and flags missing coverage as a DoD gap. Reference specs serve as the templates |
| **5. Depth** | ongoing | **Temporary PR media** ✅: `pr-media` capture infrastructure is permanent, but scene files are opt-in and live only on `pr-media/pr-<n>` branches. CI fetches `.pr-media/scenes.ts` from that branch, captures exactly those screenshots/GIFs, publishes media back to the same disposable branch, and deletes it when the PR closes. Still open: sources/KB with queue polling, teams/permissions, usage limits (`@seeded-org`), flip CI check to required. (Multi-chunk streaming mock already landed in Phase 2.) |

Phases 1–2 are the payoff point: from then on, "build a feature" includes "write
the spec, run it, ship" — with no browser in the loop.

## Open decisions (resolved during Phase 1)

1. **`MOCK_INFERENCE` flag vs. `NODE_ENV=test`** — ✅ implemented as the flag
   (`app.config.ts` + the three registries; refused in production). Verified
   live: `POST /api/runs/send-message` on a `--e2e` stack streams
   `anthropic::claude-sonnet-4-5` back over SSE with no API keys.
2. **Frontend in CI: `vite dev` vs. `build + preview`** — still open for Phase 3;
   recommend build+preview.
3. **Per-org model permitting** — verified: `org.created` has no model listener,
   so registered orgs start with zero permitted models. The factory permits the
   first seeded language model via `POST /api/models/permitted` and sets it as
   org default. Also verified: registration requires email confirmation whenever
   SMTP is configured (always true on dev stacks) — the org factory extracts the
   token from Mailcatcher; and `POST /api/threads` needs an explicit `modelId`
   when the org default isn't picked up, which Phase 2's chat flow must pass.

## Phase 1 checkpoint (done)

6/6 specs green in 3.4s with 6 parallel workers, each on its own API-created
org, against `./dev up --slot 2 --e2e`. Backend unit tests and typecheck green;
e2e lint + typecheck green; frontend typecheck green (one `data-testid` added
to `SettingsSidebarWidget`).

## Phase 2 checkpoint (done)

15/15 specs (+1 `fixme`) green across six consecutive runs, 14–20s each.
Added journeys: chat send/receive (asserts `{provider}::{model}` routing),
multi-message thread, rename, delete; registration (UI form → Mailcatcher
token → login); invite (API-sent → accept page → member login); password
reset (forgot → emailed token → reset → login); admin internet-access toggle
(UI mutation asserted via API). Frontend gained testids on the register,
forgot/reset-password, invite-accept forms and the shared
confirmation/rename dialogs.

Findings that shaped the suite:

1. **Real product bug caught** (spun off as its own task): deleting the
   currently-viewed thread deletes server-side but the sidebar never
   refetches. The intended behavior lives in a `test.fixme` spec; the
   working delete path (non-viewed thread) is covered normally.
2. **Fresh users get the personalization wizard** on /chat — the org factory
   skips it via `PUT /api/chat-settings/system-prompt` with the frontend's
   `'-'` sentinel.
3. **Mock now streams multiple paced chunks** (40ms) — pulled forward from
   Phase 5; an instant single-chunk response is faster than any real
   provider and races client stream setup.
4. **`--e2e` also disables org-events webhooks** (`ORG_EVENTS_WEBHOOK_URL=`
   in `.env.dev`) — a personal `.env` pointing at an external endpoint
   costs up to 3 HTTPS attempts × 10s timeout per event.
5. **Env-change gotcha**: `appsignal.cjs` (NODE_OPTIONS preload) loads
   dotenv into the `nest --watch` supervisor, and respawned backend
   children inherit that env — dotenv never overrides it. `.env.dev`
   changes therefore need a full `./dev down && up`, not just a watch
   restart. The `up` fast path now refuses to skip when `--e2e` env is
   missing.
6. **Local runs are CPU-bound, not I/O-bound**: 7 default workers × video
   and trace recording plus t=0 org-creation herd (bcrypt, MJML) saturate one
   machine and cascade into 30s timeouts. Local: 4 workers, video off.
   A `setup` warmup project walks the chat flow once so Vite's on-demand
   module transforms are warm before parallel navigation (cold transforms
   were observed hanging a code-split route indefinitely).
