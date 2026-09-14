#!/usr/bin/env bash
# Tear down QA worktrees: dev servers, docker slot, then the worktree itself.
#
# A QA worktree is one that contains the marker file .dev/qa (the qa skill
# writes it right after `git worktree add`). Only marked worktrees are touched,
# so user worktrees and pre-existing slots are never affected.
#
# Usage:
#   scripts/qa-teardown.sh            sweep every marked worktree (run at the START of a QA run)
#   scripts/qa-teardown.sh <WT>...    tear down the given worktrees (must be marked)
set -euo pipefail

# Main checkout = first entry of `git worktree list`, resolved from the current directory.
REPO="$(git worktree list --porcelain | awk '/^worktree /{print $2; exit}')"

if [ $# -eq 0 ]; then
  # shellcheck disable=SC2046
  set -- $(git -C "$REPO" worktree list --porcelain | awk '/^worktree /{print $2}')
fi

for WT in "$@"; do
  WT="${WT%/}"
  [ "$WT" != "$REPO" ] && [ -f "$WT/.dev/qa" ] || continue
  echo "==> tearing down QA worktree $WT"

  # ./dev down kills the process tree it started (pid files) and runs compose down.
  for slot in $(ls "$WT/.dev" | sed -n 's/^slot-//p'); do
    (cd "$WT" && ./dev down --slot "$slot") || echo "warn: ./dev down --slot $slot failed" >&2
  done

  # ponytail: catch servers started outside ./dev (native fallback path). Scoped to
  # this worktree's app dirs, so only processes the QA run itself started can match.
  pkill -TERM -f "$WT/(ayunis-core-backend|ayunis-core-frontend)/" 2>/dev/null || true

  git -C "$REPO" worktree remove --force "$WT"
  echo "==> removed $WT"
done
