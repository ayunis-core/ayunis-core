#!/usr/bin/env bash
# Restore script for Ayunis Core backups
#
# Usage:
#   ./scripts/restore.sh <timestamp>
#
# Example:
#   ./scripts/restore.sh 20260210_030000
#
# This will restore from:
#   postgres_20260210_030000.dump
#   minio_20260210_030000.tar.gz
#
# Required environment variables (sourced from ayunis-core-backend/.env):
#   POSTGRES_USER, POSTGRES_DB
#
# Optional environment variables:
#   BACKUP_DIR           — where backups are stored (default: /opt/ayunis/backups)
#   COMPOSE_PROJECT_NAME — override if different from directory name

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

# Source .env if POSTGRES_USER is not already set
if [ -z "${POSTGRES_USER:-}" ]; then
  ENV_FILE="$REPO_DIR/ayunis-core-backend/.env"
  if [ -f "$ENV_FILE" ]; then
    set -a
    . <(grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$')
    set +a
  else
    echo "ERROR: $ENV_FILE not found and POSTGRES_USER not set" >&2
    exit 1
  fi
fi

BACKUP_DIR="${BACKUP_DIR:-/opt/ayunis/backups}"

COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-$(basename "$REPO_DIR" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9_-]//g')}"

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <timestamp>"
  echo ""
  echo "Available backups:"
  ls -1 "$BACKUP_DIR"/postgres_*.dump 2>/dev/null | sed 's/.*postgres_/  /;s/\.dump//' || echo "  (none)"
  exit 1
fi

TIMESTAMP="$1"
PG_DUMP="$BACKUP_DIR/postgres_${TIMESTAMP}.dump"
MINIO_TAR="$BACKUP_DIR/minio_${TIMESTAMP}.tar.gz"

# Validate files exist
for f in "$PG_DUMP" "$MINIO_TAR"; do
  if [ ! -f "$f" ]; then
    echo "ERROR: Backup file not found: $f"
    exit 1
  fi
done

echo "=== Ayunis Core Restore ==="
echo "Timestamp:  $TIMESTAMP"
echo "Postgres:   $PG_DUMP ($(du -h "$PG_DUMP" | cut -f1))"
echo "MinIO:      $MINIO_TAR ($(du -h "$MINIO_TAR" | cut -f1))"
echo "Project:    $COMPOSE_PROJECT_NAME"
echo ""
read -p "This will OVERWRITE current data. Continue? [y/N] " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

# --- Stop the app so there are no active DB connections ---
echo "[$(date)] Stopping app..."
cd "$REPO_DIR"
docker compose stop app 2>/dev/null || true

# --- Restore Postgres ---
# pg_restore --clean returns non-zero for non-fatal warnings (e.g., "role does not exist"),
# so we allow it to fail and verify the restore by checking the database has tables.
echo "[$(date)] Restoring Postgres..."
docker exec -i ayunis-postgres-prod \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    --clean --if-exists --single-transaction \
  < "$PG_DUMP" 2>&1 || true

# Verify restore produced tables
TABLE_COUNT=$(docker exec ayunis-postgres-prod \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
if [ "$TABLE_COUNT" -eq 0 ]; then
  echo "[$(date)] ERROR: Postgres restore failed — no tables found" >&2
  exit 1
fi
echo "[$(date)] Postgres restore verified ($TABLE_COUNT tables)"

# --- Restore MinIO ---
echo "[$(date)] Restoring MinIO data..."
docker compose stop minio 2>/dev/null || true
docker run --rm \
  -v "${COMPOSE_PROJECT_NAME}_minio-data:/data" \
  -v "$BACKUP_DIR":/backup \
  alpine sh -c "find /data -mindepth 1 -delete && tar xzf /backup/minio_${TIMESTAMP}.tar.gz -C /data"

# --- Restart services ---
echo "[$(date)] Starting services..."
docker compose start minio 2>/dev/null || true
docker compose start app 2>/dev/null || true

echo "[$(date)] Restore completed. Verify the application is working correctly."
echo "[$(date)] If services didn't restart, run: docker compose up -d"
