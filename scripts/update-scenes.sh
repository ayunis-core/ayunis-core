#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/update-scenes.sh --pr <number> [--no-rerun] <scenes.ts>
  scripts/update-scenes.sh --branch current [--no-rerun] <scenes.ts>

Creates or updates the disposable pr-media/pr-<number> branch with
.pr-media/scenes.ts. Existing generated media on that branch is preserved until
CI replaces it.

Publishing the scene branch uses git only. Re-running the App Integration
workflow is best-effort; if GitHub API access is unavailable, rerun it manually.
EOF
}

if [ $# -lt 3 ]; then
  usage
  exit 1
fi

mode="$1"
value="$2"
shift 2
rerun=true

while [ $# -gt 1 ]; do
  case "$1" in
    --no-rerun)
      rerun=false
      shift
      ;;
    *)
      usage
      exit 1
      ;;
  esac
done

if [ $# -ne 1 ]; then
  usage
  exit 1
fi

scenes_file="$1"

if [ ! -f "$scenes_file" ]; then
  echo "Scene file not found: $scenes_file" >&2
  exit 1
fi

case "$mode" in
  --pr)
    pr="$value"
    ;;
  --branch)
    if [ "$value" != "current" ]; then
      echo "Only '--branch current' is supported" >&2
      exit 1
    fi
    if ! pr="$(gh pr view --json number --jq .number 2>/dev/null)"; then
      echo "Could not resolve a PR for the current branch. Retry with --pr <number>." >&2
      exit 1
    fi
    ;;
  *)
    usage
    exit 1
    ;;
esac

if ! [[ "$pr" =~ ^[0-9]+$ ]]; then
  echo "Invalid PR number: $pr" >&2
  exit 1
fi

github_repo_from_remote() {
  local remote_url
  remote_url="$(git remote get-url origin 2>/dev/null || true)"
  if [[ "$remote_url" =~ ^git@github\.com:(.+)\.git$ ]]; then
    printf '%s\n' "${BASH_REMATCH[1]}"
    return 0
  fi
  if [[ "$remote_url" =~ ^https://github\.com/(.+)\.git$ ]]; then
    printf '%s\n' "${BASH_REMATCH[1]}"
    return 0
  fi
  if [[ "$remote_url" =~ ^https://github\.com/(.+)$ ]]; then
    printf '%s\n' "${BASH_REMATCH[1]}"
    return 0
  fi
  return 1
}

repo="${GITHUB_REPOSITORY:-}"
if [ -z "$repo" ]; then
  if ! repo="$(github_repo_from_remote)"; then
    echo "Could not infer GitHub repository from origin remote." >&2
    echo "Set GITHUB_REPOSITORY=owner/repo and retry." >&2
    exit 1
  fi
fi

branch="pr-media/pr-${pr}"
fetch_url="https://github.com/${repo}.git"
push_url="$fetch_url"
if [ -n "${GH_TOKEN:-}" ]; then
  push_url="https://x-access-token:${GH_TOKEN}@github.com/${repo}.git"
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

git -C "$work" init -q
git -C "$work" remote add origin "$fetch_url"
git -C "$work" remote set-url --push origin "$push_url"

if git -C "$work" ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
  git -C "$work" fetch -q --depth=1 origin "$branch"
  git -C "$work" checkout -q -B "$branch" FETCH_HEAD
else
  git -C "$work" checkout -q --orphan "$branch"
  git -C "$work" rm -qr . >/dev/null 2>&1 || true
fi

mkdir -p "$work/.pr-media"
cp "$scenes_file" "$work/.pr-media/scenes.ts"

git -C "$work" add .pr-media/scenes.ts
if git -C "$work" diff --cached --quiet; then
  echo "No scene changes for ${branch}."
  echo "Media branch: ${branch}"
  echo "Scene path: .pr-media/scenes.ts"
  exit 0
fi

git -C "$work" \
  -c user.name="pr-media" \
  -c user.email="pr-media@users.noreply.github.com" \
  commit -qm "test(pr-media): update scenes for PR #${pr}"

git -C "$work" push -qf origin "HEAD:refs/heads/${branch}"
echo "Updated ${branch} with .pr-media/scenes.ts"
echo "Media branch: ${branch}"
echo "Scene path: .pr-media/scenes.ts"

if [ "$rerun" = false ]; then
  echo "Skipped App Integration rerun because --no-rerun was provided."
  echo "Manually rerun the App Integration workflow for PR #${pr}."
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "Media branch updated. Could not rerun App Integration automatically because gh is unavailable."
  echo "Manually rerun the App Integration workflow for PR #${pr}."
  exit 0
fi

head_branch="$(gh pr view "$pr" --json headRefName --jq .headRefName 2>/dev/null || true)"
if [ -z "$head_branch" ]; then
  echo "Media branch updated. Could not resolve the PR head branch via GitHub API."
  echo "Manually rerun the App Integration workflow for PR #${pr}."
  exit 0
fi

run_info="$(gh run list \
  --workflow "App Integration" \
  --branch "$head_branch" \
  --json databaseId,event,status \
  --jq 'map(select(.event == "pull_request")) | first | [.databaseId, .status] | @tsv' \
  2>/dev/null || true)"

run_id=""
run_status=""
if [ -n "$run_info" ]; then
  read -r run_id run_status <<< "$run_info"
fi

if [ -z "$run_id" ]; then
  echo "Media branch updated. No App Integration pull_request run found for ${head_branch}."
  echo "Push/update the PR or manually rerun App Integration for PR #${pr}."
elif [ "$run_status" != "completed" ]; then
  echo "Media branch updated. App Integration workflow run ${run_id} is ${run_status}, so it cannot be rerun automatically."
  echo "If that run already loaded PR media scenes, manually rerun App Integration for PR #${pr}."
elif gh run rerun "$run_id"; then
  echo "Re-ran App Integration workflow run ${run_id} for ${head_branch}"
else
  echo "Media branch updated. Could not rerun App Integration workflow run ${run_id}."
  echo "Manually rerun the App Integration workflow for PR #${pr}."
fi
