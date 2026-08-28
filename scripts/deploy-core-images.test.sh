#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_SCRIPT="$REPO_DIR/scripts/deploy-core-images.sh"
TEST_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ayunis-deploy-core-images.XXXXXX")"
FAKE_BIN="$TEST_DIR/bin"
DOCKER_LOG="$TEST_DIR/docker.log"
COMPOSE_FILE_LOG="$TEST_DIR/compose-file.log"

cleanup() {
  rm -rf "$TEST_DIR"
}
trap cleanup EXIT

mkdir -p "$FAKE_BIN"

cat > "$FAKE_BIN/docker" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$FAKE_DOCKER_LOG"
if [[ "$1" == 'compose' ]]; then
  printf '%s\n' "${COMPOSE_FILE:-}" > "$FAKE_COMPOSE_FILE_LOG"
fi

if [[ "$*" == 'images --filter reference=ayunis-core-* --format {{.Repository}}:{{.Tag}}' ]]; then
  printf '%s\n' 'ayunis-core-app:latest'
elif [[ "$*" == 'images --filter reference=ghcr.io/ayunis-core/ayunis-core-* --format {{.Repository}}:{{.Tag}}' ]]; then
  printf '%s\n' \
    'ghcr.io/ayunis-core/ayunis-core-app:v-old' \
    'ghcr.io/ayunis-core/ayunis-core-app:v1.2.30' \
    'ghcr.io/ayunis-core/ayunis-core-python-sandbox:v-old' \
    "ghcr.io/ayunis-core/ayunis-core-app:${CORE_TAG}" \
    "ghcr.io/ayunis-core/ayunis-core-python-sandbox:${CORE_TAG}"
elif [[ "$*" == 'compose pull app code-execution anonymize' ]]; then
  exit "${FAKE_COMPOSE_PULL_EXIT:-0}"
elif [[ "$1" == 'pull' ]]; then
  exit "${FAKE_SANDBOX_PULL_EXIT:-0}"
fi
EOF

cat > "$FAKE_BIN/df" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' \
  'Avail' \
  "${FAKE_FREE_GB:-20}G"
EOF

cat > "$FAKE_BIN/timeout" <<'EOF'
#!/usr/bin/env bash
printf 'timeout %s\n' "$*" >> "$FAKE_DOCKER_LOG"
EOF

chmod +x "$FAKE_BIN/docker" "$FAKE_BIN/df" "$FAKE_BIN/timeout"

failures=0

fail() {
  printf '%s\n' "$1" >&2
  failures=$((failures + 1))
}

assert_log_order() {
  local before="$1"
  local after="$2"
  local before_line
  local after_line
  before_line=$(grep -nF "$before" "$DOCKER_LOG" | head -1 | cut -d: -f1)
  after_line=$(grep -nF "$after" "$DOCKER_LOG" | head -1 | cut -d: -f1)
  if [[ -z "$before_line" || -z "$after_line" || "$before_line" -ge "$after_line" ]]; then
    fail "Expected '$before' before '$after'."
  fi
}

run_deploy() {
  PATH="$FAKE_BIN:$PATH" \
    CORE_TAG=v1.2.3 \
    MIN_FREE_GB=9 \
    PRUNE_BUILD_CACHE="${PRUNE_BUILD_CACHE:-true}" \
    FAKE_DOCKER_LOG="$DOCKER_LOG" \
    FAKE_COMPOSE_FILE_LOG="$COMPOSE_FILE_LOG" \
    FAKE_FREE_GB="${FAKE_FREE_GB:-20}" \
    FAKE_COMPOSE_PULL_EXIT="${FAKE_COMPOSE_PULL_EXIT:-0}" \
    FAKE_SANDBOX_PULL_EXIT="${FAKE_SANDBOX_PULL_EXIT:-0}" \
    bash "$DEPLOY_SCRIPT"
}

: > "$DOCKER_LOG"
COMPOSE_FILE=unexpected-compose.yml run_deploy

assert_log_order 'builder prune -af' 'compose pull app code-execution anonymize'
assert_log_order 'compose pull app code-execution anonymize' 'compose down'
assert_log_order 'compose down' 'compose up -d --no-build'
assert_log_order 'compose up -d --no-build' 'timeout 120 bash -c'
if [[ "$(cat "$COMPOSE_FILE_LOG")" != 'docker-compose.yml:compose.release.yml' ]]; then
  fail "Expected the deploy script to force the release compose files."
fi

old_sandbox_removals=$(grep -F 'rmi ' "$DOCKER_LOG" | grep -Fc 'ghcr.io/ayunis-core/ayunis-core-python-sandbox:v-old' || true)
if [[ "$old_sandbox_removals" -ne 1 ]]; then
  fail "Expected the old sandbox to be preserved before pull and removed once after the swap."
fi
if grep -F 'rmi ' "$DOCKER_LOG" | tr ' ' '\n' | grep -Fxq 'ghcr.io/ayunis-core/ayunis-core-app:v1.2.3'; then
  fail "Expected the deployed tag to be preserved during cleanup."
fi
if ! grep -F 'rmi ' "$DOCKER_LOG" | tr ' ' '\n' | grep -Fxq 'ghcr.io/ayunis-core/ayunis-core-app:v1.2.30'; then
  fail "Expected a stale tag that extends the current tag to be removed."
fi

: > "$DOCKER_LOG"
PRUNE_BUILD_CACHE=false run_deploy
if grep -Fq 'builder prune -af' "$DOCKER_LOG"; then
  fail "Expected disabled build-cache pruning to preserve the cache."
fi

: > "$DOCKER_LOG"
set +e
output=$(FAKE_FREE_GB=5 run_deploy 2>&1)
status=$?
set -e
if [[ $status -eq 0 || "$output" != *'only 5G free, need 9G'* ]]; then
  fail "Expected low disk space to abort with a clear error."
fi
if grep -Eq '^compose (pull|down)' "$DOCKER_LOG"; then
  fail "Expected low disk space to abort before pull and shutdown."
fi

: > "$DOCKER_LOG"
set +e
output=$(FAKE_COMPOSE_PULL_EXIT=1 run_deploy 2>&1)
status=$?
set -e
if [[ $status -eq 0 || "$output" != *'image pull failed'* ]]; then
  fail "Expected a failed compose pull to abort the deploy."
fi
if grep -Fq 'compose down' "$DOCKER_LOG"; then
  fail "Expected a failed compose pull to preserve the running containers."
fi
if ! grep -F 'rmi ' "$DOCKER_LOG" | tr ' ' '\n' | grep -Fxq 'ghcr.io/ayunis-core/ayunis-core-app:v1.2.3'; then
  fail "Expected a failed pull to remove unused target-tagged compose images."
fi

: > "$DOCKER_LOG"
set +e
output=$(FAKE_SANDBOX_PULL_EXIT=1 run_deploy 2>&1)
status=$?
set -e
if [[ $status -eq 0 || "$output" != *'sandbox image pull failed'* ]]; then
  fail "Expected a failed sandbox pull to abort the deploy."
fi
if grep -Fq 'compose down' "$DOCKER_LOG"; then
  fail "Expected a failed sandbox pull to preserve the running containers."
fi

workflow_expectations=(
  'deploy-staging.yml:1'
  'deploy-production-manual.yml:1'
  'release-please.yml:1'
)

for expectation in "${workflow_expectations[@]}"; do
  workflow="${expectation%:*}"
  expected_calls="${expectation##*:}"
  workflow_path="$REPO_DIR/.github/workflows/$workflow"
  actual_calls=$(grep -Fc 'scripts/deploy-core-images.sh' "$workflow_path" || true)
  if [[ "$actual_calls" -ne "$expected_calls" ]]; then
    fail "Expected $workflow to reference the shared deploy script $expected_calls time(s), got $actual_calls."
  fi
  if grep -Fq 'docker compose pull app code-execution anonymize' "$workflow_path"; then
    fail "Expected $workflow to contain no inline Core image pull logic."
  fi
done

if ! grep -Fq 'MIN_FREE_GB=9 PRUNE_BUILD_CACHE=true bash scripts/deploy-core-images.sh' \
  "$REPO_DIR/.github/workflows/deploy-staging.yml"; then
  fail "Expected staging to reclaim the obsolete host build cache before its disk check."
fi
if grep -Fq 'deploy-internal:' "$REPO_DIR/.github/workflows/release-please.yml" \
  || grep -Fq 'INTERNAL_HOST' "$REPO_DIR/.github/workflows/release-please.yml"; then
  fail "Expected releases to leave Internal deployment to ayunis-infra."
fi
if ! grep -Fq 'DEPLOY_WORKFLOW_SHA: ${{ github.sha }}' \
  "$REPO_DIR/.github/workflows/deploy-production-manual.yml" \
  || ! grep -Fq 'DEPLOY_SCRIPT=$(git show "$DEPLOY_WORKFLOW_SHA":scripts/deploy-core-images.sh)' \
  "$REPO_DIR/.github/workflows/deploy-production-manual.yml" \
  || ! grep -Fq "printf '%s\n' \"\$DEPLOY_SCRIPT\" | MIN_FREE_GB=9 PRUNE_BUILD_CACHE=true bash" \
  "$REPO_DIR/.github/workflows/deploy-production-manual.yml"; then
  fail "Expected the production manual workflow to execute the workflow commit's shared script."
fi
if ! grep -Fq 'git checkout -f --detach "refs/tags/$RELEASE_TAG"' \
  "$REPO_DIR/.github/workflows/deploy-production-manual.yml" \
  || ! grep -Fq 'git checkout -f --detach "origin/$RELEASE_TAG"' \
  "$REPO_DIR/.github/workflows/deploy-production-manual.yml"; then
  fail "Expected the production manual workflow to use explicit tag and remote branch refs."
fi
release_tag_checkouts=$(grep -Fc 'git checkout -f --detach "refs/tags/$RELEASE_TAG"' \
  "$REPO_DIR/.github/workflows/release-please.yml" || true)
if [[ "$release_tag_checkouts" -ne 1 ]]; then
  fail "Expected the automated production release deploy to use an explicit tag ref."
fi
if ! grep -Fq 'bash scripts/deploy-core-images.test.sh' \
  "$REPO_DIR/.github/workflows/deploy-script-tests.yml" 2>/dev/null; then
  fail "Expected CI to execute the deploy regression tests."
fi

if [[ $failures -ne 0 ]]; then
  printf '\nDocker command log:\n' >&2
  cat "$DOCKER_LOG" >&2
  exit 1
fi

printf 'deploy core image tests passed\n'
