---
name: git-workflow
description: "MUST be loaded before ANY commit, push, or branch operation. Never use raw git commit/push — this project uses Graphite (gt). Load this skill first whenever you need to commit, push, branch, or ask about git workflow."
---

# Git Workflow

This project uses **Graphite** for stacked PRs. Always use `gt` commands, never raw `git commit`.

## Commit Message Format

```text
<type>(<scope>): <subject> (<ticket-id>)
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

### Rules

1. **Ticket ID is required** — appended in parentheses at the end of the subject line. Always ask the user for the ticket ID if not provided. Never invent a ticket ID.
2. **Type** must be one of: `feat`, `fix`, `chore`, `refactor`, `ci`, `docs`, `test`, `perf`, `wip`.
3. **Scope** — a short noun describing the area of the codebase (e.g., `auth`, `chat`, `api`). Required for `feat` and `fix`; optional for other types. For `chore` commits without a specific scope (e.g., release, tooling), use a generic scope: `chore(main): release 1.8.0`.
4. **Subject** is lowercase, imperative mood, no period at end.
5. **Body** (optional) — separated by blank line, explains *what* and *why*. Bullet points with `-`, wrap at ~72 chars.
6. **Footer** (optional) — references, breaking changes (`BREAKING CHANGE: ...`), or co-authors.

### Examples

```text
feat(chat): add streaming response support (TASK-42)

- Buffer chunks and flush on newline boundaries
- Add backpressure handling for slow clients

Refs: TASK-40
```

```text
fix(auth): prevent token refresh race condition (TASK-99)
```

```text
wip(sources): add source entity and repository port (TASK-1)
```

## WIP vs Semantic Types — Changelog Hygiene

Projects using **release-please** auto-generate changelogs from squash-merged PR titles on `main`. Only semantic types (`feat`, `fix`, `refactor`, `perf`, `docs`, `ci`, `chore`, `test`) appear in the changelog. The `wip` type is **excluded from the changelog and does not trigger version bumps**.

### When to use `wip:`

Use `wip:` for any PR that is **part of a larger feature but does not complete it**. This is the default for stacked PRs in a multi-branch feature:

```text
wip(sources): add source entity and repository port (TASK-1)        ← stack branch 1
wip(sources): implement source ingestion use case (TASK-1)           ← stack branch 2
feat(sources): add source management API and UI (TASK-1)             ← final branch, completes the feature
```

Only the last PR uses `feat:` — that's the one that appears in the changelog as a single entry.

### When to use semantic types

Use `feat:`, `fix:`, etc. when the PR **delivers a complete, user-visible change** on its own:

- A standalone bug fix → `fix(auth): correct date validation (TASK-2)`
- A self-contained feature in a single PR → `feat(agents): add agent install page (TASK-3)`
- CI/tooling change → `ci: add dead code workflow`

### Rule of thumb

> If this PR were the only one merged, would the change make sense to a user reading the changelog? If yes → semantic type. If no → `wip:`.

## Branching & Stacking

The worktree branch (if using worktrees) is the **base branch**. Graphite stacks are built on top of it.

### New commit → new stacked branch

Each logical unit of work gets its own `gt create`:

```bash
# 1. Stage changes
git add <files>

# 2. Verify what's staged
git status --short

# 3. Create a new stacked branch (auto-stacks on current branch)
gt create -m "<type>(<scope>): <description> (<ticket-id>)"

# 4. If pre-commit hooks fail, fix issues and retry with gt modify
```

### Amending the current branch

Use when fixing QA findings, addressing PR review comments, bug bot findings, or correcting issues on the current branch. **Never use `gt create` for these fixes** — they belong to the same logical change and should be folded into the existing commit:

```bash
# 1. Stage fixes (or use -a flag to auto-stage all changes)
git add <files>

# 2. Amend the current stacked branch (keeps the existing commit message)
gt modify

# 3. This automatically restacks any descendant branches
```

- `gt modify` without flags amends the existing commit and keeps its message — no need to repeat `-m`.
- Use `gt modify -a` to auto-stage all changes and amend in one step.
- Use `gt modify -m "..."` only if you need to **change** the commit message.
- With `--commit` it creates an additional commit on the branch — that's not what we want for fixes.

### Pushing to remote

**Never use raw `git push`** — always use `gt submit`. Raw pushes bypass Graphite's metadata and desynchronize remote base branches, causing merge conflicts on GitHub.

**Always push the full stack** — never push a single branch. Pushing only one branch after a restack or amend leaves descendant branches' remote refs stale (old SHAs), which causes duplicate-commit merge conflicts the next time someone restacks a child branch.

#### Before force-pushing: check for remote-only commits

`--force` will overwrite remote commits that aren't in your local branch — most commonly commits authored by Cursor agents, CI bots, or teammates after you last pulled. Always reconcile first:

```bash
# 1. Fetch latest remote state for all stack branches
git fetch origin

# 2. For EVERY branch in the stack — including ones you didn't touch this session
gt log short                                  # show the stack
git log --oneline HEAD..origin/<branch>       # commits on remote that aren't local
```

**Check every branch `gt log short` shows, not just the ones you edited.** Cursor Agent autofixes, CI commits, and teammate pushes routinely land on the lower (scaffold/base) branches of a stack you've been working in. `gt submit --stack --force --no-interactive` will silently overwrite those without prompting; the "remote updated" warning is informational, not a halt under `--no-interactive`. Skipping the sync check on "untouched" branches has overwritten work multiple times.

If `git log --oneline HEAD..origin/<branch>` shows any commits, **stop and reconcile** before pushing — typically by `git pull --rebase` or `gt restack` to fold those commits in. Never use `--force` to discard them silently.

#### During the push: read Graphite's warnings

Graphite prints `WARNING: Branch X has been updated remotely. Force submitting local version to remote...` when `--force` is about to overwrite remote commits. **Treat this warning as a halt condition** — abort the submit (Ctrl-C while it's iterating, or skip with `--no-interactive` only after you've verified there are no remote-only commits), pull the missing commits, then retry.

```bash
# Submit the full stack — but only after the pre-flight check above
gt submit --stack --force --no-interactive
```

Use `--force` to update stale remote refs after a restack or amend. Add `--publish` to take PRs out of draft.

### Verifying stack state after restack / submit

Graphite operations can no-op silently (`gt restack` on a stack that's already up to date, or after a checkout to the wrong branch). Don't claim "done" until you've checked:

```bash
gt log short                       # current stack and which branch is checked out
git branch --show-current          # confirm you're not on main
git status                         # confirm working tree is clean
```

If `gt restack` produced no visible output, that often means the stack was already restacked or you're not on a stacked branch. Re-check `gt log short` before reporting success.

### Restack before submit

`gt modify` automatically restacks descendants **only when those descendants are checked out in the same worktree**. If `gt submit --stack` aborts with `WARNING: You must restack before submitting this stack. ERROR: Aborting non-interactive submit.`, run `gt restack` first, then re-run the submit:

```bash
gt restack
gt submit --stack --force --no-interactive
```

### Worktree + stack collisions

When a descendant branch is checked out in another worktree, both `gt modify` and `gt restack` skip it with a message like:

```text
Did not restack branch <name> because it is checked out in worktree <path>.
```

`gt submit --stack` will then abort with the "must restack" error and looping won't fix it — the descendant *cannot* be restacked from here. Two valid recoveries:

1. **`cd` into the blocking worktree** and restack + submit from there:

   ```bash
   gt submit --cwd <blocking-worktree-path> --no-stack --force --no-interactive
   # or, equivalently, after cd-ing in:
   cd <blocking-worktree-path>
   gt restack && gt submit --stack --force --no-interactive
   ```

2. **Single-branch submit here, follow-up in the other worktree.** Submit only the amended branch from the current worktree, then leave the user a clear instruction to restack the descendant from its own worktree:

   ```bash
   gt submit --force --no-interactive   # pushes only the current branch
   ```

   Tell the user: *"<descendant-branch> is restacked locally but not pushed — run `gt restack && gt submit --stack --force` from its worktree at `<path>`."*

This is the only situation where `gt submit` without `--stack` is acceptable. Outside this case, the "always push the full stack" rule stands.

### Force-submit safety

The Graphite `WARNING: Branch <name> has been updated remotely...` halt condition and the `git fetch` + `git log HEAD..origin/<branch>` reconciliation check are covered above in [Before force-pushing: check for remote-only commits](#before-force-pushing-check-for-remote-only-commits) and [During the push: read Graphite's warnings](#during-the-push-read-graphites-warnings). In addition to stopping and reconciling: surface the divergence to the user (paste the log) and confirm before re-running the force submit. If the SHAs are actually equivalent (only metadata drift), say so and proceed; otherwise rebase locally first.

### Pre-submit hygiene

Before `gt modify` or `gt submit`, run `git status --short` and review the working tree. If files you didn't touch in this session are modified (formatter passes, removed `eslint-disable` comments, watcher artifacts, etc.), surface them to the user explicitly before staging — do not silently bundle them into the commit. Either `git restore` the unrelated files or get explicit confirmation that they belong in the commit.

### Rules

- Each logical unit of work gets its own `gt create` — one stacked branch per batch/task
- Fixes and amendments use `gt modify`, never `gt create`
- Never use `--no-verify` — let the hooks run
- Never use raw `git commit` — always go through `gt`
- Never use raw `git push` — always go through `gt submit`
- Before `--force`-submitting, `git fetch origin` and check for remote-only commits per branch
- After `gt restack` / `gt submit`, verify the stack state (`gt log short`) before reporting success

## Pre-commit Hooks

Projects typically enforce via pre-commit hooks:

- **Commit message must include a ticket ID** (validated by `commit-msg` hook)
- **Commit message must start with a valid type** (`feat`, `fix`, `chore`, `wip`, etc.)
- **Linting, formatting, type-checking** on staged files
- **Complexity checks** (if configured)

If complexity fails, split the offending function into smaller units before retrying.
