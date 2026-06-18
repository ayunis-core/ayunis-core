# AGENTS.md

For repository overview, architecture, and development skills, see `.claude/CLAUDE.md`,
`ARCHITECTURE.md`, `CONTRIBUTING.md`, and the skills under `.claude/skills/`.

## Cursor Cloud specific instructions

Durable, non-obvious notes for running this monorepo in the Cursor Cloud VM. The
startup update script only refreshes JS dependencies (`pnpm install`); everything
below must be done by the agent at the start of a session.

### Toolchain

- This repo requires Node **24** (`.node-version` = `24.14.1`, `engines.node >= 24`).
  The VM's default `node` on `PATH` (`/exec-daemon/node`) is v22 and would shadow
  nvm. A line appended to `~/.bashrc` prepends the nvm Node 24 bin so `node`/`pnpm`
  resolve to v24 in login shells. If `node -v` ever shows v22, run
  `nvm use 24.14.1` (and re-`corepack prepare pnpm@10.33.2 --activate` if `pnpm`
  is missing). `pnpm` is provided via corepack, not a global npm install.

### Starting the stack (do this every session — the update script does NOT)

**1. Start the Docker daemon** — there is no systemd in this container, so dockerd
is not auto-started. Run it in the background and make the socket usable without
sudo:

```bash
sudo dockerd > /tmp/dockerd.log 2>&1 &
sleep 8 && sudo chmod 666 /var/run/docker.sock
```

Docker is configured for `fuse-overlayfs` with the containerd snapshotter
disabled (`/etc/docker/daemon.json`) — required for Docker 29 in this VM.

**2. Bring up the app** with the `./dev` script (see the `dev-environment` skill).
Use a slot ≥ 2 (slot 0/1 ports collide):

```bash
./dev up --slot 2
```

This starts Docker infra (postgres, minio, mailcatcher, redis, gotenberg,
code-execution, anonymize), writes `ayunis-core-backend/.env.dev`, runs
migrations, and starts the backend (`nest start --watch`) + frontend (vite)
natively in tmux. Slot 2 ports: backend `3020`, frontend `3021`,
API docs `3020/api/docs`.

**3. Seed test data** (idempotent) for a login + fixtures (see `seed-database` skill):

```bash
cd ayunis-core-backend && pnpm run seed:minimal:ts
```

Default login: `admin@demo.local` / `admin`.

The three `.env` files (`./.env`, `ayunis-core-backend/.env`,
`ayunis-core-frontend/.env`) are gitignored and were created from the
`.env.example` files. The backend `.env` sets `COOKIE_SECURE=false` so auth
cookies work over plain HTTP in dev. `./dev up` regenerates `.env.dev` (connection
config + a generated `MCP_ENCRYPTION_KEY`) on every run.

### Caveats

- **No LLM provider keys are configured** (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,
  AWS Bedrock, etc. are all unset). Logging in and non-LLM flows (creating skill
  templates, knowledge bases, admin/org/user management, etc.) work end-to-end, but
  actually chatting with a model will not return a completion until a provider key
  is added to `ayunis-core-backend/.env`.
- The UI is German by default.
- The backend runs `nest start --watch`; after a `pnpm install` it does not always
  pick up new native deps via hot reload — restart with `./dev down && ./dev up`.

### Lint / test / build

Standard package scripts (run inside `ayunis-core-backend/` and
`ayunis-core-frontend/`): `pnpm run lint`, `pnpm run test`, `pnpm run build`.
Backend `lint` runs `eslint --fix` and may reformat files — revert unintended
diffs before committing.
