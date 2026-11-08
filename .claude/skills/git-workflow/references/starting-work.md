# Starting Work — Choosing and Verifying the Base

Read this **before the first edit** when starting or resuming any work in a stacked-PR context—including amendments—or choosing a base for a new/follow-up PR.

## Before starting new work — sync main and rebase the stack

**Before editing any source in a stacked-PR context, bring the stack onto current `main`.** Starting work on a stale base means the stack diverges from `main` while you edit, and the divergence only surfaces later as avoidable rebase conflicts at push time. Do this *before the first edit*, not after:

```bash
git fetch origin
gh stack view --short                         # the stack you're in
git log --oneline <branch>..origin/<branch>   # for EACH branch — remote-only commits?
gh stack rebase                               # fetch, fast-forward main, rebase every branch bottom-up
```

Reconcile remote-only commits first (see `submit-troubleshooting.md`); `gh stack rebase` does not pull them in. `gh stack sync --prune` is the equivalent after PRs in the stack have merged: it also pushes and deletes the local branches of merged PRs. Either way, confirm with `gh stack view --json` that no branch reports `"needsRebase": true` before touching code.

This is distinct from the pre-push fetch check in `git-workflow` — that guards against overwriting remote commits when pushing. This one keeps your *base* current so the work you're about to write applies cleanly.

## Choosing the base — stack on a dependency, don't default to main

Before opening a follow-up PR, decide the base *deliberately*. The default is **not** always main. Ask one question: **does this change only make sense once an in-flight, unmerged PR lands?**

- **Yes — it depends on unmerged work** → stack it *on top of that branch*, not main. Typical cases: a cleanup that removes code the open PR replaces, or a follow-up that builds on an API/behaviour the open PR introduces. `gh stack checkout <parent-branch>` first; if the parent is the top of its stack, `gh stack add <new-branch>` stacks the new branch on the dependency. Stacks are strictly linear, so if the parent has branches above it, stop and ask the user where the change belongs.
- **No — it stands alone against current `main`** → fresh stack off main (the flow below).

Branching a dependent change off main is the common mistake: it can merge *before* its prerequisite and break the build, or land as an out-of-order changelog entry. When you're unsure whether the dependency is real, ask — don't assume main.

If you already branched off main and only then realise the work depends on an unlanded PR at the top of a stack, re-parent it — don't rebuild:

```bash
gh stack unstack --local                     # only if the branch is already in its own stack
git rebase --onto <parent-branch> main <branch>
gh stack checkout <parent-branch>            # must be the top of its stack
gh stack add <branch>                        # adopts the existing branch onto the stack
```

## Starting a new PR — verify the base branch BEFORE editing

Before making **any edit** whose goal is a *new PR* / *new branch off main* / *port to a new PR*, verify that you are actually starting from the intended base. In a stacked-PR repo the working checkout is almost always mid-stack on some feature branch — being clean is not the same as being on main.

Trigger phrases that require this pre-check (non-exhaustive): *"new PR based on main"*, *"port this into a new PR"*, *"open a new branch off main"*, *"start fresh from main"*, *"cherry-pick into a new stack"*.

**First action, before any Edit/Write/`git show BR:path > file`:**

```bash
git branch --show-current      # confirm which branch is checked out
git status --short             # confirm the tree is clean (or that you know what's dirty)
gh stack view --short          # visualise the stack you're currently in
```

If you're not on `main` (or on the base branch the user named), do **not** start editing. Options:

1. **Fresh stack off main:**

   ```bash
   git checkout main && git pull --ff-only
   git checkout -b <ticket-id>-<slug>
   gh stack init <ticket-id>-<slug>
   ```

2. **New branch stacked on a specific base:** `gh stack checkout <base>` first, verify, then `gh stack add <branch>` and edit.
3. **Ambiguous:** stop and ask. Never guess the base — landing edits on the wrong stack pollutes an existing PR and forces a painful cherry-pick to recover.

Applies especially when a task instruction reads *"based on the current status of main"*. That phrasing is a hard signal that the current checkout is probably **not** the intended base. Editing first and switching later means uncommitted changes ride the checkout across branches — safe only when there's no overlap with either branch's tree; otherwise you either overwrite unrelated work or lose your edits.
