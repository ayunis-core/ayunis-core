#!/usr/bin/env bash
# Cursor Cloud Agent — one-time environment setup (snapshot-cached).
# MUST be idempotent: Cursor may re-run it on partially cached state.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

# Skip husky git hooks setup (root `prepare` runs `husky install` on install).
export HUSKY=0

cd "$REPO_DIR"

echo "==> Installing workspace dependencies (pnpm, frozen lockfile)"
pnpm install --frozen-lockfile

echo "==> Building internal libs required by the backend"
( cd ayunis-core-backend && pnpm run build:deps )

write_env

cluster_initialized || init_cluster
pg_start
bootstrap_db
run_migrations
run_seed

# Clean shutdown so the snapshot captures a consistent cluster.
pg_stop

echo "==> install.sh complete"
