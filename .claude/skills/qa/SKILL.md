---
name: qa
description: Behaviour QA of a PR/branch before merge in ayunis-core — spin up an isolated dev slot, seed, drive the changed flow end-to-end (API + headless browser), assert acceptance criteria with evidence, then tear everything down. Use when asked to "QA", "verify a PR/branch before merge", "check the behaviour works", or to confirm a change works in the real running app (not just tests).
---

# Pre-merge QA

Verify that a PR actually behaves to spec by **exercising it in the running app**, then leave the machine exactly as it was. This is behaviour verification, not code review — pair it with `/code-review` for the diff.

Scripted regression coverage lives in `ayunis-core-e2e/` (see the `e2e` skill). When an applicable spec exists or the repository's Proportional Workflow requires browser coverage, run the focused spec first (`pnpm --filter ayunis-core-e2e test --grep "<area>"`, needs an `--e2e` stack); a green spec is evidence for its criterion. Spend manual QA effort on what lower-level and E2E coverage do not prove: the PR-specific behaviours, visuals, and edge cases. Missing E2E coverage is a definition-of-done gap only when the change's classification or failure modes require it.

## Input

A ticket ID (e.g. `AYC-2`), a PR number/URL, or a branch name. If none given, use the current branch. Optionally, explicit acceptance criteria — otherwise derive them (below).

## 0. Establish acceptance criteria FIRST

You can't verify "it works" without knowing what "works" means. Get the criteria before touching the environment:

- **Ticket** — `linear issue view <ID> --json` (the description's "Solution"/acceptance section).
- **PR** — `gh pr view <n> --json title,body`.
- If still ambiguous, ask the user for the 1–3 concrete behaviours to confirm.

Write them down as a checklist. Every one must end the run marked ✅/❌ with evidence.

## 1. Worktree the branch

Use the `worktree` skill. Base the worktree on the PR's branch (not a new one):

```bash
git fetch origin
# --detach: QA is read-only, and it avoids git's "already checked out" refusal when <branch> is the one you're currently on
git worktree add --detach /Users/<you>/Developer/ayunis-core-wt-<slug> origin/<branch>
# symlink secret envs + install
ln -sf "$REPO/ayunis-core-backend/.env"  "$WT/ayunis-core-backend/.env"
ln -sf "$REPO/ayunis-core-frontend/.env" "$WT/ayunis-core-frontend/.env"
cd "$WT" && pnpm install && (cd ayunis-core-backend && pnpm run build:deps)
```

## 2. Bring up an ISOLATED slot

**Never reuse or touch a slot that is already running** — those are the user's. List them first and pick a free number (avoid 0/1 and anything running):

```bash
docker ps --filter name=ayunis-dev --format '{{.Names}}'   # see which slots are up
cd "$WT" && ./dev up --slot <FREE_N>                        # e.g. 2, 3, 4 …
```

Port formula: `port + slot×10` (slot 2 → backend 3020, frontend 3021, postgres 5452, minio 9020). See the `dev-environment` skill.

### Fallback: `./dev up` aborts on an unhealthy peripheral container

`./dev up` does `docker compose up --wait`, so one unhealthy peripheral (e.g. `anonymize` in a restart loop) makes it bail **before** starting the backend — even though postgres/minio/redis are healthy. Do **not** try to fix the container (see Guardrails). Start the app natively against the healthy infra instead:

1. Confirm core infra is healthy: `docker compose -p ayunis-dev-<N> ps` (postgres, minio, redis Up/healthy).
2. Read the actual published host ports (don't hardcode peripherals):
   `docker compose -p ayunis-dev-<N> ps --format '{{.Service}} {{.Publishers}}'`
3. Write `ayunis-core-backend/.env.dev` (gitignored) mirroring what `./dev` generates — see the block `./dev`'s `cmd_up` writes. Key vars: `PORT`, `POSTGRES_PORT`, `MINIO_PORT`, `REDIS_PORT`, `SMTP_PORT`, `CODE_EXECUTION_SERVICE_URL`, `ANONYMIZE_SERVICE_URL`, `GOTENBERG_URL`, `CORS_ALLOWED_ORIGINS`, and a fresh `MCP_ENCRYPTION_KEY=$(openssl rand -hex 32)`. Provider API keys come from the symlinked `.env` — do NOT put them in `.env.dev`.

   **Critical:** `./dev up` generates random MinIO/Redis passwords *before* `compose --wait` but only writes them to `.env.dev` *after* — so when it dies at `--wait`, the infra is running with passwords that were never persisted. Don't regenerate them (the backend won't match the live containers); recover the real ones from the running containers:

   Pipe them **straight into `.env.dev`** — never echo secrets to the terminal (transcripts/CI logs are retained):

   ```bash
   P=ayunis-dev-<N>; ENV=ayunis-core-backend/.env.dev
   mi=$(docker inspect "$(docker compose -p $P ps -q minio)" -f '{{range .Config.Env}}{{println .}}{{end}}')
   { echo "MINIO_ACCESS_KEY=$(grep -m1 '^MINIO_ROOT_USER='     <<<"$mi" | cut -d= -f2-)"
     echo "MINIO_SECRET_KEY=$(grep -m1 '^MINIO_ROOT_PASSWORD=' <<<"$mi" | cut -d= -f2-)"
     docker inspect "$(docker compose -p $P ps -q redis)" -f '{{range .Config.Env}}{{println .}}{{end}}' | grep -m1 '^REDIS_PASSWORD='
   } >> "$ENV"
   ```

   Without these three the backend can't reach MinIO/Redis. (`MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD` map to `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY`; `REDIS_PASSWORD` keeps its name.)
4. `cd ayunis-core-backend && pnpm run migration:run:dev`
5. Backend (from `ayunis-core-backend`): `pnpm run start:dev` (run_in_background). Poll `http://localhost:<BE>/api/health` until `{"status":"healthy"}`.
6. Frontend — **must run from `ayunis-core-frontend`** (Vite is a frontend-only dep and won't resolve from the backend dir or repo root): `cd ../ayunis-core-frontend && VITE_API_BASE_URL=http://localhost:<BE>/api pnpm exec vite --port <FE>` (run_in_background).

## 3. Seed

```bash
cd ayunis-core-backend && pnpm run seed:minimal:ts   # idempotent
```

Login: **`admin@demo.local` / `admin`** (Admin + Super Admin). See `seed-database`. Note the seed's teams may belong to a different org — if you need a team in the admin's org, create one via `POST /teams`.

## 4. Drive the changed flow

Pick the layers the change touches. Prefer BOTH when the feature spans API + UI.

### Backend behaviour — authenticated API

Use a cookie jar; assert response fields, don't just eyeball.

```bash
API=http://localhost:<BE>/api ; J=/tmp/qa.cookies ; rm -f $J
curl -sf -c $J -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@demo.local","password":"admin"}' >/dev/null
# then -b $J on every subsequent call. Discover payload shapes from:
curl -sf $API/docs-json -o /tmp/dj.json   # OpenAPI: paths, request/response schemas
```

Reproduce the spec: set up preconditions, toggle the thing, assert the observable outcome (e.g. create a thread and assert `isAnonymous === true`). Test both the positive and the control (off → off).

### Frontend behaviour — headless browser

Use `puppeteer-core` (already a backend dependency) with the system Chrome — this is what works on this machine:

```js
// node script, run from repo root
import puppeteer from '<repo>/node_modules/.pnpm/puppeteer-core@<ver>/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
const page = await b.newPage();
page.on('console', m => m.type()==='error' && errs.push(m.text()));
// login (generous waits — auth cookie must land before navigating to a protected route):
await page.goto(`${BASE}/login`, {waitUntil:'networkidle2'});
await page.type("input[name='email']",'admin@demo.local'); await page.type("input[name='password']",'admin');
await Promise.all([page.click("button[type='submit']"), page.waitForNavigation({waitUntil:'networkidle2'}).catch(()=>{})]);
await new Promise(r=>setTimeout(r,2500));
```

Gotchas that bit us:

- **Login timing:** wait ~2.5s after submit before navigating, or the protected route bounces back to `/login`.
- **Radix tabs:** a synthetic `el.click()` inside `page.evaluate` does NOT switch the tab. Use a real element-handle click: `await (await page.$$('button[role=tab]'))[i].click()`, then `waitForFunction` on the active `[role=tabpanel][data-state=active]`.
- Screenshot (`fullPage: true`) and `Read` it as evidence. Assert the concrete DOM node exists (e.g. a switch with `id$='-anonymous'`), and confirm interactions **persist across reload** (proves it hit the API).
- Assert `console errors: none` (ignore incidental 403/favicon noise).

### Responsiveness (REQUIRED when the diff touches frontend layout/UI)

Drive the changed screen at each breakpoint and assert it doesn't break. The overflow check is the automatic fail signal — a screenshot alone won't catch a busted layout:

```js
for (const [name, width] of [['mobile',375],['tablet',768],['desktop',1280]]) {
  await page.setViewport({ width, height: 900, deviceScaleFactor: 2 });
  await new Promise(r=>setTimeout(r,400)); // let CSS/reflow settle
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`${name} ${width}px  horizontalOverflow=${overflow}px`); // expect ≤ 1
  await page.screenshot({ path: `<scratchpad>/pr-media/resp-${name}.png`, fullPage: true });
}
```

- **Fail** if `overflow > 1` at any breakpoint (horizontal scrollbar = broken layout). Report the width and px.
- Eyeball each shot for the mobile essentials: no clipped controls, nav collapses to its hamburger/drawer, dialogs and tables stay usable.
- The three `resp-*.png` count as evidence and can double as PR media (step 4b).

## 4b. Frontend PR media (when it adds review evidence)

Use the repository's Proportional Workflow to decide whether media materially helps reviewers evaluate the visible result. QA screenshots remain local evidence even when publication adds no value.

When PR media is warranted, load the `pr-media` skill and follow its current publication workflow. Capture only the affected states and viewports. Add a GIF only when an interaction, transition, or multi-step flow cannot be judged from static screenshots. Do not duplicate the publishing implementation here; `pr-media` is the source of truth for its branch naming, automation, and verification.

## 5. Report

Present the acceptance-criteria checklist, each ✅/❌ with its evidence (asserted values, screenshot path). If anything failed, say so plainly with the observed vs expected — do not soften it. This is the whole point. When PR media was warranted, confirm the `pr-media` workflow published and verified it.

## 6. Tear down — leave the machine exactly as found

Always, even on failure:

```bash
# stop the native processes YOU started (use TaskStop on the background task ids)
cd "$WT" && ./dev down --slot <N>        # slot you brought up — NEVER a pre-existing one
git -C "$WT" restore packages/*/dist     # build:deps rebuilds these; don't leave them dirty
rm -f "$WT"/ayunis-core-backend/.env.dev
cd "$REPO" && git worktree remove "$WT" --force
```

Verify: `docker ps --filter name=ayunis-dev` shows only the slots that were running **before** you started; the QA slot's ports are free; the main checkout is on its original branch.

## Guardrails (from CLAUDE.md — non-negotiable)

- **Never** `kill`/`pkill` a process you didn't start. Stop your own background tasks via TaskStop.
- **Never** destructive Docker flags: no `down -v`, `volume rm`, `system prune`. Only `up`/`down`/`ps`/`logs`/`exec`.
- **Never** touch a pre-existing slot or other infra. If a slot's volume is stale (migration `42P07`) or a container won't come up, **describe it and ask** — don't fix it. Just pick a different free slot, or use the native-start fallback against healthy infra.
- If the environment is broken in a way the fallback can't route around, stop and report — don't escalate fixes.
