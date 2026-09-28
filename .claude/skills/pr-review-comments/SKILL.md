---
name: pr-review-comments
description: "Address PR review comments. Use when the user says \"check comments\", \"address comments\", \"fix PR feedback\", or similar."
---

# PR Review Comments

## Context

- Relevant authors: every human reviewer, plus `cursor[bot]` (Bugbot)
- Ignore other bots: Graphite stack comments (`graphite-app[bot]`), `github-actions[bot]` size warnings, `cursor-com[bot]` security summaries unless they contain a finding

## Fetching Comments

PR comments live in two separate API resources. Fetch both:

```bash
# 1. PR conversation comments (rare for review feedback, but check)
gh pr view <number> --json comments --jq \
  '.comments[] | select((.author.login | test("\\[bot\\]$") | not) or .author.login == "cursor[bot]") | "--- \(.author.login) at \(.createdAt) ---\n\(.body)\n"'

# 2. Inline review comments (where most feedback lives)
gh api --paginate repos/{owner}/{repo}/pulls/<number>/comments --jq \
  '.[] | select((.user.login | test("\\[bot\\]$") | not) or .user.login == "cursor[bot]") | "--- \(.user.login) at \(.created_at) on \(.path):\(.line // .original_line) ---\n\(.body)\n"'
```

`--paginate` is required: without it the API returns the first 30 comments and silently drops the rest.

The `{owner}/{repo}` can be read from `gh repo view --json nameWithOwner --jq .nameWithOwner`.

## Finding the PR

If no PR number is given, use the current branch:

```bash
gh pr view --json number --jq .number
```
