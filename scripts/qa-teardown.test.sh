#!/usr/bin/env bash
# Self-check for qa-teardown.sh: marked worktree is torn down, unmarked one is untouched.
set -euo pipefail

SCRIPT="$(cd "$(dirname "$0")" && pwd)/qa-teardown.sh"
T="$(cd "$(mktemp -d "${TMPDIR:-/tmp}/qa-teardown.XXXXXX")" && pwd -P)"   # realpath: git reports resolved paths
trap 'rm -rf "$T"; kill "${STRAY:-}" 2>/dev/null || true' EXIT

# Main repo with a fake ./dev that records its calls.
git -C "$T" init -q main
cat > "$T/main/dev" <<'DEV'
#!/usr/bin/env bash
echo "$*" >> "$DEV_CALLS"
DEV
chmod +x "$T/main/dev"
git -C "$T/main" -c user.email=t@t -c user.name=t add dev
git -C "$T/main" -c user.email=t@t -c user.name=t commit -qm init

git -C "$T/main" worktree add -q --detach "$T/qa-wt"
git -C "$T/main" worktree add -q --detach "$T/user-wt"
mkdir -p "$T/qa-wt/.dev/slot-7" "$T/user-wt/.dev/slot-3"
touch "$T/qa-wt/.dev/qa"                      # marked → QA-owned
export DEV_CALLS="$T/dev-calls"

# A stray server started outside ./dev, identifiable only by its cmdline path.
node -e 'setInterval(() => {}, 1000)' "$T/qa-wt/ayunis-core-backend/dist/src/main" &
STRAY=$!

(cd "$T/main" && "$SCRIPT" >/dev/null)   # no args = sweep every marked worktree of the repo we are in
sleep 1.5

[ ! -d "$T/qa-wt" ]                          || { echo "FAIL: qa worktree not removed"; exit 1; }
grep -qx "down --slot 7" "$DEV_CALLS"        || { echo "FAIL: ./dev down --slot 7 not called"; exit 1; }
! kill -0 "$STRAY" 2>/dev/null               || { echo "FAIL: stray server still alive"; exit 1; }
[ -d "$T/user-wt" ]                          || { echo "FAIL: unmarked worktree was removed"; exit 1; }
! grep -q "slot 3" "$DEV_CALLS"              || { echo "FAIL: unmarked slot was touched"; exit 1; }
echo "OK: qa-teardown"
