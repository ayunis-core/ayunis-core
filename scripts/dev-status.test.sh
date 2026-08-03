#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEST_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ayunis-dev-status.XXXXXX")"

cleanup() {
  rm -rf "$TEST_DIR"
}
trap cleanup EXIT

mkdir -p "$TEST_DIR/.dev/slot-97" "$TEST_DIR/bin"
cp "$REPO_DIR/dev" "$TEST_DIR/dev"
chmod +x "$TEST_DIR/dev"
printf '97\n' > "$TEST_DIR/.dev/slot"
printf '%s\n' "$$" > "$TEST_DIR/.dev/slot-97/backend.pid"

cat > "$TEST_DIR/bin/docker" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF

cat > "$TEST_DIR/bin/curl" <<'EOF'
#!/usr/bin/env bash
if [[ -n "${FAKE_BACKEND_READY:-}" ]]; then
  [[ -f "$FAKE_BACKEND_READY" ]]
  exit
fi
exit "${FAKE_CURL_EXIT:-1}"
EOF

cat > "$TEST_DIR/bin/lsof" <<'EOF'
#!/usr/bin/env bash
if [[ -n "${FAKE_LISTENER_PID:-}" && "$*" == *"TCP:${FAKE_LISTENER_PORT:-3970}"* ]]; then
  echo "$FAKE_LISTENER_PID"
fi
EOF

chmod +x "$TEST_DIR/bin/docker" "$TEST_DIR/bin/curl" "$TEST_DIR/bin/lsof"

failures=0

output="$(PATH="$TEST_DIR/bin:$PATH" FAKE_CURL_EXIT=1 "$TEST_DIR/dev" status)"
if [[ "$output" != *"Backend:   unhealthy"* ]]; then
  printf 'Expected an alive backend process without a health response to be unhealthy.\n%s\n' "$output" >&2
  failures=$((failures + 1))
fi

output="$(
  PATH="$TEST_DIR/bin:$PATH" \
    FAKE_CURL_EXIT=0 \
    FAKE_LISTENER_PID="$$" \
    "$TEST_DIR/dev" status
)"
if [[ "$output" != *"Backend:   running"* ]]; then
  printf 'Expected a healthy backend process to be running.\n%s\n' "$output" >&2
  failures=$((failures + 1))
fi

output="$(
  PATH="$TEST_DIR/bin:$PATH" \
    FAKE_CURL_EXIT=0 \
    FAKE_LISTENER_PID=999997 \
    "$TEST_DIR/dev" status
)"
if [[ "$output" != *"Backend:   unhealthy"* ]]; then
  printf 'Expected a healthy response from an unmanaged listener to be unhealthy.\n%s\n' "$output" >&2
  failures=$((failures + 1))
fi

UP_DIR="$TEST_DIR/up"
mkdir -p \
  "$UP_DIR/.dev/slot-97" \
  "$UP_DIR/ayunis-core-backend" \
  "$UP_DIR/ayunis-core-frontend" \
  "$UP_DIR/ayunis-core-code-execution/sandbox"
cp "$REPO_DIR/dev" "$UP_DIR/dev"
chmod +x "$UP_DIR/dev"
printf '97\n' > "$UP_DIR/.dev/slot"
printf '999999\n' > "$UP_DIR/.dev/slot-97/backend.pid"

cat > "$TEST_DIR/bin/tmux" <<'EOF'
#!/usr/bin/env bash
case "$1" in
  has-session)
    [[ "${FAKE_BACKEND_SESSION:-0}" = "1" && "$*" == *backend* ]]
    ;;
  kill-session)
    exit 0
    ;;
  new-session)
    if [[ "$*" == *ayunis-core-backend* ]]; then
      : > "$FAKE_BACKEND_READY"
    fi
    ;;
  list-panes)
    echo 999998
    ;;
esac
EOF

cat > "$TEST_DIR/bin/pnpm" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF

cat > "$TEST_DIR/bin/openssl" <<'EOF'
#!/usr/bin/env bash
echo test-secret
EOF

cat > "$TEST_DIR/bin/sleep" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF

chmod +x \
  "$TEST_DIR/bin/tmux" \
  "$TEST_DIR/bin/pnpm" \
  "$TEST_DIR/bin/openssl" \
  "$TEST_DIR/bin/sleep"

set +e
output="$(
  PATH="$TEST_DIR/bin:$PATH" \
    AYUNIS_NO_INFISICAL=1 \
    FAKE_BACKEND_SESSION=1 \
    FAKE_BACKEND_READY="$TEST_DIR/backend-ready" \
    FAKE_LISTENER_PID=999999 \
    "$UP_DIR/dev" up 2>&1
)"
status=$?
set -e

if [[ $status -ne 0 || "$output" != *"Restarting unhealthy Backend"* ]]; then
  printf 'Expected dev up to restart a managed backend that is alive but unhealthy.\n%s\n' "$output" >&2
  failures=$((failures + 1))
fi

rm -f "$TEST_DIR/backend-ready"
printf '999999\n' > "$UP_DIR/.dev/slot-97/backend.pid"
set +e
output="$(
  PATH="$TEST_DIR/bin:$PATH" \
    AYUNIS_NO_INFISICAL=1 \
    FAKE_BACKEND_SESSION=1 \
    FAKE_BACKEND_READY="$TEST_DIR/backend-ready" \
    FAKE_LISTENER_PID=999997 \
    "$UP_DIR/dev" up 2>&1
)"
status=$?
set -e

if [[ $status -eq 0 || "$output" != *"not managed by this checkout"* ]]; then
  printf 'Expected dev up to refuse to terminate an unmanaged listener.\n%s\n' "$output" >&2
  failures=$((failures + 1))
fi

LOGIN_DIR="$TEST_DIR/login"
mkdir -p \
  "$LOGIN_DIR/.dev" \
  "$LOGIN_DIR/ayunis-core-backend" \
  "$LOGIN_DIR/ayunis-core-frontend" \
  "$LOGIN_DIR/ayunis-core-code-execution/sandbox"
cp "$REPO_DIR/dev" "$LOGIN_DIR/dev"
chmod +x "$LOGIN_DIR/dev"
printf '97\n' > "$LOGIN_DIR/.dev/slot"
cat > "$LOGIN_DIR/.infisical.json" <<'EOF'
{"workspaceId":"test-project","domain":"https://eu.infisical.com/api"}
EOF

cat > "$TEST_DIR/bin/infisical" <<'EOF'
#!/usr/bin/env bash
if [[ "$1 ${2:-}" = "login status" ]]; then
  [[ -f "$FAKE_INFISICAL_AUTH" ]]
  exit
fi
if [[ "$1" = "login" ]]; then
  : > "$FAKE_INFISICAL_AUTH"
  printf '%s\n' "$*" > "$FAKE_INFISICAL_LOGIN_CALLED"
  exit 0
fi
if [[ "$1" = "export" ]]; then
  [[ -f "$FAKE_INFISICAL_AUTH" ]] || exit 1
  printf '%s\n' \
    'MINIO_ACCESS_KEY=test-user' \
    'MINIO_SECRET_KEY=test-password' \
    'REDIS_PASSWORD=test-redis-password'
  exit 0
fi
exit 0
EOF
chmod +x "$TEST_DIR/bin/infisical"

rm -f "$TEST_DIR/backend-ready" "$TEST_DIR/infisical-auth" "$TEST_DIR/infisical-login-called"
set +e
output="$(
  PATH="$TEST_DIR/bin:$PATH" \
    FAKE_BACKEND_READY="$TEST_DIR/backend-ready" \
    FAKE_INFISICAL_AUTH="$TEST_DIR/infisical-auth" \
    FAKE_INFISICAL_LOGIN_CALLED="$TEST_DIR/infisical-login-called" \
    "$LOGIN_DIR/dev" up 2>&1
)"
status=$?
set -e

login_used_configured_domain=false
if [[ -f "$TEST_DIR/infisical-login-called" ]] \
  && grep -Fq -- '--domain=https://eu.infisical.com/api' "$TEST_DIR/infisical-login-called"; then
  login_used_configured_domain=true
fi

if [[ $status -ne 0 || "$login_used_configured_domain" != true || "$output" != *"Secrets:      Infisical"* ]]; then
  printf 'Expected dev up to log in after an expired Infisical session and retry startup.\n%s\n' "$output" >&2
  failures=$((failures + 1))
fi

if [[ $failures -ne 0 ]]; then
  exit 1
fi

echo "dev script tests passed"
