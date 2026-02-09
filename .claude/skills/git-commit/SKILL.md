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

```bash
# 1. Stage changes
git add <files>

# 2. Verify what's staged
git status --short

# 3. Commit with proper format
git commit -m "<type>(AYC-<number>): <description>"

# 4. If commit fails, fix issues and retry — do NOT use --no-verify
```
