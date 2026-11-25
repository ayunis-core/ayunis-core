#!/bin/bash
# Local mirror of the frontend bundling steps in the root Dockerfile: build the
# surface apps and place them where the backend serves it from (ayunis-core-backend/frontend,
# gitignored). Run from anywhere; needs pnpm.
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET_DIR="$PROJECT_ROOT/ayunis-core-backend/frontend"

cd "$PROJECT_ROOT"
echo "Installing workspace dependencies..."
pnpm install --frozen-lockfile

echo "Building surfaces..."
pnpm run build:surfaces

echo "Surfaces bundled into $TARGET_DIR"
