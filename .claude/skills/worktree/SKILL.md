---
name: worktree
description: Name, create, and remove git worktrees for isolated working directories. Use when starting a new task that needs its own branch and directory, or when naming or cleaning up a worktree.
---

# Git Worktree Management

## When to Use

At the start of a task, the user will tell you which environment to work in. This skill covers naming, creating, and removing worktrees — for starting the dev stack, see the `dev-environment` skill.

This skill does not prescribe a worktree tool. Use whichever one the environment provides; the naming, location, and setup below apply regardless.

## Naming Convention

Every worktree gets one name, used for both its directory and its base branch:

```text
<ticket-id>-<slug>
```

- `<ticket-id>` is the lowercase Linear ID (`ayc-1050`). Unticketed maintenance uses `ayc-000`.
- `<slug>` is 2–4 lowercase kebab-case words describing the work (`provider-factories`, `minio-image`).
- QA worktrees for a PR append `-qa` (`ayc-1050-qa`); use `pr-<number>-qa` when the PR has no ticket.

Examples: `ayc-1050-provider-factories`, `ayc-000-minio-image`, `ayc-703-qa`.

Location: `<repo parent>/.worktrees/<repo name>/<name>`, e.g. `~/dev/ayunis/.worktrees/ayunis-core/ayc-1050-provider-factories`.

Never use a Graphite-generated branch name (`08-21-feat_workspaces_…`) or a free-form slug without a ticket ID as the directory name. When the work is on an existing branch, the directory still gets the convention name; if your tool derives the directory from the branch name, create the worktree under the convention name and check out the existing branch inside it.

This is an execution-mode skill. Do not create, modify, or remove a worktree while producing an implementation plan; do so only after the user requests implementation or approves the plan.

## Creating a Worktree

The user gives you a **task ID** and optionally an **existing branch** to work on.

1. Create the worktree at the conventional location. For new work, create its base branch with the same `<ticket-id>-<slug>` name from `main`.
2. Ensure it is set up. Your tool may already do some of this through hooks — check the result and do only what is missing:

- The gitignored files listed in `.worktreeinclude` (secret `.env` files) must exist. Worktrunk, Claude Code, and Codex copy them on creation; if your tool did not, copy them from the main checkout.

```bash
cd "$WORKTREE_DIR"

# Track the base branch in Graphite — REQUIRED before any `gt create`, which
# otherwise fails with "Cannot perform this operation on untracked branch".
gt track --parent main

# ayunis-core is a pnpm workspace. Never `npm install` inside a sub-project —
# that creates a stray package-lock.json and resolves the wrong tree.
pnpm install

# Build the workspace packages so @ayunis/* types resolve (see below).
pnpm run build:deps
```

## Build @ayunis/* deps before trusting a full typecheck

A fresh worktree has `node_modules` (after `pnpm install`) but **not** the built
`dist/index.d.ts` for the `@ayunis/*` workspace packages — those only exist after
the `tsup` build. Until you run `pnpm run build:deps`, a full `pnpm exec tsc --noEmit`
emits ~60 `TS2307 "Cannot find module '@ayunis/…'"` errors **on your branch AND on
clean HEAD**.

**Never wave those TS2307 errors off as "pre-existing on clean HEAD."** They are a
missing-build artifact, not a real baseline — and treating them that way hides genuine
type errors in your own new code behind the noise. In one session this masked a real
bug (a raw `'mistral'` string passed where an `EmbeddingsProvider` enum was required).

The pre-commit hook (`tsc-files`, staged-only) and `ts-jest` (transpile-only) both have
blind spots that only a full post-build typecheck covers. So, in any worktree, before
running or trusting `tsc --noEmit`:

```bash
cd "$WORKTREE_DIR" && pnpm run build:deps   # builds @ayunis/* dist/*.d.ts
pnpm exec tsc --noEmit                       # now TS2307 noise is gone; real errors surface
```

## Empty Base Branch Gotcha

The worktree's `<ticket-id>-<slug>` branch is the **base** — Graphite stacks are
built on top of it (see the `git-workflow` skill). Following git-workflow,
the first commit goes on a `gt create` child branch, leaving the worktree
base intentionally empty.

That's fine until you push. `gt submit --stack` refuses to submit an empty
base branch:

```text
WARNING: This branch does not introduce any changes: ▸ <ticket-id>-<slug>
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

1. Stop the worktree's dev stack if running: `cd "$WORKTREE_DIR" && ./dev down` (see `dev-environment`).
2. Confirm no uncommitted or unpushed work would be lost.
3. Remove the worktree with the same tool that manages it, from the main checkout. Never force-remove unless the user authorized discarding its contents.
