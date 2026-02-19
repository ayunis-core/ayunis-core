---
name: git-commit
description: Use when committing changes. Ensures correct commit message format, task ID, and conventional commit style matching project history.
---

# Git Commit — ayunis-core

## Commit Message Format

```
<type>(<task-id>): <short description>
```

**Examples from project history:**

```
feat(AYC-51): add marketplace agent install page in frontend
fix(AYC-42): invalidate router cache when agent model is updated
refactor(AYC-30): update LongChatWarning component
```

## Rules

1. **Task ID is required.** Always ask the user for the task ID if not provided. Format: `AYC-<number>`. Never invent a task ID.
2. **Type** must be one of: `feat`, `fix`, `chore`, `refactor`, `ci`, `docs`, `test`, `perf`.
3. **Short description** is lowercase, imperative mood, no period at end.
4. **Body** (optional) — separated by blank line, bullet points with `-`, wrap at ~72 chars.
5. For `chore` commits without a task (e.g., release, tooling), the scope can be omitted or use a non-AYC scope: `chore(main): release 1.8.0`.

## Pre-commit Checks

The project has a pre-commit hook that enforces:

- **Commit message must include `AYC-` prefix** (validated by `commit-msg` hook)
- **ESLint, Prettier, TypeScript typecheck** on staged files
- **Lizard complexity check** (CCN ≤ 10, length ≤ 50 lines, args ≤ 5)

If complexity fails, split the offending function into smaller units before retrying.

## Workflow

This project uses **Graphite** for stacked PRs. Always use `gt` commands, never raw `git commit`.

### New commit → new stacked branch

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

Use this when fixing QA findings, addressing review feedback, or correcting issues on the current branch.

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
