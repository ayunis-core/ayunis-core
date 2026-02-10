#!/usr/bin/env bash
# Database and MinIO backup script for Ayunis Core
# Intended to run on the host via cron.
#
# Required environment variables (sourced from ayunis-core-backend/.env):
#   POSTGRES_USER, POSTGRES_DB
#
# Optional environment variables:
#   BACKUP_DIR        — where to store backups (default: /opt/ayunis/backups)
#   BACKUP_RETENTION  — days to keep old backups (default: 30)
#   BACKUP_REMOTE     — rsync target for off-site copy (e.g. u123456@u123456.your-storagebox.de:backups/)

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/ayunis/backups}"
RETENTION_DAYS="${BACKUP_RETENTION:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# --- Postgres ---
echo "[$(date)] Dumping Postgres..."
docker exec ayunis-postgres-prod \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom \
  > "$BACKUP_DIR/postgres_${TIMESTAMP}.dump"

# --- MinIO (object storage) ---
echo "[$(date)] Backing up MinIO data..."
docker run --rm \
  -v ayunis-core_minio-data:/data:ro \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/minio_${TIMESTAMP}.tar.gz" -C /data .

# --- Prune old backups ---
echo "[$(date)] Pruning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "postgres_*.dump" -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name "minio_*.tar.gz" -mtime +"$RETENTION_DAYS" -delete

# --- Off-site copy (optional) ---
if [ -n "${BACKUP_REMOTE:-}" ]; then
  echo "[$(date)] Syncing to remote: $BACKUP_REMOTE"
  rsync -az --delete "$BACKUP_DIR/" "$BACKUP_REMOTE"
fi

echo "[$(date)] Backup completed: postgres_${TIMESTAMP}.dump, minio_${TIMESTAMP}.tar.gz"
