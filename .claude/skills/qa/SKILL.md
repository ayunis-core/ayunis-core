---
name: qa
description: PR-specific live behavior QA in ayunis-core — run applicable focused E2E first, then use an isolated seeded stack to verify behaviors, visuals, or edge cases that automated coverage does not prove. Use when the user asks for QA or the repository workflow requires additional live evidence; this supplements rather than replaces required E2E coverage.
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

## 1. Pick the environment

Two lanes. Choose by who owns the branch and what is already running:

- **Own branch, stack already running** — the branch under test is checked out in this checkout, it is the user's own work, and `./dev status` shows a running slot here. Skip the worktree and skip step 2: QA against that slot. Do not seed, reset, or tear anything down afterwards; it is the user's environment. If the survey in CLAUDE.md answered "Reuse the running stack", this lane is already chosen.
- **Foreign or untrusted branch, or nothing running** — a colleague's PR, a bot branch, or the user asked for isolation. Use the worktree lane below; it is the only lane whose teardown is sanctioned.

### Worktree lane

**First, sweep leftovers from earlier QA runs.** A run that died mid-way leaves its slot and dev servers behind (this once ate 24 GB of RAM + swap). Only worktrees registered in the main checkout's `.dev/qa-worktrees` are touched, so the user's slots and worktrees are safe:

```bash
cd "$REPO" && scripts/qa-teardown.sh
```

A non-zero exit means a slot did not come down and its worktree was kept for a retry. Report that to the user (Guardrails: don't fix infra) and carry on with a different slot.

Then use the `worktree` skill. Base the worktree on the PR's branch (not a new one):

```bash
git fetch origin
# --detach: QA is read-only, and it avoids git's "already checked out" refusal when <branch> is the one you're currently on
git worktree add --detach /Users/<you>/Developer/ayunis-core-wt-<slug> origin/<branch>
scripts/qa-teardown.sh --guard "$WT" || exit 1   # untrusted branch: refuse symlinked app dirs, drop any .dev/.env.dev it shipped. Run BEFORE writing anything into the worktree.
mkdir -p "$REPO/.dev" && echo "$WT" >> "$REPO/.dev/qa-worktrees"   # registers it as QA-owned — REQUIRED, or teardown will refuse it. Lives in the MAIN checkout on purpose: the branch under test is untrusted and must not be able to opt worktrees in.
# symlink secret envs + install
# -n: never dereference the destination. Without it, a .env the branch shipped as a
# link to a directory would make ln write the new link *inside* that directory.
ln -sfn "$REPO/ayunis-core-backend/.env"  "$WT/ayunis-core-backend/.env"
ln -sfn "$REPO/ayunis-core-frontend/.env" "$WT/ayunis-core-frontend/.env"
cd "$WT" && pnpm install && (cd ayunis-core-backend && pnpm run build:deps)
```

## 2. Bring up an ISOLATED slot (worktree lane only)

**Never reuse or touch a slot that is already running** unless the own-branch lane above applies — those are the user's. List them first and pick a free number (avoid 0/1 and anything running):

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
5. Backend and frontend — start them **detached with pid files in `./dev`'s state dir**, so `./dev down --slot <N>` (and therefore `qa-teardown.sh`) can kill the whole process tree. Do NOT use `run_in_background` + TaskStop for these: TaskStop kills the shell but orphans the `pnpm → nest → node` children.

   ```bash
   S="$WT/.dev/slot-<N>"; mkdir -p "$S"
   (cd "$WT/ayunis-core-backend" && nohup pnpm run start:dev >> "$S/backend.log" 2>&1 & echo $! > "$S/backend.pid")
   # Frontend must run from ayunis-core-frontend (Vite is a frontend-only dep and won't resolve elsewhere)
   (cd "$WT/ayunis-core-frontend" && VITE_API_BASE_URL=http://localhost:<BE>/api nohup pnpm exec vite --port <FE> >> "$S/frontend.log" 2>&1 & echo $! > "$S/frontend.pid")
   ```

   Poll `http://localhost:<BE>/api/health` until `{"status":"healthy"}`; tail the logs in `$S` if it doesn't come up.

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

Always, even on failure — one command, run from the main checkout (not from inside `$WT`, which is about to be removed):

```bash
cd "$REPO" && scripts/qa-teardown.sh "$WT"
```

It runs `./dev down` for every slot the worktree used (kills the pid-file process trees, `compose down` without `-v`), terminates any stray server whose command line lives under the worktree's app dirs, removes the worktree and drops it from `.dev/qa-worktrees`. It refuses worktrees that are not registered there, and worktrees whose `.dev` contains symlinks.

Verify: `docker ps --filter name=ayunis-dev` shows only the slots that were running **before** you started; `pgrep -fl "$WT"` is empty; `git worktree list` no longer shows `$WT`.

## Guardrails (from CLAUDE.md — non-negotiable)

- **Never** `kill`/`pkill` a process you didn't start. The only sanctioned process termination is `scripts/qa-teardown.sh`, which is scoped to worktrees a QA run registered in the main checkout's `.dev/qa-worktrees`.
- **Never** destructive Docker flags: no `down -v`, `volume rm`, `system prune`. Only `up`/`down`/`ps`/`logs`/`exec`.
- **Never** touch a pre-existing slot or other infra. If a slot's volume is stale (migration `42P07`) or a container won't come up, **describe it and ask** — don't fix it. Just pick a different free slot, or use the native-start fallback against healthy infra.
- If the environment is broken in a way the fallback can't route around, stop and report — don't escalate fixes.
