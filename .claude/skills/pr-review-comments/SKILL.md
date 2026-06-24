---
name: pr-review-comments
description: "Address PR review comments. Use when the user says \"check comments\", \"address comments\", \"fix PR feedback\", or similar."
---

# PR Review Comments

## Context

- GitHub user: **devbydaniel**
- Relevant comment authors: `devbydaniel`, `cursor[bot]` (Bugbot)
- Ignore automated/bot comments: Graphite stack comments, `github-actions` size warnings

## Fetching Comments

PR comments live in two separate API resources. Fetch both:

```bash
# 1. PR conversation comments (rare for review feedback, but check)
gh pr view <number> --json comments --jq \
  '.comments[] | select(.author.login == "devbydaniel" or .author.login == "cursor[bot]") | "--- \(.author.login) at \(.createdAt) ---\n\(.body)\n"'

# 2. Inline review comments (where most feedback lives)
gh api repos/{owner}/{repo}/pulls/<number>/comments --jq \
  '.[] | select(.user.login == "devbydaniel" or .user.login == "cursor[bot]") | "--- \(.user.login) at \(.created_at) on \(.path):\(.line // .original_line) ---\n\(.body)\n"'
```

The `{owner}/{repo}` can be read from `gh repo view --json nameWithOwner --jq .nameWithOwner`.

## Finding the PR

If no PR number is given, use the current branch:

```bash
gh pr view --json number --jq .number
```
