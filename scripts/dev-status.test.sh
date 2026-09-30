#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEST_DIR="$(cd "$(mktemp -d "${TMPDIR:-/tmp}/ayunis-dev-status.XXXXXX")" && pwd)"   # normalised like dev's REPO_DIR

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
if [[ -n "${FAKE_SLOT_OWNER:-}" && "$*" == "ps -q --filter label=com.docker.compose.project="* ]]; then
  echo fakecontainer
  exit 0
fi
if [[ -n "${FAKE_SLOT_OWNER:-}" && "$1" = "inspect" ]]; then
  printf '%s\n' "$FAKE_SLOT_OWNER"
  exit 0
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
if [[ "$*" == *"-d cwd"* ]]; then
  [[ -n "${FAKE_PROC_CWD:-}" ]] && echo "n$FAKE_PROC_CWD"
  exit 0
fi
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

# The termination walk enumerates descendants of the pidfile pid, so clearing
# the marker here stands in for the surviving leaf process dying.
cat > "$TEST_DIR/bin/pgrep" <<'EOF'
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
  "$TEST_DIR/bin/pgrep" \
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

: > "$TEST_DIR/default-docker-calls"
set +e
output="$(
  PATH="$TEST_DIR/bin:$PATH" \
    AYUNIS_NO_INFISICAL=1 \
    FAKE_BACKEND_SESSION=1 \
    FAKE_BACKEND_READY="$TEST_DIR/backend-ready" \
    FAKE_DOCKER_CALLS="$TEST_DIR/default-docker-calls" \
    FAKE_PNPM_CALLS="$TEST_DIR/pnpm-calls" \
    FAKE_TMUX_CALLS="$TEST_DIR/tmux-calls" \
    FAKE_PROC_CWD="$UP_DIR" \
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

if grep -F -- ' up -d --build --wait ' "$TEST_DIR/default-docker-calls" | grep -Fq -- ' anonymize'; then
  printf 'Expected dev up to omit anonymize by default.\n' >&2
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
    FAKE_PROC_CWD="$SURVIVOR_DIR" \
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
    FAKE_PROC_CWD="$UP_DIR" \
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
    FAKE_PROC_CWD="$UP_DIR" \
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

set +e
output="$(
  PATH="$TEST_DIR/bin:$PATH" \
    FAKE_LISTENER_PID=999997 \
    FAKE_LISTENER_PORT=3970 \
    FAKE_XARGS_CALLS="$TEST_DIR/xargs-calls" \
    "$DOWN_DIR/dev" down 2>&1
)"
status=$?
set -e

if [[ -s "$TEST_DIR/xargs-calls" ]]; then
  printf 'Expected dev down not to kill an unmanaged listener on the slot port.\n' >&2
  failures=$((failures + 1))
fi

if [[ $status -eq 0 || "$output" != *"Backend port 3970 (PID 999997)"* ]]; then
  printf 'Expected dev down to fail loudly while a slot port is still held.\n%s\n' "$output" >&2
  failures=$((failures + 1))
fi

# A real process chain: `dev down` must reach the grandchild, which is where the
# port-owning node process actually sits. Only docker and lsof are faked here so
# the kill runs against real pgrep/ps/kill.
TREE_DIR="$TEST_DIR/tree"
mkdir -p "$TREE_DIR/.dev/slot-97" "$TREE_DIR/bin"
cp "$REPO_DIR/dev" "$TREE_DIR/dev"
chmod +x "$TREE_DIR/dev"
printf '97\n' > "$TREE_DIR/.dev/slot"
cp "$TEST_DIR/bin/docker" "$TREE_DIR/bin/docker"
printf '#!/usr/bin/env bash\n[[ "$*" == *"-d cwd"* && -n "${FAKE_PROC_CWD:-}" ]] && echo "n$FAKE_PROC_CWD"\nexit 0\n' > "$TREE_DIR/bin/lsof"
chmod +x "$TREE_DIR/bin/lsof"

# The trailing `:` in each layer stops bash from exec-collapsing the level away.
mkdir -p "$TREE_DIR/ayunis-core-backend"   # production shape: _start_detached cds into a package dir
bash -c "cd '$TREE_DIR/ayunis-core-backend' && bash -c 'sleep 300; :' ; :" &
tree_root=$!
disown "$tree_root" 2>/dev/null || true
printf '%s\n' "$tree_root" > "$TREE_DIR/.dev/slot-97/backend.pid"

tree_leaf=""
for _ in 1 2 3 4 5 6 7 8 9 10; do
  tree_middle="$(pgrep -P "$tree_root" 2>/dev/null | head -n 1 || true)"
  if [[ -n "$tree_middle" ]]; then
    tree_leaf="$(pgrep -P "$tree_middle" 2>/dev/null | head -n 1 || true)"
    [[ -n "$tree_leaf" ]] && break
  fi
  sleep 0.2
done

if [[ -z "$tree_leaf" ]]; then
  printf 'Test setup failed: could not build a three-level process chain.\n' >&2
  failures=$((failures + 1))
else
  PATH="$TREE_DIR/bin:$PATH" "$TREE_DIR/dev" down >/dev/null 2>&1 || true
  if kill -0 "$tree_leaf" 2>/dev/null; then
    printf 'Expected dev down to terminate the grandchild holding the port (PID %s survived).\n' \
      "$tree_leaf" >&2
    failures=$((failures + 1))
    kill -9 "$tree_leaf" 2>/dev/null || true
  fi
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

WITH_ANONYMISATION_DIR="$TEST_DIR/with-anonymisation"
mkdir -p \
  "$WITH_ANONYMISATION_DIR/.dev" \
  "$WITH_ANONYMISATION_DIR/ayunis-core-backend" \
  "$WITH_ANONYMISATION_DIR/ayunis-core-frontend" \
  "$WITH_ANONYMISATION_DIR/ayunis-core-code-execution/sandbox"
cp "$REPO_DIR/dev" "$WITH_ANONYMISATION_DIR/dev"
chmod +x "$WITH_ANONYMISATION_DIR/dev"
printf '97\n' > "$WITH_ANONYMISATION_DIR/.dev/slot"
: > "$TEST_DIR/with-anonymisation-docker-calls"
rm -f "$TEST_DIR/with-anonymisation-ready" "$TEST_DIR/with-anonymisation-ready.frontend"

set +e
output="$(
  PATH="$TEST_DIR/bin:$PATH" \
    AYUNIS_NO_INFISICAL=1 \
    FAKE_BACKEND_READY="$TEST_DIR/with-anonymisation-ready" \
    FAKE_DOCKER_CALLS="$TEST_DIR/with-anonymisation-docker-calls" \
    "$WITH_ANONYMISATION_DIR/dev" up --with-anonymisation 2>&1
)"
status=$?
set -e

compose_up_call="$(grep -F -- ' up -d --build --wait ' "$TEST_DIR/with-anonymisation-docker-calls" || true)"
if [[ $status -ne 0 \
  || "$compose_up_call" != *" postgres "* \
  || "$compose_up_call" != *" anonymize"* ]]; then
  printf 'Expected --with-anonymisation to include anonymize.\n%s\nDocker calls:\n%s\n' \
    "$output" "$(cat "$TEST_DIR/with-anonymisation-docker-calls")" >&2
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

# Compose project names are global: `dev down` must not stop containers that
# another checkout started under the same slot number.
OWNER_DIR="$TEST_DIR/owner"
mkdir -p "$OWNER_DIR/.dev/slot-97"
cp "$REPO_DIR/dev" "$OWNER_DIR/dev"
chmod +x "$OWNER_DIR/dev"
printf '97\n' > "$OWNER_DIR/.dev/slot"
: > "$TEST_DIR/owner-docker-calls"

set +e
output="$(
  PATH="$TEST_DIR/bin:$PATH" \
    FAKE_SLOT_OWNER=/elsewhere/checkout \
    FAKE_DOCKER_CALLS="$TEST_DIR/owner-docker-calls" \
    "$OWNER_DIR/dev" down 2>&1
)"
status=$?
set -e

if [[ $status -ne 0 || "$output" != *"started from /elsewhere/checkout"* ]] \
  || grep -Eq '(^| )down( |$)' "$TEST_DIR/owner-docker-calls"; then
  printf 'Expected dev down to leave containers started by another checkout running.\n%s\n' "$output" >&2
  failures=$((failures + 1))
fi

# …but containers this checkout started are still stopped.
: > "$TEST_DIR/owner-docker-calls"
output="$(
  PATH="$TEST_DIR/bin:$PATH" \
    FAKE_SLOT_OWNER="$(cd "$OWNER_DIR" && pwd)" \
    FAKE_DOCKER_CALLS="$TEST_DIR/owner-docker-calls" \
    "$OWNER_DIR/dev" down 2>&1
)"
if ! grep -Eq '(^| )down( |$)' "$TEST_DIR/owner-docker-calls"; then
  printf 'Expected dev down to stop containers this checkout started.\n%s\n' "$output" >&2
  failures=$((failures + 1))
fi

# A slot value is used in arithmetic; a non-integer must die before it is evaluated.
SLOT_DIR="$TEST_DIR/slot"
mkdir -p "$SLOT_DIR"
cp "$REPO_DIR/dev" "$SLOT_DIR/dev"
chmod +x "$SLOT_DIR/dev"
set +e
output="$(PATH="$TEST_DIR/bin:$PATH" "$SLOT_DIR/dev" status --slot 'x[$(touch '"$TEST_DIR"'/pwned)]' 2>&1)"
status=$?
set -e
if [[ $status -eq 0 || -e "$TEST_DIR/pwned" || "$output" != *"non-negative integer"* ]]; then
  printf 'Expected dev to reject a non-integer slot before evaluating it.\n%s\n' "$output" >&2
  failures=$((failures + 1))
fi
if [[ -e "$SLOT_DIR/.dev/slot" ]]; then
  printf 'Expected a rejected --slot value not to be persisted (saved: %s).\n' \
    "$(cat "$SLOT_DIR/.dev/slot")" >&2
  failures=$((failures + 1))
fi

# A forged pid file (untrusted branch) must not get an unrelated process, or
# process group 0, signalled.
FORGE_DIR="$TEST_DIR/forge"
mkdir -p "$FORGE_DIR/.dev/slot-97" "$FORGE_DIR/bin"
cp "$REPO_DIR/dev" "$FORGE_DIR/dev"
chmod +x "$FORGE_DIR/dev"
printf '97\n' > "$FORGE_DIR/.dev/slot"
cp "$TEST_DIR/bin/docker" "$FORGE_DIR/bin/docker"
printf '#!/usr/bin/env bash\nexit 0\n' > "$FORGE_DIR/bin/lsof"
chmod +x "$FORGE_DIR/bin/lsof"
(cd / && exec sleep 300) &
bystander=$!
disown "$bystander" 2>/dev/null || true
for forged in "$bystander" 0; do
  printf '%s\n' "$forged" > "$FORGE_DIR/.dev/slot-97/backend.pid"
  set +e
  output="$(PATH="$FORGE_DIR/bin:$PATH" "$FORGE_DIR/dev" down 2>&1)"
  status=$?
  set -e
  if [[ $status -ne 0 || "$output" != *"not a process of this checkout"* ]]; then
    printf 'Expected dev down to refuse forged pid %s and still finish.\n%s\n' "$forged" "$output" >&2
    failures=$((failures + 1))
  fi
done
# A sibling checkout whose path merely has this one as a prefix must not match.
SIBLING="$FORGE_DIR-extra"
mkdir -p "$SIBLING"
bash -c "cd '$SIBLING'; sleep 300" &   # path stays in argv, so the cmdline fallback is exercised too
neighbour=$!
disown "$neighbour" 2>/dev/null || true
printf '%s\n' "$neighbour" > "$FORGE_DIR/.dev/slot-97/backend.pid"
set +e
output="$(PATH="$FORGE_DIR/bin:$PATH" "$FORGE_DIR/dev" down 2>&1)"
set -e
if ! kill -0 "$neighbour" 2>/dev/null; then
  printf 'Expected dev down to leave a sibling checkout (%s) alone.\n%s\n' "$SIBLING" "$output" >&2
  failures=$((failures + 1))
fi
kill -9 "$neighbour" 2>/dev/null || true

if ! kill -0 "$bystander" 2>/dev/null; then
  printf 'Expected dev down to leave a process outside this checkout alone (forged pid file).\n' >&2
  failures=$((failures + 1))
fi
kill -9 "$bystander" 2>/dev/null || true

# A checked-out branch can replace a tracked directory with a symlink; writes
# below it must not escape the checkout.
LINK_DIR="$TEST_DIR/linkdir"
mkdir -p "$LINK_DIR/.dev/slot-97" "$LINK_DIR/ayunis-core-frontend" "$TEST_DIR/outside"
cp "$REPO_DIR/dev" "$LINK_DIR/dev"
chmod +x "$LINK_DIR/dev"
printf '97\n' > "$LINK_DIR/.dev/slot"
printf 'REAL_SECRET\n' > "$TEST_DIR/outside/.env.dev"
ln -s "$TEST_DIR/outside" "$LINK_DIR/ayunis-core-backend"
set +e
output="$(PATH="$TEST_DIR/bin:$PATH" FAKE_INFRA_HEALTHY=1 \
  FAKE_BACKEND_READY="$TEST_DIR/linkdir-ready" "$LINK_DIR/dev" up 2>&1)"   # keep stub side effects inside TEST_DIR
status=$?
set -e
if [[ $status -eq 0 || "$output" != *"outside this checkout"* ]] \
  || ! grep -qx REAL_SECRET "$TEST_DIR/outside/.env.dev"; then
  printf 'Expected dev up to refuse writing .env.dev through a symlinked app dir.\n%s\n' "$output" >&2
  failures=$((failures + 1))
fi

# lsof reports physical paths: a checkout reached through a symlink must still
# recognise its own processes, or `dev down` silently stops stopping them.
LOGICAL="$TEST_DIR/logical-link"
ln -s "$TREE_DIR" "$LOGICAL"
mkdir -p "$TREE_DIR/.dev/slot-97"
sleep 300 &
phys_pid=$!
disown "$phys_pid" 2>/dev/null || true
printf '%s\n' "$phys_pid" > "$TREE_DIR/.dev/slot-97/backend.pid"
set +e
output="$(
  PATH="$TREE_DIR/bin:$PATH" \
    FAKE_PROC_CWD="$(cd "$TREE_DIR" && pwd -P)/ayunis-core-backend" \
    "$LOGICAL/dev" down 2>&1
)"
set -e
if [[ "$output" == *"not a process of this checkout"* ]] || kill -0 "$phys_pid" 2>/dev/null; then
  printf 'Expected a symlink-reached checkout to still own (and stop) its own server.\n%s\n' "$output" >&2
  failures=$((failures + 1))
  kill -9 "$phys_pid" 2>/dev/null || true
fi

# Tearing the tmux session down before deciding ownership would leave the pane
# process gone, the check unable to confirm anything, and the pnpm -> nest -> node
# tree orphaned. The pane here really dies with the session, so the tree kill must
# already have been authorised.
PANE_DIR="$TEST_DIR/pane"
mkdir -p "$PANE_DIR/.dev/slot-97" "$PANE_DIR/bin" "$PANE_DIR/ayunis-core-backend"
cp "$REPO_DIR/dev" "$PANE_DIR/dev"
chmod +x "$PANE_DIR/dev"
printf '97\n' > "$PANE_DIR/.dev/slot"
cp "$TEST_DIR/bin/docker" "$PANE_DIR/bin/docker"
# Real lsof reports nothing for a dead pid; the stub must too, or a pane killed
# before the ownership check would still look alive and the bug would hide.
cat > "$PANE_DIR/bin/lsof" <<'LSOF'
#!/usr/bin/env bash
if [[ "$*" == *"-d cwd"* && -n "${FAKE_PROC_CWD:-}" ]]; then
  probe=""
  prev=""
  for arg in "$@"; do [[ "$prev" == "-p" ]] && probe="$arg"; prev="$arg"; done
  [[ -n "$probe" ]] && kill -0 "$probe" 2>/dev/null && echo "n$FAKE_PROC_CWD"
fi
exit 0
LSOF
chmod +x "$PANE_DIR/bin/lsof"

# setpgrp: the chain gets its own process group, so the group-wide kill in
# _terminate_process_tree reaches the leaf without touching this test runner.
perl -e 'setpgrp(0,0); exec @ARGV' bash -c "cd '$PANE_DIR/ayunis-core-backend' && bash -c 'sleep 300; :' ; :" &
pane_root=$!
disown "$pane_root" 2>/dev/null || true
printf '%s\n' "$pane_root" > "$PANE_DIR/.dev/slot-97/backend.pid"

cat > "$PANE_DIR/bin/tmux" <<TMUX
#!/usr/bin/env bash
case "\$1" in
  has-session)  [[ "\$*" == *backend* ]] || exit 1 ;;
  list-panes)   [[ "\$*" == *backend* ]] && echo $pane_root ;;
  kill-session) [[ "\$*" == *backend* ]] && { kill -9 $pane_root 2>/dev/null; sleep 0.3; } ;;   # the pane dies with the session
esac
exit 0
TMUX
chmod +x "$PANE_DIR/bin/tmux"

pane_leaf=""
for _ in 1 2 3 4 5 6 7 8 9 10; do
  pane_mid="$(pgrep -P "$pane_root" 2>/dev/null | head -n 1 || true)"
  if [[ -n "$pane_mid" ]]; then
    pane_leaf="$(pgrep -P "$pane_mid" 2>/dev/null | head -n 1 || true)"
    [[ -n "$pane_leaf" ]] && break
  fi
  sleep 0.2
done

if [[ -z "$pane_leaf" ]]; then
  printf 'Test setup failed: could not build a pane process chain.\n' >&2
  failures=$((failures + 1))
else
  PATH="$PANE_DIR/bin:$PATH" FAKE_PROC_CWD="$PANE_DIR/ayunis-core-backend" \
    "$PANE_DIR/dev" down >/dev/null 2>&1 || true
  sleep 0.5
  if kill -0 "$pane_leaf" 2>/dev/null; then
    printf 'Expected the tree kill to still run when the pane dies with its tmux session (PID %s survived).\n' \
      "$pane_leaf" >&2
    failures=$((failures + 1))
    kill -9 "$pane_leaf" 2>/dev/null || true
  fi
fi

if [[ $failures -ne 0 ]]; then
  exit 1
fi

echo "dev script tests passed"
