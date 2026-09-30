#!/usr/bin/env bash
# Self-check for qa-teardown.sh: registered worktrees are torn down, everything else is untouched.
set -euo pipefail

SCRIPT="$(cd "$(dirname "$0")" && pwd)/qa-teardown.sh"
T="$(cd "$(mktemp -d "${TMPDIR:-/tmp}/qa-teardown.XXXXXX")" && pwd -P)"   # realpath: git reports resolved paths
trap 'chmod -R u+w "$T" 2>/dev/null; rm -rf "$T"; kill "${STRAY:-}" 2>/dev/null || true' EXIT

# Main repo with a fake ./dev that records its calls.
git -C "$T" init -q main
cat > "$T/main/dev" <<'DEV'
#!/usr/bin/env bash
echo "$*" >> "$DEV_CALLS"
[ "$*" = "down --slot 9" ] && exit 1   # simulates "slot still occupied"
exit 0
DEV
chmod +x "$T/main/dev"
git -C "$T/main" -c user.email=t@t -c user.name=t add dev
git -C "$T/main" -c user.email=t@t -c user.name=t commit -qm init

wt() { git -C "$T/main" worktree add -q --detach "$T/$1"; }
wt a-locked-wt;  mkdir -p "$T/a-locked-wt/.dev/slot-8"; chmod 555 "$T/a-locked-wt/.dev"   # files cannot be deleted
wt qa-wt;        mkdir -p "$T/qa-wt/.dev/slot-7"
wt user-wt;      mkdir -p "$T/user-wt/.dev/slot-3"; touch "$T/user-wt/.dev/qa"          # forged marker, NOT registered
wt qa-stuck-wt;  mkdir -p "$T/qa-stuck-wt/.dev/slot-9"
wt b-symlink-wt; mkdir -p "$T/b-symlink-wt/.dev"; ln -s "$T/user-wt/.dev/slot-3" "$T/b-symlink-wt/.dev/slot-5"   # slot dir → user's state
wt c-devlink-wt; ln -s "$T/user-wt/.dev" "$T/c-devlink-wt/.dev"                                                  # .dev itself → user's state
wt d-fresh-wt                                                                                                    # registered, died before ./dev up: no .dev at all
wt 'f space-wt'; mkdir -p "$T/f space-wt/.dev/slot-6"                                                             # path with a space
wt g-slash-wt; mkdir -p "$T/g-slash-wt/.dev/slot-4"                                                               # registered with a trailing slash
mkdir -p "$T/qa-wt/.dev/slot-x[\$(touch $T/pwned)]"                                                              # malicious slot dir: must never reach dev's arithmetic
wt 'e-(re|gex)+wt'; mkdir -p "$T/e-(re|gex)+wt/.dev"                                                              # path with ERE metachars, ends in a | trap
printf 'SECRET\n' > "$T/sentinel"; ln -sf "$T/sentinel" "$T/qa-wt/dev"   # malicious branch: dev → developer's .env

# Registry in the MAIN checkout is the only authorization.
mkdir -p "$T/main/.dev"
printf '%s\n' "$T/g-slash-wt/" "$T/a-locked-wt" "$T/qa-wt" "$T/qa-stuck-wt" "$T/b-symlink-wt" "$T/c-devlink-wt" "$T/d-fresh-wt" "$T/e-(re|gex)+wt" "$T/f space-wt" "$T/gone-wt" > "$T/main/.dev/qa-worktrees"
export DEV_CALLS="$T/dev-calls"

# A stray server started outside ./dev, identifiable only by its cmdline path.
node -e 'process.on("SIGTERM", () => {}); setInterval(() => {}, 1000)' "$T/qa-wt/ayunis-core-backend/dist/src/main" &   # ignores TERM like a swapped-out nest server
STRAY=$!
node -e 'setInterval(() => {}, 1000)' "$T/e-(re|gex)+wt/ayunis-core-backend/dist/src/main" &   # stray under the regex-hostile path
STRAY_RE=$!
node -e 'setInterval(() => {}, 1000)' "$T/decoy/ayunis-core-backend/dist/src/main" &           # decoy: same app dir, different worktree
DECOY=$!
trap 'chmod -R u+w "$T" 2>/dev/null; rm -rf "$T"; kill "${STRAY:-}" "${STRAY_RE:-}" "${DECOY:-}" 2>/dev/null || true' EXIT

set +e; (cd "$T/main" && "$SCRIPT" >/dev/null 2>&1); rc=$?; set -e   # no args = sweep every registered worktree
set +e; (cd "$T/main" && "$SCRIPT" "$T/user-wt" >/dev/null 2>&1); rc_unreg=$?; set -e   # explicit but unregistered → refused, non-zero
sleep 3

grep -qx SECRET "$T/sentinel"                || { echo "FAIL: cp wrote through the dev symlink into the target"; exit 1; }
[ ! -d "$T/qa-wt" ]                          || { echo "FAIL: qa worktree not removed"; exit 1; }
grep -qx "down --slot 7" "$DEV_CALLS"        || { echo "FAIL: ./dev down --slot 7 not called"; exit 1; }
! kill -0 "$STRAY" 2>/dev/null               || { echo "FAIL: stray server still alive"; exit 1; }
[ -d "$T/user-wt" ]                          || { echo "FAIL: unregistered worktree was removed (forged marker honoured)"; exit 1; }
! grep -q "slot 3" "$DEV_CALLS"              || { echo "FAIL: unregistered slot was touched"; exit 1; }
[ -d "$T/b-symlink-wt" ]                     || { echo "FAIL: worktree with .dev symlinks was not refused"; exit 1; }
! grep -q "slot 5" "$DEV_CALLS"              || { echo "FAIL: symlinked slot dir was downed"; exit 1; }
[ -L "$T/c-devlink-wt/.dev" ]                || { echo "FAIL: worktree whose .dev is a symlink was not refused"; exit 1; }
[ ! -d "$T/d-fresh-wt" ]                     || { echo "FAIL: registered worktree without .dev was not removed"; exit 1; }
[ ! -d "$T/f space-wt" ]                     || { echo "FAIL: worktree path with a space was not torn down"; exit 1; }
grep -qx "down --slot 6" "$DEV_CALLS"        || { echo "FAIL: slot of the space-path worktree was not downed"; exit 1; }
[ ! -d "$T/g-slash-wt" ]                     || { echo "FAIL: worktree registered with a trailing slash was skipped"; exit 1; }
grep -qx "down --slot 4" "$DEV_CALLS"        || { echo "FAIL: slot of the trailing-slash worktree was not downed"; exit 1; }
! grep -q g-slash-wt "$T/main/.dev/qa-worktrees" || { echo "FAIL: trailing-slash entry not deregistered"; exit 1; }
[ "$rc_unreg" -ne 0 ]                        || { echo "FAIL: explicit unregistered worktree exited 0 while doing nothing"; exit 1; }
[ ! -e "$T/pwned" ]                          || { echo "FAIL: malicious slot dir name reached dev (command executed)"; exit 1; }
! grep -q 'slot-x\|slot x' "$DEV_CALLS"      || { echo "FAIL: non-numeric slot passed to dev"; exit 1; }
! kill -0 "$STRAY_RE" 2>/dev/null            || { echo "FAIL: stray under regex-hostile worktree path survived"; exit 1; }
kill -0 "$DECOY" 2>/dev/null                 || { echo "FAIL: decoy outside the worktree was killed (pattern escaped its scope)"; exit 1; }
[ ! -d "$T/e-(re|gex)+wt" ]                  || { echo "FAIL: regex-hostile worktree not removed"; exit 1; }
[ -d "$T/qa-stuck-wt" ]                      || { echo "FAIL: worktree removed although its slot did not come down"; exit 1; }
[ -d "$T/a-locked-wt" ]                      || { echo "FAIL: undeletable worktree unexpectedly gone"; exit 1; }
grep -qx "down --slot 8" "$DEV_CALLS"        || { echo "FAIL: locked worktree's slot was not downed"; exit 1; }
[ "$rc" -ne 0 ]                              || { echo "FAIL: sweep exited 0 despite stuck/refused worktrees"; exit 1; }
# Registry: removed and vanished entries dropped, kept ones retained for the retry.
want="$(printf '%s\n' "$T/a-locked-wt" "$T/qa-stuck-wt" "$T/b-symlink-wt" "$T/c-devlink-wt")"
[ "$(cat "$T/main/.dev/qa-worktrees")" = "$want" ] || { echo "FAIL: registry after sweep:"; cat "$T/main/.dev/qa-worktrees"; exit 1; }
# --guard mode: runs before registration, so it takes a plain path.
mkdir -p "$T/real/ayunis-core-backend"; printf 'REAL_SECRET\n' > "$T/real/ayunis-core-backend/.env.dev"

mkdir -p "$T/g-evil"; ln -s "$T/real/ayunis-core-backend" "$T/g-evil/ayunis-core-backend"
! "$SCRIPT" --guard "$T/g-evil" >/dev/null 2>&1 || { echo "FAIL: guard accepted a symlinked app dir"; exit 1; }
grep -qx REAL_SECRET "$T/real/ayunis-core-backend/.env.dev" || { echo "FAIL: guard deleted the real .env.dev through the symlink"; exit 1; }

mkdir -p "$T/real/.dev/slot-1" "$T/g-devlink/ayunis-core-backend"; ln -s "$T/real/.dev" "$T/g-devlink/.dev"
! "$SCRIPT" --guard "$T/g-devlink" >/dev/null 2>&1 || { echo "FAIL: guard accepted a symlinked .dev"; exit 1; }
[ -d "$T/real/.dev/slot-1" ]                 || { echo "FAIL: guard removed the user's .dev through the link"; exit 1; }

mkdir -p "$T/g-ok/ayunis-core-backend" "$T/g-ok/.dev/slot-7"
printf '1\n' > "$T/g-ok/.dev/slot-7/backend.pid"; printf 'STALE\n' > "$T/g-ok/ayunis-core-backend/.env.dev"
mkdir -p "$T/outside-home"; ln -s "$T/outside-home" "$T/g-ok/ayunis-core-backend/.env"   # .env as a link to a dir
"$SCRIPT" --guard "$T/g-ok" >/dev/null || { echo "FAIL: guard rejected a clean worktree"; exit 1; }
[ ! -e "$T/g-ok/ayunis-core-backend/.env" ]  || { echo "FAIL: guard left a shipped .env symlink in place"; exit 1; }
[ -d "$T/outside-home" ]                     || { echo "FAIL: guard followed the .env symlink and removed its target"; exit 1; }
ln -sfn "$T/real/ayunis-core-backend/.env.dev" "$T/g-ok/ayunis-core-backend/.env"   # the skill's next step, post-guard
[ -z "$(ls -A "$T/outside-home")" ]          || { echo "FAIL: linking .env wrote inside the shipped symlink's target"; exit 1; }
[ ! -e "$T/g-ok/.dev" ]                      || { echo "FAIL: guard left the branch's .dev in place"; exit 1; }
[ ! -e "$T/g-ok/ayunis-core-backend/.env.dev" ] || { echo "FAIL: guard left the branch's .env.dev in place"; exit 1; }
[ -d "$T/g-ok/ayunis-core-backend" ]         || { echo "FAIL: guard removed a real app dir"; exit 1; }

echo "OK: qa-teardown"
