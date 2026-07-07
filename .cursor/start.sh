#!/usr/bin/env bash
# Cursor Cloud Agent — per-boot startup. Launches the native services and
# ensures the DB is migrated + seeded. Self-heals if the snapshot did not
# persist the Postgres cluster or the backend .env. Idempotent.
#
# Runs before Cursor starts the `terminals` (backend + frontend dev servers),
# so infra is ready by the time those boot.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

# Ensure the backend env exists (regenerated only if missing; secrets preserved).
[ -f "$REPO_DIR/ayunis-core-backend/.env" ] || write_env

# Bring up Postgres (initialise first if the snapshot didn't keep the cluster).
cluster_initialized || init_cluster
pg_start
bootstrap_db

start_redis
start_minio
wait_infra

# Idempotent: fast no-ops when already applied; heals a fresh cluster.
run_migrations
run_seed

echo "==> start.sh complete — infra ready on localhost (pg:5432 redis:6379 minio:9000)"
