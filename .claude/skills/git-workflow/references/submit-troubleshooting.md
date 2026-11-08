# Submit Troubleshooting — When `gh stack` Fails, Aborts, or Diverges

`gh stack` exit codes: 2 not in a stack, 3 rebase conflict, 4 GitHub API failure, 5 invalid arguments, 6 branch belongs to several stacks, 7 rebase already in progress, 8 stack locked, 9 stacked PRs not enabled for the repository, 10 interrupted `modify`. Read stderr; never parse it.

## Before pushing: check for remote-only commits

`gh stack push` and `gh stack submit` use `--force-with-lease`, which only protects against remote commits your last fetch didn't see. After `git fetch`, they overwrite remote-only commits — most commonly commits authored by Cursor agents, CI bots, or teammates after you last pulled — without warning. Always reconcile first:

```bash
# 1. Fetch latest remote state for all stack branches
git fetch origin

# 2. For EVERY branch in the stack — including ones you didn't touch this session
gh stack view --short                         # show the stack
git log --oneline <branch>..origin/<branch>   # commits on remote that aren't local
```

**Check every branch `gh stack view` shows, not just the ones you edited.** Cursor Agent autofixes, CI commits, and teammate pushes routinely land on the lower (scaffold/base) branches of a stack you've been working in. Skipping the check on "untouched" branches has overwritten work multiple times.

If `git log --oneline <branch>..origin/<branch>` shows any commits, **stop and reconcile** before pushing. Commits you rewrote yourself (amended or rebased) show up here too; everything else must be folded in:

```bash
gh stack checkout <branch>
git pull --rebase origin <branch>     # fold the remote-only commits in
gh stack rebase --upstack             # replay the branches above
```

Surface the divergence to the user (paste the log) when it is not obviously yours or a bot autofix. Never push past remote-only commits.

## Push rejected — stale lease

If `gh stack push` reports a rejected or stale ref, the remote moved after your last fetch. The push is atomic, so nothing was updated. Re-run the fetch and remote-only check above, reconcile, then push again. Never add `--no-atomic` to get a partial push through.

## Not part of a stack (exit 2)

Any branch-scoped `gh stack` command against a branch that isn't tracked locally fails with:

```text
✗ current branch "<name>" is not part of a stack
```

This is the default state for branches created **outside `gh stack`** — most commonly:

- `cursor/*` branches pushed by Cursor Cloud Agents
- Feature branches fetched from teammates or CI
- Branches from the old Graphite workflow

**Recovery — do not surface the raw error to the user. Adopt the branch, then retry the original command:**

```bash
gh stack checkout <pr-number>          # the PR is already in a stack on GitHub: pull that stack down
gh stack init <branch>                 # a branch based directly on main
gh stack init --base main <b1> <b2>    # a chain of existing branches, bottom to top
```

Almost always the branch is based on `main`. Only build a longer chain when the branches clearly sit on top of each other (rare for `cursor/*` — those come off `main`). `init` adopts existing branches without moving them.

If a chain of existing branches already has open PRs (e.g. an old Graphite stack), also link them on GitHub after the pre-push check: `gh stack link <b1> <b2> <b3>` (bottom to top). It pushes the branches, fixes each PR's base, and groups them into a stack.

## Needs rebase

If `gh stack view --json` reports `"needsRebase": true` for a branch, its parent moved (an amend lower in the stack, or new commits on `main`). Rebase before pushing:

```bash
gh stack rebase              # whole stack, onto fresh main
gh stack rebase --upstack    # only the current branch and those above it
```

## Rebase conflict (exit 3)

Resolve each conflict per the `rebase` skill, then:

```bash
git add <resolved paths>
gh stack rebase --continue     # repeat if the next branch conflicts too
gh stack rebase --abort        # or: restore every branch in the stack to its pre-rebase state
```

`gh stack sync` restores all branches before it exits 3, so nothing is half-applied. Run `gh stack rebase` to reproduce the conflict, then resolve and continue as above. Exit 7 means a rebase is already in progress: `--continue` or `--abort` it.

## Worktree + stack collisions

`gh stack rebase` and `gh stack sync` update branches checked out in other worktrees of the same clone, but only when that worktree is clean. A dirty or busy worktree blocks the update; `gh stack` never stashes for you.

Navigation (`checkout`, `up`, `down`, `top`, …) refuses to take over a branch checked out in another worktree. Find it instead:

```bash
gh stack checkout <branch> --print-path    # prints the owning worktree's path on success
```

Recovery when another worktree blocks the rebase:

1. **It's your worktree from this task:** `cd` into it, commit or amend the pending work per `git-workflow`, come back and re-run the rebase.
2. **It isn't yours, or the changes there are unclear:** don't touch it. Tell the user: *"<branch> is checked out with uncommitted changes in `<path>`; commit or stash there, then run `gh stack rebase && gh stack push`."*

A paused rebase can be continued or aborted from any worktree of the clone; resolve and stage the conflict in the worktree the message names.

## Diverged stack — `Sync aborted`

When the local stack and the stack on GitHub changed in different ways (you added a branch locally while someone added a PR on GitHub), non-interactive `gh stack sync` prints both chains, changes nothing, and exits **0** with `Sync aborted`. Exit 0 is not success here — check for that message.

Stop and show the user both chains. Unstacking on GitHub is visible to everyone working on the stack, so only resolve it with the user's go-ahead:

- **Keep the remote stack:** `gh stack unstack --local`, then `gh stack checkout <stack-or-pr-number>`.
- **Keep the local stack:** `gh stack unstack`, then `gh stack init --base main <b1> <b2> …` and `gh stack submit --auto`.

Neither path deletes PRs or branches.

## Restructuring a stack — reorder, drop, rename

There is no non-interactive `gh stack modify`, and agents never run it. Restructure by fixing Git ancestry first, then rebuilding the tracking. Record the old branch tips before moving anything. Ask the user before doing this on a stack that already has PRs:

```bash
git rev-parse <b1> <b2> <b3>                  # record the old tips
# reorder with git rebase --onto, layer by layer, bottom to top
gh stack unstack
gh stack init --base main <new order, bottom to top>
gh stack submit --auto                        # updates PR bases and re-links the stack
```

## Other exits

- **Exit 6** — the current branch belongs to several stacks (usually because it is the trunk of more than one). Check out a branch unique to the intended stack, or pass a stack number where the command accepts one.
- **Exit 8** — another `gh stack` process holds the lock. Wait a few seconds and retry; never delete the lock files.
- **Exit 9** — stacked PRs are not available for this repository. Stop and tell the user.
- **Exit 10** — someone left an interrupted `modify` session. Run `gh stack modify --abort` and tell the user.
