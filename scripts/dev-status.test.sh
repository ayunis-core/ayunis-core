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
if [[ -n "${FAKE_DOCKER_CALLS:-}" ]]; then
  printf '%s\n' "$*" >> "$FAKE_DOCKER_CALLS"
fi
if [[ "${FAKE_INFRA_HEALTHY:-0}" = "1" && "$*" == *" config --services"* ]]; then
  printf '%s\n' postgres minio mailcatcher docker-socket-proxy code-execution anonymize redis gotenberg
fi
if [[ "${FAKE_INFRA_HEALTHY:-0}" = "1" && "$*" == *" ps --format"* ]]; then
  printf '%s\n' \
    'postgres|running|healthy' \
    'minio|running|healthy' \
    'mailcatcher|running|' \
    'docker-socket-proxy|running|' \
    'code-execution|running|healthy' \
    'anonymize|running|healthy' \
    'redis|running|healthy' \
    'gotenberg|running|healthy'
fi
exit 0
EOF

cat > "$TEST_DIR/bin/curl" <<'EOF'
#!/usr/bin/env bash
url="${*: -1}"
if [[ "$url" == *":3971"* && -n "${FAKE_FRONTEND_READY:-}" ]]; then
  [[ -f "$FAKE_FRONTEND_READY" ]]
  exit
fi
if [[ "$url" == *":3971"* && -n "${FAKE_BACKEND_READY:-}" ]]; then
  [[ -f "$FAKE_BACKEND_READY.frontend" ]]
  exit
fi
if [[ -n "${FAKE_BACKEND_READY:-}" ]]; then
  [[ -f "$FAKE_BACKEND_READY" ]]
  exit
fi
exit "${FAKE_CURL_EXIT:-1}"
EOF

cat > "$TEST_DIR/bin/lsof" <<'EOF'
#!/usr/bin/env bash
if [[ -n "${FAKE_SURVIVING_LISTENER:-}" \
  && -f "$FAKE_SURVIVING_LISTENER" \
  && "$*" == *":3970"* ]]; then
  echo 999998
  exit
fi
IFS=',' read -r -a ports <<< "${FAKE_LISTENER_PORTS:-${FAKE_LISTENER_PORT:-3970}}"
for port in "${ports[@]}"; do
  if [[ -n "${FAKE_LISTENER_PID:-}" \
    && ( "$*" == *"TCP:$port"* || "$*" == *":$port"* ) ]]; then
    echo "$FAKE_LISTENER_PID"
    exit
  fi
done
if [[ "$*" == *":3970"* \
  && -n "${FAKE_BACKEND_READY:-}" \
  && -f "$FAKE_BACKEND_READY" ]]; then
  echo 999998
fi
if [[ "$*" == *":3971"* ]]; then
  if [[ -n "${FAKE_FRONTEND_READY:-}" && -f "$FAKE_FRONTEND_READY" ]]; then
    echo 999998
  elif [[ -z "${FAKE_FRONTEND_READY:-}" && -f "${FAKE_BACKEND_READY:-missing}.frontend" ]]; then
    echo 999998
  fi
fi
EOF

cat > "$TEST_DIR/bin/xargs" <<'EOF'
#!/usr/bin/env bash
if [[ -n "${FAKE_XARGS_CALLS:-}" ]]; then
  printf '%s\n' "$*" >> "$FAKE_XARGS_CALLS"
fi
cat >/dev/null
EOF

cat > "$TEST_DIR/bin/pkill" <<'EOF'
#!/usr/bin/env bash
if [[ -n "${FAKE_SURVIVING_LISTENER:-}" && "$*" == *"-P 999998"* ]]; then
  rm -f "$FAKE_SURVIVING_LISTENER"
fi
exit 0
EOF

chmod +x \
  "$TEST_DIR/bin/docker" \
  "$TEST_DIR/bin/curl" \
  "$TEST_DIR/bin/lsof" \
  "$TEST_DIR/bin/pkill" \
  "$TEST_DIR/bin/xargs"

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
if [[ -n "${FAKE_TMUX_CALLS:-}" ]]; then
  printf '%s\n' "$*" >> "$FAKE_TMUX_CALLS"
fi
case "$1" in
  has-session)
    if [[ "$*" == *backend* ]]; then
      [[ "${FAKE_BACKEND_SESSION:-0}" = "1" || -f "${FAKE_BACKEND_READY:-missing}" ]]
    elif [[ "$*" == *frontend* ]]; then
      [[ -f "${FAKE_FRONTEND_READY:-${FAKE_BACKEND_READY:-missing}.frontend}" ]]
    else
      exit 1
    fi
    ;;
  kill-session)
    exit 0
    ;;
  new-session)
    if [[ "$*" == *ayunis-core-backend* ]]; then
      : > "$FAKE_BACKEND_READY"
    elif [[ "$*" == *ayunis-core-frontend* ]]; then
      if [[ -n "${FAKE_FRONTEND_READY:-}" ]]; then
        [[ "${FAKE_FRONTEND_STARTS_READY:-0}" = "1" ]] && : > "$FAKE_FRONTEND_READY"
      else
        : > "$FAKE_BACKEND_READY.frontend"
      fi
    fi
    exit 0
    ;;
  list-panes)
    echo 999998
    ;;
esac
EOF

cat > "$TEST_DIR/bin/pnpm" <<'EOF'
#!/usr/bin/env bash
if [[ -n "${FAKE_PNPM_CALLS:-}" ]]; then
  printf '%s\n' "$*" >> "$FAKE_PNPM_CALLS"
fi
if [[ "$1" = "install" && -n "${FAKE_PNPM_INSTALL_EXIT:-}" ]]; then
  exit "$FAKE_PNPM_INSTALL_EXIT"
fi
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
    FAKE_PNPM_CALLS="$TEST_DIR/pnpm-calls" \
    FAKE_TMUX_CALLS="$TEST_DIR/tmux-calls" \
    "$UP_DIR/dev" up 2>&1
)"
status=$?
set -e

if [[ $status -ne 0 || "$output" != *"Restarting unhealthy Backend"* ]]; then
  printf 'Expected dev up to restart a managed backend that is alive but unhealthy.\n%s\n' "$output" >&2
  failures=$((failures + 1))
fi

up_repo_dir="$(cd "$UP_DIR" && pwd)"
checkout_id="$(printf '%s' "$up_repo_dir" | cksum | cut -d' ' -f1)"
if ! grep -Fq -- "ayunis-dev-97-$checkout_id-backend" "$TEST_DIR/tmux-calls"; then
  printf 'Expected tmux session ownership to include the checkout identity.\n' >&2
  failures=$((failures + 1))
fi

if ! grep -Fq -- 'install --frozen-lockfile' "$TEST_DIR/pnpm-calls" 2>/dev/null; then
  printf 'Expected dev up to synchronize workspace dependencies with a frozen-lockfile install.\n' >&2
  failures=$((failures + 1))
fi

SURVIVOR_DIR="$TEST_DIR/survivor"
mkdir -p \
  "$SURVIVOR_DIR/.dev/slot-97" \
  "$SURVIVOR_DIR/ayunis-core-backend" \
  "$SURVIVOR_DIR/ayunis-core-frontend" \
  "$SURVIVOR_DIR/ayunis-core-code-execution/sandbox"
cp "$REPO_DIR/dev" "$SURVIVOR_DIR/dev"
chmod +x "$SURVIVOR_DIR/dev"
printf '97\n' > "$SURVIVOR_DIR/.dev/slot"
printf '999998\n' > "$SURVIVOR_DIR/.dev/slot-97/backend.pid"
: > "$TEST_DIR/surviving-listener"
rm -f "$TEST_DIR/survivor-ready" "$TEST_DIR/survivor-ready.frontend"

set +e
output="$(
  PATH="$TEST_DIR/bin:$PATH" \
    AYUNIS_NO_INFISICAL=1 \
    FAKE_BACKEND_SESSION=1 \
    FAKE_BACKEND_READY="$TEST_DIR/survivor-ready" \
    FAKE_SURVIVING_LISTENER="$TEST_DIR/surviving-listener" \
    "$SURVIVOR_DIR/dev" up 2>&1
)"
status=$?
set -e

if [[ $status -ne 0 || -f "$TEST_DIR/surviving-listener" ]]; then
  printf 'Expected dev up to clean up a listener that survives tmux session termination.\n%s\n' "$output" >&2
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

rm -f \
  "$TEST_DIR/backend-ready" \
  "$TEST_DIR/backend-ready.frontend" \
  "$TEST_DIR/frontend-ready"
printf '999999\n' > "$UP_DIR/.dev/slot-97/backend.pid"
set +e
output="$(
  PATH="$TEST_DIR/bin:$PATH" \
    AYUNIS_NO_INFISICAL=1 \
    FAKE_BACKEND_SESSION=1 \
    FAKE_BACKEND_READY="$TEST_DIR/backend-ready" \
    FAKE_FRONTEND_READY="$TEST_DIR/frontend-ready" \
    "$UP_DIR/dev" up 2>&1
)"
status=$?
set -e

if [[ $status -eq 0 || "$output" != *"Frontend did not become healthy"* ]]; then
  printf 'Expected dev up to wait for frontend readiness before reporting success.\n%s\n' "$output" >&2
  failures=$((failures + 1))
fi

HEALTHY_DIR="$TEST_DIR/healthy"
mkdir -p \
  "$HEALTHY_DIR/.dev/slot-97" \
  "$HEALTHY_DIR/ayunis-core-backend" \
  "$HEALTHY_DIR/ayunis-core-frontend" \
  "$HEALTHY_DIR/ayunis-core-code-execution/sandbox"
cp "$REPO_DIR/dev" "$HEALTHY_DIR/dev"
chmod +x "$HEALTHY_DIR/dev"
printf '97\n' > "$HEALTHY_DIR/.dev/slot"
printf '%s\n' "$$" > "$HEALTHY_DIR/.dev/slot-97/backend.pid"
printf '%s\n' "$$" > "$HEALTHY_DIR/.dev/slot-97/frontend.pid"
: > "$TEST_DIR/docker-calls"
: > "$TEST_DIR/pnpm-healthy-calls"

set +e
output="$(
  PATH="$TEST_DIR/bin:$PATH" \
    AYUNIS_NO_INFISICAL=1 \
    FAKE_CURL_EXIT=0 \
    FAKE_DOCKER_CALLS="$TEST_DIR/docker-calls" \
    FAKE_INFRA_HEALTHY=1 \
    FAKE_LISTENER_PID="$$" \
    FAKE_LISTENER_PORTS=3970,3971 \
    FAKE_PNPM_CALLS="$TEST_DIR/pnpm-healthy-calls" \
    "$HEALTHY_DIR/dev" up 2>&1
)"
status=$?
set -e

if [[ $status -ne 0 \
  || "$output" != *"Backend already running"* \
  || "$output" != *"Frontend already running"* ]]; then
  printf 'Expected dev up to preserve an already-healthy stack.\n%s\n' "$output" >&2
  failures=$((failures + 1))
fi
if grep -Eq '(^| )build( |$)|up -d --build' "$TEST_DIR/docker-calls"; then
  printf 'Expected the already-healthy path not to rebuild Docker services.\n' >&2
  failures=$((failures + 1))
fi
if grep -Fq -- 'migration:run:dev' "$TEST_DIR/pnpm-healthy-calls"; then
  printf 'Expected the already-healthy path not to rerun migrations.\n' >&2
  failures=$((failures + 1))
fi

DOWN_DIR="$TEST_DIR/down"
mkdir -p "$DOWN_DIR/.dev/slot-97"
cp "$REPO_DIR/dev" "$DOWN_DIR/dev"
chmod +x "$DOWN_DIR/dev"
printf '97\n' > "$DOWN_DIR/.dev/slot"
: > "$TEST_DIR/xargs-calls"

output="$(PATH="$TEST_DIR/bin:$PATH" "$DOWN_DIR/dev" status)"
if [[ "$output" != *"Backend:   stopped"* || "$output" != *"Frontend:  stopped"* ]]; then
  printf 'Expected status to report services without a managed process as stopped.\n%s\n' "$output" >&2
  failures=$((failures + 1))
fi

output="$(
  PATH="$TEST_DIR/bin:$PATH" \
    FAKE_LISTENER_PID=999997 \
    FAKE_LISTENER_PORT=3970 \
    "$DOWN_DIR/dev" status
)"
if [[ "$output" != *"Backend:   stopped  port 3970 occupied by unmanaged PID 999997"* ]]; then
  printf 'Expected status to expose an unmanaged listener occupying a stopped service port.\n%s\n' "$output" >&2
  failures=$((failures + 1))
fi

PATH="$TEST_DIR/bin:$PATH" \
  FAKE_LISTENER_PID=999997 \
  FAKE_LISTENER_PORT=3970 \
  FAKE_XARGS_CALLS="$TEST_DIR/xargs-calls" \
  "$DOWN_DIR/dev" down >/dev/null 2>&1

if [[ -s "$TEST_DIR/xargs-calls" ]]; then
  printf 'Expected dev down not to kill an unmanaged listener on the slot port.\n' >&2
  failures=$((failures + 1))
fi

set +e
output="$(
  PATH="$TEST_DIR/bin:$PATH" \
    FAKE_PNPM_INSTALL_EXIT=1 \
    "$DOWN_DIR/dev" up 2>&1
)"
status=$?
set -e

if [[ $status -eq 0 || "$output" != *"pnpm install --frozen-lockfile"* ]]; then
  printf 'Expected dependency repair failures to include the exact recovery command.\n%s\n' "$output" >&2
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
