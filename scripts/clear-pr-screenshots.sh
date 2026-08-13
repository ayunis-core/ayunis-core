#!/usr/bin/env bash
set -euo pipefail

PR="${1:?usage: clear-pr-screenshots.sh <pr-number>}"
MARKER="<!-- pr-screenshots -->"

comment_ids="$(gh api "repos/${GITHUB_REPOSITORY}/issues/${PR}/comments" \
  --paginate --jq ".[] | select(.body | startswith(\"${MARKER}\")) | .id")"

if [ -z "$comment_ids" ]; then
  echo "No screenshot comment to clear on PR #${PR}."
  exit 0
fi

while IFS= read -r comment_id; do
  [ -n "$comment_id" ] || continue
  gh api -X DELETE "repos/${GITHUB_REPOSITORY}/issues/comments/${comment_id}" > /dev/null
  echo "Deleted screenshot comment ${comment_id} on PR #${PR}."
done <<< "$comment_ids"
