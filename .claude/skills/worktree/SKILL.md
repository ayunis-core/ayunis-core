---
name: worktree
description: Create and manage git worktrees for isolated working directories. Use when starting a new task that needs its own branch and directory.
---

# Git Worktree Management

## When to Use

At the start of a task, the user will tell you which environment to work in. This skill covers creating and removing worktrees — for starting the dev stack, see the `dev-environment` skill.

## Creating a Worktree

The user gives you a **task ID** and optionally a **branch name** (if the branch already exists).

```bash
TASK_ID="AYC-123"  # from user
REPO_ROOT="$(git rev-parse --show-toplevel)"
WORKTREE_DIR="$(dirname "$REPO_ROOT")/ayunis-core-wt-${TASK_ID,,}"

# New branch from HEAD:
git worktree add "$WORKTREE_DIR" -b "feat/${TASK_ID,,}/work" HEAD

# OR existing branch:
git worktree add "$WORKTREE_DIR" "$BRANCH"

# Track the new branch in Graphite — REQUIRED before any `gt create`.
# `git worktree add -b` produces a branch Graphite doesn't know about, so the
# first `gt create` fails with "Cannot perform this operation on untracked
# branch". Track it as a child of main:
cd "$WORKTREE_DIR" && gt track --parent main

# Symlink secret .env files (gitignored, not in the new worktree)
ln -sf "$REPO_ROOT/ayunis-core-backend/.env" "$WORKTREE_DIR/ayunis-core-backend/.env"
ln -sf "$REPO_ROOT/ayunis-core-frontend/.env" "$WORKTREE_DIR/ayunis-core-frontend/.env"

# Install dependencies — ayunis-core is a pnpm workspace
# (pnpm-workspace.yaml + pnpm-lock.yaml at repo root, packageManager pinned to pnpm).
# Never `npm install` inside a sub-project — that creates a stray package-lock.json
# and resolves the wrong tree.
cd "$WORKTREE_DIR" && pnpm install
```

## Empty Base Branch Gotcha

The worktree branch `feat/<task>/work` is the **base** — Graphite stacks are
built on top of it (see the `git-workflow` skill). Following git-workflow,
the first commit goes on a `gt create` child branch, leaving the worktree
base intentionally empty.

That's fine until you push. `gt submit --stack` refuses to submit an empty
base branch:

```text
WARNING: This branch does not introduce any changes: ▸ feat/<task>/work
Nothing to submit!
```

Fix: re-parent the child directly onto `main` so the empty base drops out
of the stack:

```bash
gt track --parent main --force   # run on the CHILD branch, not the base
gt submit --stack --force --no-interactive
```

Alternative (single-PR tasks): skip the `gt create` and commit on the
worktree base branch directly with `gt modify --commit` so the base
isn't empty in the first place. Prefer this when the task is a single
self-contained change, not a stack.

## Scenario C — Use an existing worktree

The user points you to a **worktree that already exists**. Just `cd` into it and start working.

```bash
WORKTREE_DIR="/path/to/existing/worktree"  # from user
cd "$WORKTREE_DIR"
```

## Cleanup

Only tear down when the user asks you to, or when they explicitly say the task is complete. Worktrees persist across agent sessions.

```bash
# First stop the dev stack if running (see dev-environment skill)
cd "$WORKTREE_DIR" && ./dev down

# Remove the worktree (from the main repo)
cd "$REPO_ROOT"
git worktree remove "$WORKTREE_DIR"
```

## Branch Naming

Worktree branches follow the pattern `feat/${TASK_ID,,}/work` (e.g., `feat/ayc-123/work`). This is the base branch that Graphite stacks are built on top of — see the `git-workflow` skill.
