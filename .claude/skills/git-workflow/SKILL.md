---
name: git-workflow
description: Git workflow for ayunis-core — commit messages, Graphite stacking, and branching conventions. Use when committing, branching, or asking about git workflow.
---

# Git Workflow — ayunis-core

This project uses **Graphite** for stacked PRs. Always use `gt` commands, never raw `git commit`.

## Commit Message Format

```text
<type>(<task-id>): <short description>
```

**Examples from project history:**

```text
feat(AYC-51): add marketplace agent install page in frontend
fix(AYC-42): invalidate router cache when agent model is updated
refactor(AYC-30): update LongChatWarning component
wip(AYC-60): add source entity and repository port
```

### Rules

1. **Task ID is required.** Always ask the user for the task ID if not provided. Format: `AYC-<number>`. Never invent a task ID.
2. **Type** must be one of: `feat`, `fix`, `chore`, `refactor`, `ci`, `docs`, `test`, `perf`, `wip`.
3. **Short description** is lowercase, imperative mood, no period at end.
4. **Body** (optional) — separated by blank line, bullet points with `-`, wrap at ~72 chars.
5. For `chore` commits without a task (e.g., release, tooling), the scope can be omitted or use a non-AYC scope: `chore(main): release 1.8.0`.

## WIP vs Semantic Types — Changelog Hygiene

This project uses **release-please** to auto-generate changelogs from squash-merged PR titles on `main`. Only semantic types (`feat`, `fix`, `refactor`, `perf`, `docs`, `ci`, `chore`, `test`) appear in the changelog. The `wip` type is **excluded from the changelog and does not trigger version bumps**.

### When to use `wip:`

Use `wip:` for any PR that is **part of a larger feature but does not complete it**. This is the default for stacked PRs in a multi-branch feature:

```text
wip(AYC-60): add source entity and repository port        ← stack branch 1
wip(AYC-60): implement source ingestion use case           ← stack branch 2
feat(AYC-60): add source management API and UI             ← final branch, completes the feature
```

Only the last PR uses `feat:` — that's the one that appears in the changelog as a single entry.

### When to use semantic types

Use `feat:`, `fix:`, etc. when the PR **delivers a complete, user-visible change** on its own:

- A standalone bug fix → `fix(AYC-42): correct date validation`
- A self-contained feature in a single PR → `feat(AYC-51): add agent install page`
- CI/tooling change → `ci(AYC-000): add dead code workflow`

### Rule of thumb

> If this PR were the only one merged, would the change make sense to a user reading the changelog? If yes → semantic type. If no → `wip:`.

## Branching & Stacking

The worktree branch (e.g., `feat/ayc-123/work`) is the **base branch**. Graphite stacks are built on top of it.

### New commit → new stacked branch

Each logical unit of work gets its own `gt create`:

```bash
# 1. Stage changes
git add <files>

# 2. Verify what's staged
git status --short

# 3. Create a new stacked branch (auto-stacks on current branch)
gt create -m "<type>(AYC-<number>): <description>"

# 4. If pre-commit hooks fail, fix issues and retry with gt modify
```

### Amending the current branch

Use when fixing QA findings, addressing review feedback, or correcting issues on the current branch:

```bash
# 1. Stage fixes
git add <files>

# 2. Amend the current stacked branch (folds changes into existing commit)
gt modify -m "<type>(AYC-<number>): <description>"

# 3. This automatically restacks any descendant branches
```

Note: `gt modify` without `--commit` amends the existing commit. With `--commit` it creates an additional commit on the branch — that's not what we want for fixes.

### Rules

- Each logical unit of work gets its own `gt create` — one stacked branch per batch/task
- Fixes and amendments use `gt modify`, never `gt create`
- Never use `--no-verify` — let the hooks run
- Never use raw `git commit` — always go through `gt`

## Pre-commit Hooks

The project has a pre-commit hook that enforces:

- **Commit message must include `AYC-` prefix** (validated by `commit-msg` hook)
- **Commit message must start with a valid type** (`feat`, `fix`, `chore`, `wip`, etc.)
- **ESLint, Prettier, TypeScript typecheck** on staged files
- **Lizard complexity check** (CCN ≤ 10, length ≤ 50 lines, args ≤ 5)

If complexity fails, split the offending function into smaller units before retrying.
