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

# Symlink secret .env files (gitignored, not in the new worktree)
ln -sf "$REPO_ROOT/ayunis-core-backend/.env" "$WORKTREE_DIR/ayunis-core-backend/.env"
ln -sf "$REPO_ROOT/ayunis-core-frontend/.env" "$WORKTREE_DIR/ayunis-core-frontend/.env"

# Install dependencies
cd "$WORKTREE_DIR/ayunis-core-backend" && npm install
cd "$WORKTREE_DIR/ayunis-core-frontend" && npm install
```

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
