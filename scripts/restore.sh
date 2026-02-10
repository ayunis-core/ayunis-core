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

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/ayunis/backups}"

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
echo "Timestamp: $TIMESTAMP"
echo "Postgres:  $PG_DUMP ($(du -h "$PG_DUMP" | cut -f1))"
echo "MinIO:     $MINIO_TAR ($(du -h "$MINIO_TAR" | cut -f1))"
echo ""
read -p "This will OVERWRITE current data. Continue? [y/N] " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

# --- Restore Postgres ---
echo "[$(date)] Restoring Postgres..."
docker exec -i ayunis-postgres-prod \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < "$PG_DUMP"

# --- Restore MinIO ---
echo "[$(date)] Restoring MinIO data..."
docker compose stop minio
docker run --rm \
  -v ayunis-core_minio-data:/data \
  -v "$BACKUP_DIR":/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/minio_${TIMESTAMP}.tar.gz -C /data"
docker compose start minio

echo "[$(date)] Restore completed. Verify the application is working correctly."
