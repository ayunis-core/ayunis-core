---
name: worktree-dev
description: Set up an isolated development environment in a new git worktree. Use this at the start of any task to get a running system with its own database, ports, and processes — isolated from other agents and the main worktree.
---

# Worktree Development Environment

## When to Use

At the start of any task, the user will tell you which environment to work in. This is one of three scenarios — follow only the one that applies.

## Scenario A — Create a new worktree

The user gives you a **task ID** and a **slot number**. You create a fresh worktree from HEAD.

```bash
TASK_ID="AYC-123"  # from user
SLOT=2              # from user
REPO_ROOT="$(git rev-parse --show-toplevel)"
WORKTREE_DIR="$(dirname "$REPO_ROOT")/ayunis-core-wt-${TASK_ID,,}"

# Create worktree with new branch
git worktree add "$WORKTREE_DIR" -b "feat/${TASK_ID,,}/work" HEAD

# Symlink secret .env files (gitignored, not in the new worktree)
ln -sf "$REPO_ROOT/ayunis-core-backend/.env" "$WORKTREE_DIR/ayunis-core-backend/.env"
ln -sf "$REPO_ROOT/ayunis-core-frontend/.env" "$WORKTREE_DIR/ayunis-core-frontend/.env"

# Install dependencies
cd "$WORKTREE_DIR/ayunis-core-backend" && npm install
cd "$WORKTREE_DIR/ayunis-core-frontend" && npm install

# Start the dev stack
cd "$WORKTREE_DIR" && ./dev up --slot "$SLOT"
```

## Scenario B — Create a worktree for an existing branch

The user gives you a **branch name**, a **task ID** (for the directory name), and a **slot number**.

```bash
BRANCH="feat/ayc-123/work"  # from user
TASK_ID="AYC-123"            # from user
SLOT=2                       # from user
REPO_ROOT="$(git rev-parse --show-toplevel)"
WORKTREE_DIR="$(dirname "$REPO_ROOT")/ayunis-core-wt-${TASK_ID,,}"

# Create worktree from existing branch
git worktree add "$WORKTREE_DIR" "$BRANCH"

# Symlink secret .env files
ln -sf "$REPO_ROOT/ayunis-core-backend/.env" "$WORKTREE_DIR/ayunis-core-backend/.env"
ln -sf "$REPO_ROOT/ayunis-core-frontend/.env" "$WORKTREE_DIR/ayunis-core-frontend/.env"

# Install dependencies
cd "$WORKTREE_DIR/ayunis-core-backend" && npm install
cd "$WORKTREE_DIR/ayunis-core-frontend" && npm install

# Start the dev stack
cd "$WORKTREE_DIR" && ./dev up --slot "$SLOT"
```

## Scenario C — Use an existing worktree

The user points you to a **worktree that already exists** (directory path). The slot number is already saved from the previous `./dev up` — you don't need it.

```bash
WORKTREE_DIR="/path/to/existing/worktree"  # from user
cd "$WORKTREE_DIR"

# Check if the dev stack is already running
./dev status

# If not running, start it (slot is remembered from last ./dev up)
./dev up
```

If this is the first time the dev stack is started in this worktree (no saved slot), the user must provide one:

```bash
./dev up --slot 2
```

---

## What `./dev up` does

The command starts everything in the background and blocks until healthy:

1. Starts Docker infrastructure (postgres, minio, mailcatcher, code-execution, anonymize)
2. Generates `.env.dev` with localhost connection config for the slot
3. Runs database migrations
4. Starts the backend natively (`nest start --watch`)
5. Starts the frontend natively (`vite`)
6. Waits for the backend health check, prints port summary, returns

If it fails, check logs:

```bash
./dev logs --slot "$SLOT" backend
./dev logs --slot "$SLOT" infra
```

## Port Reference

Ports are offset by `slot × 10`:

| Service | Formula | Slot 2 | Slot 3 | Slot 4 |
|---|---|---|---|---|
| Backend | 3000 + offset | 3020 | 3030 | 3040 |
| Frontend | 3001 + offset | 3021 | 3031 | 3041 |
| Postgres | 5432 + offset | 5452 | 5462 | 5472 |
| MinIO | 9000 + offset | 9020 | 9030 | 9040 |

**Avoid slots 0 and 1** — their ports (5432, 3000, etc.) often conflict with existing services on the host.

## During Development

### Running commands

All npm scripts work from the worktree's backend directory because `./dev up` generates `.env.dev` with the correct connection config:

```bash
cd "$WORKTREE_DIR/ayunis-core-backend"
npm run test                    # Run tests
npm run lint                    # Lint
npx tsc --noEmit               # Type check
npm run migration:run:dev       # Run migrations
npm run migration:generate:dev -- src/db/migrations/Name  # Generate migration
```

### Checking logs

After `./dev up`, the slot is saved — no need to pass `--slot` again:

```bash
cd "$WORKTREE_DIR"
./dev logs backend                # Backend logs (last 80 lines)
./dev logs frontend               # Frontend logs
./dev logs infra                  # Docker infrastructure logs
./dev logs --tail 200 backend     # More lines
```

### Checking status

```bash
./dev status
```

### Backend not responding after code change?

The backend runs `nest start --watch` natively — it should auto-reload. If it crashed, check the logs:

```bash
./dev logs backend
```

If needed, restart by stopping and re-starting:

```bash
./dev down
./dev up
```

## Cleanup

Only tear down when the user asks you to, or when they explicitly say the task is complete. Worktrees persist across agent sessions.

```bash
# Stop the dev stack
cd "$WORKTREE_DIR" && ./dev down

# Remove the worktree (from the main repo)
cd "$REPO_ROOT"
git worktree remove "$WORKTREE_DIR"
```
