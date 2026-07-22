---
name: qa
description: Behaviour QA of a PR/branch before merge in ayunis-core — spin up an isolated dev slot, seed, drive the changed flow end-to-end (API + headless browser), assert acceptance criteria with evidence, then tear everything down. Use when asked to "QA", "verify a PR/branch before merge", "check the behaviour works", or to confirm a change works in the real running app (not just tests).
---

# Pre-merge QA

Verify that a PR actually behaves to spec by **exercising it in the running app**, then leave the machine exactly as it was. This is behaviour verification, not code review — pair it with `/code-review` for the diff.

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

## 4b. Frontend PR media (REQUIRED when the diff touches the frontend)

Standing rule: **any PR that changes `ayunis-core-frontend/` must ship with a screenshot (and a short GIF) of the change.** Since the app is already running from step 2, capture it here. Delivery is **automated** and follows the repo's existing convention (PRs #989/#1007): media lives on a dedicated orphan `pr-media/<ticket-lc>` branch at `docs/pr-media/<ticket-lc>/`, embedded into the PR body via `gh` (repo is public, so `raw.githubusercontent.com` URLs render). No manual drag-drop; media never lands in the feature branch or `main`.

Save everything under a run dir, e.g. `<scratchpad>/pr-media/`.

### Screenshots — key states

Drive the changed UI to each meaningful state and `page.screenshot({ path, fullPage: true })`:

- before/after, or empty/filled, or toggle off/on — whatever states the change introduces.
- Name them descriptively: `01-toggle-off.png`, `02-toggle-on.png`.

### Short GIF — the interaction (needs ffmpeg)

Record the interaction with CDP screencast, then assemble with ffmpeg:

```js
// during the scripted interaction:
const client = await page.target().createCDPSession();
let n = 0; const dir = '<scratchpad>/pr-media/frames';
await client.send('Page.startScreencast', { format: 'jpeg', quality: 80, everyNthFrame: 1 });
client.on('Page.screencastFrame', async ({ data, sessionId }) => {
  fs.writeFileSync(`${dir}/f-${String(n++).padStart(4,'0')}.jpg`, Buffer.from(data, 'base64'));
  await client.send('Page.screencastFrameAck', { sessionId });
});
// ... perform the clicks/typing you want to show, with small awaited pauses ...
await client.send('Page.stopScreencast');
```

```bash
# frames -> optimized gif (~10 fps, 1000px wide)
ffmpeg -y -framerate 10 -pattern_type glob -i '<dir>/f-*.jpg' \
  -vf "fps=10,scale=1000:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  <scratchpad>/pr-media/demo.gif
```

If `ffmpeg` is missing, deliver screenshots only and note the GIF was skipped (offer to `brew install ffmpeg`).

### Publish & embed — host on the `pr-media` branch, append to the PR

Push the media to a dedicated orphan branch (media only, no code — kept out of the PR diff and `main`) at the conventional path, then edit the PR body to embed it. Needs the PR number and the ticket id (lowercased); if there's no ticket, use the PR number in its place.

```bash
PR=<n>; TK=<ticket-lc>          # e.g. ayc-2 ; fall back to the PR number if none
BR=pr-media/$TK; DIR=docs/pr-media/$TK
RAW=https://raw.githubusercontent.com/ayunis-core/ayunis-core/$BR/$DIR
SRC=<scratchpad>/pr-media          # whatever you actually captured lives here
MW=$(mktemp -d)
cd "$REPO"                                                     # git worktree ops must run from the checkout, not the scratchpad CWD
git worktree prune; git branch -D "$BR" 2>/dev/null || true   # so re-runs on the same ticket don't hit "branch already exists"
git worktree add --orphan -b "$BR" "$MW"            # unborn branch, empty tree
mkdir -p "$MW/$DIR"
# copy only the media that exists (screenshots always; gif only if ffmpeg produced one)
find "$SRC" -maxdepth 1 -type f \( -name '*.png' -o -name '*.gif' \) -exec cp {} "$MW/$DIR"/ \;
cd "$MW" && git add -A && git commit -q -m "docs(pr-media): $TK" && git push -fu origin "$BR"
cd "$REPO" && git worktree remove "$MW" --force     # local worktree only; remote branch STAYS

# embed EXACTLY the files that were published — never hardcode names, or you get 404s
# read the current body FIRST; abort if it fails, so a transient gh error can't overwrite the description with only the media block
OLD=$(gh pr view "$PR" --json body -q '.body // ""') || { echo "could not read PR body — skipping embed" >&2; exit 1; }
{ printf '%s\n' "$OLD" | sed '/^### Screenshots \/ demo$/,$d'
  printf '\n### Screenshots / demo\n\n'
  for f in $(cd "$SRC" && ls *.png 2>/dev/null | sort); do
    curl -sfI "$RAW/$f" >/dev/null && echo "raw url OK: $f" >&2 || echo "raw url NOT reachable: $f" >&2
    printf '![%s](%s/%s)\n\n' "${f%.png}" "$RAW" "$f"
  done
  for g in $(cd "$SRC" && ls *.gif 2>/dev/null); do
    printf '![demo](%s/%s)\n\n' "$RAW" "$g"     # only emitted if a gif exists
  done
  printf '> Media hosted on the `%s` branch (not part of this PR'\''s diff); safe to delete after merge.\n' "$BR"
} > /tmp/qa-body.md
gh pr edit "$PR" --body-file /tmp/qa-body.md
```

- The `pr-media/<ticket>` branch is **not** part of the diff and is **exempt from teardown** — leave it until the PR merges (deleting it while the PR is open breaks the images).
- Re-runs `push -f` to the same branch and the `sed` strips the old block, so repeat QA keeps the PR body clean.
- Verify the images actually render: `gh pr view $PR --web` (the `curl -I` above already confirms the raw URL resolves).

## 5. Report

Present the acceptance-criteria checklist, each ✅/❌ with its evidence (asserted values, screenshot path). If anything failed, say so plainly with the observed vs expected — do not soften it. This is the whole point. For frontend PRs, confirm the media was published to `pr-media/<ticket>` and embedded in the PR body (step 4b), with the PR link.

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
