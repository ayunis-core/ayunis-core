#!/usr/bin/env bash
# Database and MinIO backup script for Ayunis Core
# Intended to run on the host via cron.
#
# Required environment variables (sourced from ayunis-core-backend/.env):
#   POSTGRES_USER, POSTGRES_DB
#
# Optional environment variables:
#   BACKUP_DIR           — where to store backups (default: /opt/ayunis/backups)
#   BACKUP_RETENTION     — days to keep old backups (default: 30)
#   BACKUP_REMOTE        — rsync target for off-site copy (e.g. u123456@u123456.your-storagebox.de:backups/)
#   COMPOSE_PROJECT_NAME — override if different from directory name

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

# Source .env if POSTGRES_USER is not already set
if [ -z "${POSTGRES_USER:-}" ]; then
  ENV_FILE="$REPO_DIR/ayunis-core-backend/.env"
  if [ -f "$ENV_FILE" ]; then
    set -a
    # Filter out comments and empty lines before sourcing
    . <(grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$')
    set +a
  else
    echo "ERROR: $ENV_FILE not found and POSTGRES_USER not set" >&2
    exit 1
  fi
fi

BACKUP_DIR="${BACKUP_DIR:-/opt/ayunis/backups}"
RETENTION_DAYS="${BACKUP_RETENTION:-5}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Resolve the Docker Compose volume prefix
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-$(basename "$REPO_DIR" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9_-]//g')}"

mkdir -p "$BACKUP_DIR"

cleanup() {
  if [ "${BACKUP_COMPLETE:-}" != "true" ]; then
    echo "[$(date)] Backup failed, cleaning up partial files..." >&2
    rm -f "$BACKUP_DIR/postgres_${TIMESTAMP}.dump" "$BACKUP_DIR/minio_${TIMESTAMP}.tar.gz"
  fi
}
trap cleanup EXIT

echo "[$(date)] Starting backup..."

# --- Postgres ---
echo "[$(date)] Dumping Postgres..."
PG_DUMP="$BACKUP_DIR/postgres_${TIMESTAMP}.dump"
docker exec ayunis-postgres-prod \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom \
  > "$PG_DUMP"

# Verify the dump is non-empty and valid
if [ ! -s "$PG_DUMP" ]; then
  echo "[$(date)] ERROR: Postgres dump is empty!" >&2
  rm -f "$PG_DUMP"
  exit 1
fi
# Quick validation — pg_restore can list the TOC
docker exec -i ayunis-postgres-prod pg_restore --list < "$PG_DUMP" > /dev/null 2>&1 || {
  echo "[$(date)] ERROR: Postgres dump is corrupted!" >&2
  exit 1
}
echo "[$(date)] Postgres dump verified ($(du -h "$PG_DUMP" | cut -f1))"

# --- MinIO (object storage) ---
echo "[$(date)] Backing up MinIO data..."
MINIO_TAR="$BACKUP_DIR/minio_${TIMESTAMP}.tar.gz"
docker run --rm \
  -v "${COMPOSE_PROJECT_NAME}_minio-data:/data:ro" \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/minio_${TIMESTAMP}.tar.gz" -C /data .

if [ ! -s "$MINIO_TAR" ]; then
  echo "[$(date)] WARNING: MinIO backup is empty (volume may have no data)" >&2
fi

# --- Prune old backups ---
echo "[$(date)] Pruning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "postgres_*.dump" -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name "minio_*.tar.gz" -mtime +"$RETENTION_DAYS" -delete

BACKUP_COMPLETE="true"

# --- Off-site copy (optional) ---
if [ -n "${BACKUP_REMOTE:-}" ]; then
  echo "[$(date)] Syncing to remote: $BACKUP_REMOTE"
  rsync -az "$BACKUP_DIR/" "$BACKUP_REMOTE" || {
    echo "[$(date)] WARNING: Off-site sync failed (local backup is safe)" >&2
  }
fi

echo "[$(date)] Backup completed: postgres_${TIMESTAMP}.dump, minio_${TIMESTAMP}.tar.gz"
