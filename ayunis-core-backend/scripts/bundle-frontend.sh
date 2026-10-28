#!/bin/bash
# Local mirror of the frontend bundling steps in the root Dockerfile: build the
# frontend and place it where the backend serves it from (ayunis-core-backend/frontend,
# gitignored). Run from anywhere; needs pnpm.
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONTEND_DIST="$PROJECT_ROOT/ayunis-core-frontend/dist"
TARGET_DIR="$PROJECT_ROOT/ayunis-core-backend/frontend"

cd "$PROJECT_ROOT"
echo "Installing workspace dependencies..."
pnpm install --frozen-lockfile

echo "Building frontend..."
pnpm --filter core-frontend-tanstack run build

echo "Replacing $TARGET_DIR with the new build..."
rm -rf "$TARGET_DIR"
cp -r "$FRONTEND_DIST" "$TARGET_DIR"

[ -f "$TARGET_DIR/index.html" ] || { echo "Error: $TARGET_DIR/index.html missing after copy" >&2; exit 1; }
echo "Frontend bundled into $TARGET_DIR"
