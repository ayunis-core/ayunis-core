---
name: git-workflow
description: "MUST be loaded before ANY commit, push, or branch operation. This project uses GitHub stacked PRs via the gh stack extension — branches, pushes, and PRs go through `gh stack`, never raw `git push`. Load this skill first whenever you need to commit, push, branch, or ask about git workflow."
---

# Git Workflow

This project uses **GitHub stacked pull requests** through the `gh stack` extension for GitHub CLI. Commits are plain `git commit`; branches, pushes, rebases, and PRs go through `gh stack`, never raw `git push`.

Setup, once per machine: `gh extension install github/gh-stack`. `gh stack init` enables `git rerere` in the repository.

| Situation | Read first |
| --- | --- |
| Starting or resuming any work in a stacked-PR context—including amendments—or choosing a base for a new/follow-up PR | `references/starting-work.md` — sync and verify the base **before** the first edit |
| A `gh stack` command failed, exited non-zero, or printed `Sync aborted` (not in a stack, rebase conflict, diverged stack, worktree collision, remote-only commits) | `references/submit-troubleshooting.md` |

## Commit Message Format

```text
<type>(<scope>): <subject> (<ticket-id>)
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

### Rules

1. **Ticket ID is required** — appended in parentheses at the end of the subject line. Use the provided ticket ID. If the repository instructions define a fallback ID for unticketed work, use it only within the scope they allow. Otherwise ask; never invent a ticket ID.
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

A stack is a linear chain of branches on a trunk (usually `main`); each branch gets one PR based on the branch below it. The worktree branch (if using worktrees) is the **first layer** of the stack (see the `worktree` skill). Being clean is not the same as being on `main`, and the default base is **not** always `main` — verify per `references/starting-work.md` before editing.

### Never open an interactive screen

`gh stack` opens prompts or full-screen TUIs when it thinks it has a terminal, and an agent session then hangs. Always use the non-interactive form:

| Use | Never |
| --- | --- |
| `gh stack view --json` (or `--short`) | `gh stack view` |
| `gh stack init <branch>` | `gh stack init` |
| `gh stack add <branch>` | `gh stack add` |
| `gh stack submit --auto` | `gh stack submit` |
| `gh stack checkout <branch-or-pr>` | `gh stack checkout` |
| `gh stack up` / `down` / `top` / `bottom` | `gh stack switch` |
| — | `gh stack modify` (TUI only; restructure per `references/submit-troubleshooting.md`) |

Status messages go to stderr; parse only `--json` output and branch on exit codes.

### Working-tree hygiene

Before every commit or amend, and again before `gh stack push` / `gh stack submit`, run `git status --short` and review the working tree. If files you didn't touch in this session are modified (formatter passes, watcher artifacts, removed comments, or other unrelated changes), surface them to the user explicitly before staging. Restore them or get explicit confirmation that they belong in the commit; never bundle them silently.

### Start the stack

On the worktree branch, before the first commit:

```bash
gh stack init <ticket-id>-<slug>      # adopts the current branch as the first layer
```

### New commit → new stacked branch

Each logical unit of work gets its own branch. The first unit is committed on the first layer; every later unit gets a new branch from the **top** of the stack:

```bash
gh stack add <ticket-id>-<layer-slug>                              # new branch on top, checked out
git add <files>
git status --short                                                # verify what's staged
git commit -m "<type>(<scope>): <description> (<ticket-id>)"
# if pre-commit hooks fail, fix the issues and retry the same commit
```

- Name every branch yourself: `<ticket-id>-<layer-slug>`, e.g. `ayc-1050-source-entity`. Do not pass `-m` to `gh stack add` without a branch name — that generates a date-slug name.
- `gh stack add` without `-m` leaves the working tree alone, so uncommitted changes carry over to the new branch. Commit them on the layer they belong to first.
- `gh stack add` only works on the topmost branch. A change that belongs to a lower layer goes into that layer — see the next section.

### Amending a branch

Use when fixing QA findings, PR review comments, or bug bot findings. **Never add a new branch for these** — they belong to the same logical change. Keep one commit per branch: `gh stack submit` uses that commit's subject as the PR title.

```bash
gh stack checkout <branch>             # or gh stack down / up — the layer that owns the change
git add <files>
git commit --amend --no-edit           # amends, keeps the message
gh stack rebase --upstack              # replays every branch above onto the amended one
gh stack top                           # back to where you were
```

- `git commit --amend -m "..."` only when the message must **change**.
- Never skip `gh stack rebase --upstack` after amending a lower layer; the branches above still contain the old commit.

### Pushing to remote

**Never raw `git push`.** **Always push the full stack**: `gh stack push` pushes every active branch atomically with a per-branch `--force-with-lease`. Pushing one branch after a rebase or amend leaves the branches above stale on the remote.

`--force-with-lease` only protects against commits your last fetch didn't see. After a fetch, it overwrites remote-only commits without warning. Pre-flight, every time:

```bash
git fetch origin
gh stack view --short                         # list every branch in the stack
git log --oneline <branch>..origin/<branch>   # remote-only commits — for EACH branch, not just the edited ones
```

Any commits in `<branch>..origin/<branch>` → **stop and reconcile** (see `references/submit-troubleshooting.md`). Never push past them: Cursor agent autofixes, CI commits, and teammate pushes routinely land on branches you didn't touch this session.

```bash
gh stack submit --auto     # pushes, creates PRs for branches that have none, links the stack on GitHub
gh stack push              # updates branches that already have PRs
```

- `gh stack submit --auto` creates new PRs as drafts; add `--open` to create them ready for review (and to mark existing ones ready).
- The PR title is the commit subject when the branch has exactly one commit, otherwise the humanized branch name. The body is the commit body. Check titles after submitting and fix them with `gh pr edit <number> --title "..."`: release-please builds the changelog from the squash-merged PR title, so it must follow the commit format above.
- Merging is the user's call. When asked, merge a stacked PR with `gh stack merge <pr-number> --yes`, which merges that PR and every unmerged PR below it; `gh pr merge` cannot merge a stacked PR. A one-branch stack has no stack on GitHub, so its PR is merged with `gh pr merge <pr-number> --squash`. `gh stack merge` rejects it (`is not a stack number or a stacked pull request`) and still exits 0, so check the PR state afterwards.

### Verifying stack state after rebase / push / submit

Don't claim "done" until you've checked:

```bash
gh stack view --json               # every branch, its PR, needsRebase must be false
git branch --show-current          # confirm you're not on main
git status                         # confirm working tree is clean
```

### Rules

- Each logical unit of work gets its own branch (`gh stack add <branch>`) — one stacked branch per batch/task
- Fixes and amendments use `git commit --amend` on the owning branch, then `gh stack rebase --upstack`, never a new branch
- Never use `--no-verify` — let the hooks run
- Never use raw `git push` — always `gh stack push` or `gh stack submit --auto`
- Never run `gh stack` commands in their interactive form
- Before pushing, `git fetch origin` and check for remote-only commits per branch
- After `gh stack rebase` / `push` / `submit`, verify the stack state (`gh stack view --json`) before reporting success

## Pre-commit Hooks

Projects typically enforce via pre-commit hooks:

- **Commit message must include a ticket ID** (validated by `commit-msg` hook)
- **Commit message must start with a valid type** (`feat`, `fix`, `chore`, `wip`, etc.)
- **Linting, formatting, type-checking** on staged files
- **Complexity checks** (if configured)

If complexity fails, split the offending function into smaller units before retrying.
