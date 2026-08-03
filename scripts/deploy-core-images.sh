#!/usr/bin/env bash
set -euo pipefail

: "${CORE_TAG:?CORE_TAG must name the published image tag to deploy}"
: "${MIN_FREE_GB:?MIN_FREE_GB must set the required disk headroom}"

export COMPOSE_FILE=docker-compose.yml:compose.release.yml
PRUNE_BUILD_CACHE="${PRUNE_BUILD_CACHE:-false}"
SANDBOX_IMAGE="ghcr.io/ayunis-core/ayunis-core-python-sandbox:$CORE_TAG"
TARGET_COMPOSE_IMAGES=(
  "ghcr.io/ayunis-core/ayunis-core-app:$CORE_TAG"
  "ghcr.io/ayunis-core/ayunis-core-code-execution:$CORE_TAG"
  "ghcr.io/ayunis-core/ayunis-core-anonymize:$CORE_TAG"
)

reclaim_images() {
  local preserve_sandbox="${1:-}"
  local victims

  if [[ "$preserve_sandbox" == "keep-sandbox" && "$PRUNE_BUILD_CACHE" == "true" ]]; then
    docker builder prune -af || true
  fi

  docker images --filter "reference=ayunis-core-*" --format '{{.Repository}}:{{.Tag}}' \
    | xargs -r docker rmi || true

  victims=$(docker images --filter "reference=ghcr.io/ayunis-core/ayunis-core-*" --format '{{.Repository}}:{{.Tag}}' \
    | awk -F: -v tag="$CORE_TAG" '$NF != tag' || true)
  if [[ "$preserve_sandbox" == "keep-sandbox" ]]; then
    victims=$(printf '%s\n' "$victims" | grep -Fv 'ayunis-core-python-sandbox' || true)
  fi
  printf '%s\n' "$victims" | grep -v '^$' | xargs -r docker rmi || true
  docker image prune -f
}

remove_partial_target_images() {
  # In-use images are protected by Docker. Unused images with the target tag
  # came from an interrupted pull and must not make the next disk check fail.
  docker rmi "${TARGET_COMPOSE_IMAGES[@]}" || true
  docker image prune -f
}

# Pulls need room for a complete second image generation. Cleanup runs first
# so a full disk cannot trap every later deployment behind the same failed
# pull. The sandbox is preserved because no long-lived container pins it.
reclaim_images keep-sandbox

FREE_GB=$(df -BG --output=avail / | tail -1 | tr -dc '0-9')
if [[ "${FREE_GB:-0}" -lt "$MIN_FREE_GB" ]]; then
  remove_partial_target_images
  FREE_GB=$(df -BG --output=avail / | tail -1 | tr -dc '0-9')
fi
echo "Free disk: ${FREE_GB:-0}G (need ${MIN_FREE_GB}G)"
if [[ "${FREE_GB:-0}" -lt "$MIN_FREE_GB" ]]; then
  echo "::error::only ${FREE_GB:-0}G free, need ${MIN_FREE_GB}G — not deploying"
  exit 1
fi

if ! docker compose pull app code-execution anonymize; then
  remove_partial_target_images
  echo "::error::image pull failed — keeping current containers, not deploying"
  exit 1
fi
if ! docker pull "$SANDBOX_IMAGE"; then
  remove_partial_target_images
  echo "::error::sandbox image pull failed — keeping current containers, not deploying"
  exit 1
fi

docker compose down
docker compose up -d --no-build
timeout 120 bash -c 'until docker compose ps app --format json | grep -q "(healthy)"; do sleep 5; done'
docker compose ps

# Once the new generation is healthy, the old sandbox and legacy host-built
# images are safe to remove too.
reclaim_images
