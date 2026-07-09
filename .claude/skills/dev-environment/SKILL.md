---
name: dev-environment
description: Start, stop, and manage the local dev stack (Docker infra, backend, frontend). Works in any directory — worktree or main repo.
---

# Dev Environment

## Starting the Stack

The `./dev` script manages the full local development stack. It works from any checkout — worktree or main repo.

```bash
# Start everything (requires a slot number on first run)
./dev up --slot 2

# Subsequent runs remember the slot
./dev up
```

### What `./dev up` does

1. Starts Docker infrastructure (postgres, minio, mailcatcher, code-execution, anonymize)
2. Generates `.env.dev` with localhost connection config for the slot
3. Runs database migrations
4. Starts the backend natively (`nest start --watch`)
5. Starts the frontend natively (`vite`)
6. Waits for the backend health check, prints port summary, returns

## Port Reference

Ports are offset by `slot × 10`:

| Service  | Formula       | Slot 2 | Slot 3 | Slot 4 |
| -------- | ------------- | ------ | ------ | ------ |
| Backend  | 3000 + offset | 3020   | 3030   | 3040   |
| Frontend | 3001 + offset | 3021   | 3031   | 3041   |
| Postgres | 5432 + offset | 5452   | 5462   | 5472   |
| MinIO    | 9000 + offset | 9020   | 9030   | 9040   |

**Avoid slots 0 and 1** — their ports (5432, 3000, etc.) often conflict with existing services on the host.

## Checking Status and Logs

```bash
./dev status                      # Overview of all services
./dev logs backend                # Backend logs (last 80 lines)
./dev logs frontend               # Frontend logs
./dev logs infra                  # Docker infrastructure logs
./dev logs --tail 200 backend     # More lines
```

## Restarting

The backend runs `nest start --watch` — it auto-reloads on code changes. If it crashes:

```bash
./dev logs backend    # Check what went wrong
./dev down
./dev up              # Slot is remembered
```

## Stopping

```bash
./dev down
```

## Troubleshooting

If `./dev up` fails, check logs:

```bash
./dev logs backend
./dev logs infra
```

### Migration fails with `42P07 duplicate-table` — stale Postgres volume

Slots reuse their Postgres data volume across branches. If a previous branch
on this slot already ran a migration that creates the same table as the
current branch's pending migration, `./dev up` fails with:

```text
error: relation "<table>" already exists (PostgreSQL 42P07)
```

The volume is stale — it has the table but no record of the migration that
created it. Resolving it means wiping the slot's Postgres volume so `./dev up`
replays migrations from scratch.

**Do not run this yourself.** Wiping a volume requires a destructive Docker
flag (`docker compose down -v`), which is on the Forbidden Actions list in
`CLAUDE.md` — volumes hold database data that cannot be restored. Instead,
surface the situation to the user and let them decide. Tell them the slot's
Postgres volume is stale and that recovering it requires:

```bash
# Run by the user — destroys the slot's Postgres data
docker compose -p ayunis-dev-<SLOT> down -v
./dev up --slot <SLOT>
```

Slots are per-developer scratch state (not shared), so this is normally safe —
but it is the user's call, not the agent's.

### Cross-worktree slot squat — frontend OR backend

When two worktrees both think they own the same slot (e.g. both ran
`./dev up --slot 2` at different times), one of the slot's ports can end up held
by a process from worktree A while you `./dev up` in worktree B. Two flavors:

**Frontend squat** — `vite`/`node` from worktree A holds `3021`/`3031`/...
`./dev up` sees the port bound, **silently skips frontend startup**, and the
backend comes up fresh against your branch's code while the frontend serves
worktree A's old code. `./dev status` looks healthy.

**Backend squat** — `nest`/`node` from worktree A holds `3020`/`3030`/`3040`/...
The `./dev up` in worktree B either skips backend startup or fails a health
check. More insidiously, any tool that hits the backend port from worktree B
(e.g. `pnpm run openapi:update`, which fetches `http://localhost:<port>/api/docs-json`)
will silently pull from worktree A's server — regenerating a **stale OpenAPI
client that's missing endpoints you just added in worktree B**.

Diagnose (same recipe, use the port relevant to the symptom):

```bash
# Frontend port: 3021 = slot 2, 3031 = slot 3, 3041 = slot 4
# Backend port:  3020 = slot 2, 3030 = slot 3, 3040 = slot 4
lsof -nP -iTCP:3040 -sTCP:LISTEN

# Inspect that process's cwd — if it points to a different worktree, that's the squatter
lsof -p <PID> | grep cwd
```

Before regenerating any code from a running dev server (OpenAPI schema, GraphQL
codegen, etc.), verify the process serving the port is rooted in the current
worktree — not another slot's stale backend.

Fix: the squatter must be stopped before `./dev up --slot <SLOT>` succeeds
and before any codegen-from-running-server is trustworthy. **Do not kill it
yourself** — killing processes is on the Forbidden Actions list in `CLAUDE.md`.
Report the offending PID and its worktree cwd to the user and let them stop
it. If you want to keep both worktrees running, give them different slots
instead.

### Orphaned processes from a trashed worktree

When a git worktree is removed via `git worktree remove` — or moved to
`.git/wt/trash/…` — while its `./dev` stack is still running, the native
`nest`/`vite`/`esbuild` children **survive the worktree deletion** and keep
holding the slot's ports. Next `./dev up --slot <SLOT>` from any worktree fails
because those ports are still bound.

The distinguishing signal from a live cross-worktree squat is the cwd: an
orphaned process's `lsof -p <PID> | grep cwd` resolves to a path under
`.git/wt/trash/…` (or is deleted entirely and shows up as `cwd (deleted)`),
not a real live worktree.

Prevent: **always `./dev down` in a worktree before trashing/removing it.**
The `worktree` skill's cleanup section names this too — respect it.

Recover: because the parent worktree is already gone, there's no ambiguity
about whether the process is still owned — it isn't. Report the orphan PIDs
plus the trashed cwd to the user and ask permission to `kill <PID>` them. Once
approved, `./dev up --slot <SLOT>` from your current worktree comes up clean.
`docker compose down` alone does **not** clean these up — they're native
processes, not containers.
