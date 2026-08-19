---
name: git-workflow
description: "MUST be loaded before ANY commit, push, or branch operation. Never use raw git commit/push — this project uses Graphite (gt). Load this skill first whenever you need to commit, push, branch, or ask about git workflow."
---

# Git Workflow

This project uses **Graphite** for stacked PRs. Always use `gt`, never raw `git commit` or `git push`.

| Situation | Read first |
| --- | --- |
| New PR, new branch, "based on main", or a follow-up that depends on unmerged work | `references/starting-work.md` — verify the base **before** the first edit |
| A `gt` command aborted, warned, or no-op'd (untracked branch, must-restack, worktree collision, remote divergence) | `references/submit-troubleshooting.md` |

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

Use `wip:` for any PR that is **part of a larger feature but does not complete it** — the default for stacked PRs in a multi-branch feature:

```text
wip(sources): add source entity and repository port (TASK-1)        ← stack branch 1
wip(sources): implement source ingestion use case (TASK-1)           ← stack branch 2
feat(sources): add source management API and UI (TASK-1)             ← final branch, completes the feature
```

Only the last PR uses `feat:` — that's the single changelog entry. Use a semantic type when the PR **delivers a complete, user-visible change** on its own (standalone bug fix, self-contained feature, CI/tooling change).

> Rule of thumb: if this PR were the only one merged, would the change make sense to a user reading the changelog? Yes → semantic type. No → `wip:`.

## Branching & Stacking

The worktree branch (if using worktrees) is the **base branch**; Graphite stacks are built on top of it. Being clean is not the same as being on `main`, and the default base is **not** always `main` — verify per `references/starting-work.md` before editing.

### New commit → new stacked branch

Each logical unit of work gets its own `gt create`:

```bash
git add <files>
git status --short                                                  # verify what's staged
gt create -m "<type>(<scope>): <description> (<ticket-id>)"          # auto-stacks on current branch
# if pre-commit hooks fail, fix the issues and retry with gt modify
```

### Amending the current branch

Use when fixing QA findings, PR review comments, or bug bot findings. **Never `gt create` for these** — they belong to the same logical change:

```bash
git add <files>
gt modify              # amends, keeps the message, restacks descendants
```

- `gt modify -a` auto-stages all changes and amends in one step.
- `gt modify -m "..."` only when the message must **change**.
- `--commit` adds another commit to the branch — not what we want for fixes.

### Pushing to remote

**Never raw `git push`** — it bypasses Graphite's metadata and desynchronizes remote base branches. **Always push the full stack**; pushing one branch after a restack or amend leaves descendants' remote refs stale, causing duplicate-commit conflicts the next time anyone restacks a child.

Pre-flight, every time — `--force` overwrites remote commits, and under `--no-interactive` the warning does not halt:

```bash
git status --short                            # unrelated modified files? surface them, never bundle silently
git fetch origin
gt log short                                  # list every branch in the stack
git log --oneline HEAD..origin/<branch>       # remote-only commits — for EACH branch, not just the edited ones
```

Modified files you didn't touch this session (formatter passes, watcher artifacts) → `git restore` them or get explicit confirmation they belong in the commit; never bundle them silently.

Any commits in `HEAD..origin/<branch>` → **stop and reconcile** (`git pull --rebase` or `gt restack`). Never `--force` past them: Cursor agent autofixes, CI commits, and teammate pushes routinely land on branches you didn't touch this session.

```bash
gt submit --stack --force --no-interactive     # --publish to take PRs out of draft
```

`WARNING: Branch <name> has been updated remotely. Force submitting local version to remote...` is a **halt condition** → `references/submit-troubleshooting.md`.

### Verifying stack state after restack / submit

Graphite operations can no-op silently. Don't claim "done" until you've checked:

```bash
gt log short                       # current stack and which branch is checked out
git branch --show-current          # confirm you're not on main
git status                         # confirm working tree is clean
```

If `gt restack` produced no visible output, the stack was either already restacked or you're not on a stacked branch. Re-check `gt log short` before reporting success.

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
