#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# publish-pr-screenshots.sh — host UI screenshots for a PR and upsert a
# sticky comment embedding them.
#
# Usage: publish-pr-screenshots.sh <pr-number> <shots-dir>
#
# Hosting follows the repo's pr-media convention (see .claude/skills/qa):
# images live on an orphan branch, here `pr-media/pr-<n>`, force-pushed on
# every run (one commit, no history). The comment references images by
# commit SHA so GitHub's raw cache never serves stale shots.
#
# Requires: GITHUB_REPOSITORY, a push-capable GITHUB_TOKEN, gh CLI
# (GH_TOKEN). Dry run without pushing/commenting: DRY_RUN=1.
# ---------------------------------------------------------------------------
set -euo pipefail

PR="${1:?usage: publish-pr-screenshots.sh <pr-number> <shots-dir>}"
SHOTS_DIR="${2:?usage: publish-pr-screenshots.sh <pr-number> <shots-dir>}"
BRANCH="pr-media/pr-${PR}"
MARKER="<!-- pr-screenshots -->"

shopt -s nullglob
shots=("$SHOTS_DIR"/*.png)
gifs=("$SHOTS_DIR"/*.gif)
media=("${shots[@]}" "${gifs[@]}")
if [ ${#media[@]} -eq 0 ]; then
  echo "No screenshots or videos in $SHOTS_DIR — nothing to publish."
  exit 0
fi

# -- 1. Build the orphan-branch commit --------------------------------------
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
dest="$work/docs/pr-media/pr-${PR}"
mkdir -p "$dest"
cp "${media[@]}" "$dest/"

git -C "$work" init -q -b "$BRANCH"
git -C "$work" add -A
git -C "$work" \
  -c user.name="github-actions[bot]" \
  -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
  commit -qm "docs(pr-media): UI screenshots for PR #${PR}"
sha="$(git -C "$work" rev-parse HEAD)"

if [ "${DRY_RUN:-}" = "1" ]; then
  echo "DRY_RUN: would force-push $sha to $BRANCH with ${#shots[@]} screenshots and ${#gifs[@]} videos"
else
  git -C "$work" push -qf \
    "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git" \
    "HEAD:refs/heads/${BRANCH}"
fi

# -- 2. Compose the comment ---------------------------------------------------
raw_base="https://raw.githubusercontent.com/${GITHUB_REPOSITORY}/${sha}/docs/pr-media/pr-${PR}"

body="$MARKER
### 📸 UI screenshots and demos

Captured automatically for affected frontend routes from this PR's build (mock LLM, seeded data, German locale).
"

section() { # <title> <viewport-suffix> <open>
  local title="$1" suffix="$2" open="$3" printed_any=false
  local out="<details${open}><summary>${title}</summary>

"
  for f in "${shots[@]}"; do
    local name route gif gif_name scene
    name="$(basename "$f")"
    [[ "$name" == *"--${suffix}.png" ]] || continue
    route="${name%--"${suffix}".png}"
    printed_any=true
    out+="**${route}**
![${name}](${raw_base}/${name})

"
    for gif in "$SHOTS_DIR/${route}--"*--"${suffix}.gif"; do
      [ -f "$gif" ] || continue
      gif_name="$(basename "$gif")"
      scene="${gif_name#"${route}"--}"
      scene="${scene%--"${suffix}".gif}"
      out+="_${scene}_
![${gif_name}](${raw_base}/${gif_name})

"
    done
  done
  out+="</details>"
  $printed_any && printf '%s\n' "$out"
}

body+="$(section 'Desktop (1280px)' 'desktop' ' open')
$(section 'Mobile (375px)' 'mobile' '')"

if [ "${DRY_RUN:-}" = "1" ]; then
  echo "DRY_RUN: comment body would be:"
  printf '%s\n' "$body"
  exit 0
fi

# -- 3. Upsert the sticky comment --------------------------------------------
comment_id="$(gh api "repos/${GITHUB_REPOSITORY}/issues/${PR}/comments" \
  --paginate --jq ".[] | select(.body | startswith(\"${MARKER}\")) | .id" | head -1)"

if [ -n "$comment_id" ]; then
  gh api -X PATCH "repos/${GITHUB_REPOSITORY}/issues/comments/${comment_id}" \
    -f body="$body" > /dev/null
  echo "Updated screenshot comment ${comment_id} on PR #${PR} (${#shots[@]} shots, ${#gifs[@]} videos, ${sha})"
else
  gh api -X POST "repos/${GITHUB_REPOSITORY}/issues/${PR}/comments" \
    -f body="$body" > /dev/null
  echo "Created screenshot comment on PR #${PR} (${#shots[@]} shots, ${#gifs[@]} videos, ${sha})"
fi
