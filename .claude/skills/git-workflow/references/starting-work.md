# Starting Work — Choosing and Verifying the Base

Read this **before the first edit** of any new PR, new branch, or follow-up on unmerged work.

## Before starting new work — sync main and restack

**Before editing any source in a stacked-PR context, sync local `main` to `origin` and restack.** Starting work on a stale base means the stack diverges from `main` while you edit, and the divergence only surfaces later as avoidable rebase conflicts at submit time. Do this *before the first edit*, not after:

```bash
git fetch origin
git checkout main && git pull --ff-only origin main   # fast-forward local main
git checkout <stack-branch>                            # back to where you work
gt restack                                             # rebase the stack onto fresh main
```

`gt sync` (which prunes merged branches and pulls trunk) is the Graphite-native equivalent when you also want to clean up landed branches. Either way, confirm with `gt log short` that the stack sits on top of current `main` before touching code.

This is distinct from the pre-submit fetch check below — that guards against overwriting remote commits when pushing. This one keeps your *base* current so the work you're about to write applies cleanly.

## Choosing the base — stack on a dependency, don't default to main

Before opening a follow-up PR, decide the base *deliberately*. The default is **not** always main. Ask one question: **does this change only make sense once an in-flight, unmerged PR lands?**

- **Yes — it depends on unmerged work** → stack it *on top of that branch*, not main. Typical cases: a cleanup that removes code the open PR replaces, or a follow-up that builds on an API/behaviour the open PR introduces. `gt checkout <parent-branch>` first, then edit so `gt create` stacks the new branch on the dependency.
- **No — it stands alone against current `main`** → fresh stack off main (the flow below).

Branching a dependent change off main is the common mistake: it can merge *before* its prerequisite and break the build, or land as an out-of-order changelog entry. When you're unsure whether the dependency is real, ask — don't assume main.

If you already branched off main and only then realise the work depends on an unlanded PR, re-parent it — don't rebuild:

```bash
gt move --onto <parent-branch>   # re-parent the current branch onto its real dependency
```

## Starting a new PR — verify the base branch BEFORE editing

Before making **any edit** whose goal is a *new PR* / *new branch off main* / *port to a new PR*, verify that you are actually starting from the intended base. In a Graphite repo the working checkout is almost always mid-stack on some feature branch — being clean is not the same as being on main.

Trigger phrases that require this pre-check (non-exhaustive): *"new PR based on main"*, *"port this into a new PR"*, *"open a new branch off main"*, *"start fresh from main"*, *"cherry-pick into a new stack"*.

**First action, before any Edit/Write/`git show BR:path > file`:**

```bash
git branch --show-current      # confirm which branch is checked out
git status --short             # confirm the tree is clean (or that you know what's dirty)
gt log short                   # visualise the stack you're currently in
```

If you're not on `main` (or on the base branch the user named), do **not** start editing. Options:

1. **Fresh stack off main:**

   ```bash
   gt checkout main && git pull --ff-only
   # then let `gt create` start the new stack on your first commit
   ```

2. **New branch stacked on a specific base:** `gt checkout <base>` first, verify, then edit.
3. **Ambiguous:** stop and ask. Never guess the base — landing edits on the wrong stack pollutes an existing PR and forces a painful cherry-pick to recover.

Applies especially when a task instruction reads *"based on the current status of main"*. That phrasing is a hard signal that the current checkout is probably **not** the intended base. Editing first and switching later means uncommitted changes ride the checkout across branches — safe only when there's no overlap with either branch's tree; otherwise you either overwrite unrelated work or lose your edits.
