---
name: rebase
description: Rebase a branch onto another — resolve merge conflicts carefully by inspecting each conflict individually. Use when rebasing, restacking, or resolving merge conflicts.
---

# Rebase & Conflict Resolution

## Golden Rule

**NEVER blindly accept "ours" or "theirs" for all conflicts.** Every conflict must be inspected individually and resolved with a conscious decision based on understanding both sides.

Blanket strategies like `git checkout --ours .` or `git checkout --theirs .` or scripted mass-resolution are **strictly forbidden**. They silently discard work and introduce subtle bugs.

## Rebasing with Graphite

This project uses Graphite (see `git-workflow` skill). Prefer Graphite commands:

```bash
# Restack the current stack onto latest main
gt restack

# If you need to rebase onto a specific branch
gt restack --onto <branch>
```

If raw git rebase is needed (rare):

```bash
git rebase <target-branch>
```

## Resolving Conflicts — Step by Step

When a rebase stops on a conflict:

### 1. Identify all conflicting files

```bash
git diff --name-only --diff-filter=U
```

### 2. For EACH conflicting file, understand the context

Before touching the file, understand **what both sides intended**:

```bash
# What did OUR side change in this file? (the branch being rebased)
git log --oneline HEAD -- <file>
git diff HEAD~1 HEAD -- <file>   # or check relevant commits

# What did THEIR side change? (the target branch)
git log --oneline REBASE_HEAD..HEAD -- <file>  # commits on target affecting this file
```

### 3. Open the file and read the conflict markers

```text
<<<<<<< HEAD
(their version — what's on the target branch)
=======
(our version — what's on the branch being rebased)
>>>>>>> <commit>
```

Read **both sides completely**. Understand the intent of each change.

### 4. Make a conscious resolution decision

For each conflict hunk, decide:

- **Keep ours** — if our change is the correct/newer behavior
- **Keep theirs** — if their change supersedes ours
- **Merge both** — if both changes are needed (most common with adjacent edits)
- **Rewrite** — if neither side is correct after the merge

**State your reasoning** for non-trivial conflicts (e.g., "keeping theirs because this function was refactored on main and our change targeted the old signature").

### 5. After resolving each file

```bash
git add <file>
```

### 6. After all files are resolved

```bash
git rebase --continue
```

If more conflicts arise on the next commit, repeat from step 1.

## Common Conflict Patterns

### Lock files (`package-lock.json`, `pnpm-lock.yaml`)

Don't manually resolve. Accept either side and regenerate:

```bash
git checkout --theirs package-lock.json
npm install
git add package-lock.json
```

### Auto-generated files (migrations, GraphQL schema)

Accept theirs (mainline version), then regenerate if our branch needs changes.

### Import ordering / formatting

If the only difference is formatting or import order, accept theirs and let the formatter/linter re-apply on the next commit.

## What to Do When Conflicts Are Overwhelming

If a rebase produces dozens of conflicts across many files:

1. **Stop and assess** — `git rebase --abort` is always an option
2. **Inform the user** — describe the scope: how many files, which areas of code
3. **Propose a strategy** — e.g., interactive rebase to squash first, or rebase commit-by-commit
4. **Never take shortcuts** — even if there are 50 conflicts, each one gets individual attention

## Forbidden Practices

- ❌ `git checkout --ours .` or `git checkout --theirs .`
- ❌ `xargs git checkout --ours` or any scripted bulk resolution
- ❌ Accepting all changes from one side without reading the diffs
- ❌ Using `rerere` results without verifying they're still correct
- ❌ Skipping conflict review because "it's just formatting"
- ❌ Using `--strategy-option=ours` or `--strategy-option=theirs` on the entire rebase
