# Submit Troubleshooting — When `gt` Aborts, Warns, or No-ops

## Before force-pushing: check for remote-only commits

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

## During the push: read Graphite's warnings

Graphite prints `WARNING: Branch X has been updated remotely. Force submitting local version to remote...` when `--force` is about to overwrite remote commits. **Treat this warning as a halt condition** — abort the submit (Ctrl-C while it's iterating, or skip with `--no-interactive` only after you've verified there are no remote-only commits), pull the missing commits, then retry.

## Untracked branch — `gt track` before any other `gt` op

Any `gt` command against a branch Graphite doesn't know about aborts with:

```text
ERROR: Cannot perform this operation on untracked branch <name>.
You can track it by specifying its parent with gt track.
```

This is the default state for branches created **outside Graphite** — most commonly:

- `cursor/*` branches pushed by Cursor Cloud Agents
- Feature branches fetched from teammates or CI that Graphite has never seen locally
- Old branches carried over from a plain `git checkout` that predates Graphite

**Recovery — do not surface the raw error to the user. Run this first, then retry the original command:**

```bash
gt track --parent main   # or the correct parent, e.g. gt track --parent <base-branch>
```

Almost always the parent is `main`. Only pick a different parent when the branch was clearly stacked on top of another feature branch (rare for `cursor/*` — those come off `main`).

If `gt restack` still reports merge conflicts after tracking, the branch has genuinely diverged from `main` — resolve the conflicts, don't work around them by force-submitting.

## Restack before submit

`gt modify` automatically restacks descendants **only when those descendants are checked out in the same worktree**. If `gt submit --stack` aborts with `WARNING: You must restack before submitting this stack. ERROR: Aborting non-interactive submit.`, run `gt restack` first, then re-run the submit:

```bash
gt restack
gt submit --stack --force --no-interactive
```

## Worktree + stack collisions

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

## Force-submit safety

If `gt submit --stack --force` prints `WARNING: Branch <name> has been updated remotely. Force submitting local version to remote...`, **do not silently proceed**. The remote has commits that the local branch is about to overwrite. Stop and reconcile:

```bash
git fetch
git log HEAD..origin/<branch>          # show what would be overwritten
```

Surface the divergence to the user (paste the log) and confirm before re-running the force submit. If the SHAs are actually equivalent (only metadata drift), say so and proceed; otherwise rebase locally first.
