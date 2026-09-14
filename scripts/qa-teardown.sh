#!/usr/bin/env bash
# Tear down QA worktrees: dev servers, docker slot, then the worktree itself.
#
# Authorization lives in the MAIN checkout, never in the worktree: the qa skill
# appends each QA worktree's path to $REPO/.dev/qa-worktrees right after
# `git worktree add`. Branch content is untrusted (QA checks out arbitrary PRs),
# so nothing a branch can commit or plant may opt a worktree into teardown.
#
# Threat model: QA of a branch runs its `pnpm install` lifecycle scripts, i.e. the
# branch already executes arbitrary code as the developer. The guards here make
# sure *this teardown* is never the thing that damages state outside the QA
# worktree (no writes through planted symlinks, no signals to processes that are
# not the QA run's own, no slot of another checkout stopped). They are not, and
# cannot be, a sandbox for the branch itself.
#
# Usage:
#   scripts/qa-teardown.sh              sweep every registered worktree (run at the START of a QA run)
#   scripts/qa-teardown.sh <WT>...      tear down the given worktrees (must be registered)
#   scripts/qa-teardown.sh --guard <WT> make a fresh worktree safe to write into, BEFORE
#                                       registering it or writing anything (incl. `ln -sf` of .env)
set -euo pipefail

# Main checkout = first entry of `git worktree list`, resolved from the current directory.
REPO="$(git worktree list --porcelain | sed -n 's/^worktree //p;1q')"
REGISTRY="$REPO/.dev/qa-worktrees"

# Compare on paths stripped of trailing slashes: the skill registers $WT as given,
# and a stored "…/wt/" would never match the "…/wt" we look up.
registered() { [ -f "$REGISTRY" ] && sed 's:/*$::' "$REGISTRY" | grep -Fqx "$1"; }
deregister() {
  sed 's:/*$::' "$REGISTRY" | grep -Fvx "$1" > "$REGISTRY.tmp" || true
  mv "$REGISTRY.tmp" "$REGISTRY"
}

# Print the first symlink that would let a write escape the worktree, if any.
# A symlinked *directory* is the dangerous case: every write below it lands
# wherever the link points, and `rm -f`/`>` on the final component never sees it.
symlink_offender() {
  local wt="$1" entry
  for entry in ayunis-core-backend ayunis-core-frontend ayunis-core-e2e packages .dev; do
    [ -L "$wt/$entry" ] && { printf '%s' "$wt/$entry"; return 0; }
  done
  # Slot dirs and pid files are read and written by `dev`; fail closed on a find error.
  [ -e "$wt/.dev" ] && find "$wt/.dev" -type l 2>&1 | sed -n '1{p;q;}' | grep . && return 0
  return 1
}

# --guard: called right after `git worktree add`, before the worktree is registered
# or written to. Refuse a booby-trapped checkout, otherwise clear the state files so
# only what we create afterwards lives there.
if [ "${1:-}" = "--guard" ]; then
  WT="${2:?usage: qa-teardown.sh --guard <worktree>}"; WT="${WT%/}"
  [ -d "$WT" ] || { echo "ERROR: $WT is not a directory" >&2; exit 1; }
  if offender="$(symlink_offender "$WT")"; then
    echo "ERROR: $offender is a symlink — refusing to use this worktree for QA" >&2
    exit 1
  fi
  # rm -f on a symlink removes the link, never what it points at. .env matters as
  # much as .env.dev: the skill's next step is `ln -sf … "$WT/…/.env"`, and if the
  # branch shipped .env as a link to a directory, ln would write *inside* it.
  rm -rf "$WT/.dev"
  rm -f "$WT/ayunis-core-backend/.env.dev"  "$WT/ayunis-core-frontend/.env.dev" \
        "$WT/ayunis-core-backend/.env"      "$WT/ayunis-core-frontend/.env"
  echo "==> $WT is clear for QA"
  exit 0
fi

# Paths may contain spaces: read the registry line by line, never word-split it.
targets=()
if [ $# -eq 0 ]; then
  [ -f "$REGISTRY" ] || exit 0
  while IFS= read -r line; do [ -n "$line" ] && targets+=("$line"); done < "$REGISTRY"
else
  targets=("$@")
fi
[ ${#targets[@]} -gt 0 ] || exit 0

status=0
for WT in "${targets[@]}"; do
  WT="${WT%/}"
  if [ "$WT" = "$REPO" ] || ! registered "$WT"; then
    echo "skip: $WT is not a registered QA worktree — nothing was torn down" >&2
    status=1
    continue
  fi
  if [ ! -d "$WT" ]; then
    deregister "$WT"   # removed by hand already
    continue
  fi
  echo "==> tearing down QA worktree $WT"

  # --guard ran at creation, but the branch's own build steps could have added a
  # link since; re-check before we write or signal anything.
  if offender="$(symlink_offender "$WT")"; then
    echo "warn: $offender is a symlink, refusing to touch this worktree" >&2
    status=1
    continue
  fi

  # The worktree's ./dev is whatever the PR under test ships and may predate the
  # foreign-owner guard in `dev down`. QA worktrees are disposable, so use ours.
  # rm first: cp follows a destination symlink and would write through it.
  if ! { rm -f "$WT/dev" && cp "$REPO/dev" "$WT/dev"; }; then
    echo "warn: cannot update $WT/dev, skipping this worktree" >&2
    status=1
    continue
  fi

  # ponytail: catch servers started outside ./dev (native fallback path) before
  # `dev down` checks the slot ports. Scoped to this worktree's app dirs, so only
  # processes the QA run itself started can match. nest/node servers routinely
  # ignore SIGTERM while swapped out, so follow up with KILL.
  # pkill -f takes an ERE, so escape the path: git allows | ( ) + . in branch names.
  esc="$(printf '%s' "$WT" | sed 's/[][\.*^$+?(){}|\\]/\\&/g')"
  strays="$esc/(ayunis-core-backend|ayunis-core-frontend)/"
  if pkill -TERM -f "$strays" 2>/dev/null; then
    sleep 2
    pkill -KILL -f "$strays" 2>/dev/null || true
  fi

  # ./dev down kills the process tree it started (pid files) and runs compose down.
  # It refuses to stop containers another checkout started under the same slot number.
  # Slot dir names come from the untrusted worktree: accept digits only (dev's
  # arithmetic would otherwise evaluate e.g. "x[$(cmd)]").
  failed=0
  for slot in $(ls "$WT/.dev" 2>/dev/null | sed -n 's/^slot-\([0-9][0-9]*\)$/\1/p'); do
    (cd "$WT" && ./dev down --slot "$slot") || { echo "warn: ./dev down --slot $slot failed" >&2; failed=1; }
  done

  # Keep the worktree (and its registration) so the next sweep can retry; removing
  # it now would leave the slot up with no scripted way to find it again.
  if [ "$failed" = 1 ]; then
    echo "==> keeping $WT: a slot did not come down cleanly — fix the cause and rerun" >&2
    status=1
    continue
  fi

  # git worktree remove --force still fails on leftovers it cannot delete
  # ("Directory not empty", typically node_modules); fall back to rm + prune.
  if git -C "$REPO" worktree remove --force "$WT" 2>/dev/null \
    || { rm -rf "$WT" && git -C "$REPO" worktree prune; }; then
    deregister "$WT"
    echo "==> removed $WT"
  else
    echo "warn: could not remove $WT — remove it by hand, then git worktree prune" >&2
    status=1
  fi
done
exit $status
