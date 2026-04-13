---
name: code-review
description: Self-review local changes before creating a PR. Use when the user says "review", "review my code", "check my changes", or wants confidence before submitting.
---

# Code Review — Local Self-Assurance

Review your own uncommitted or committed-but-not-pushed changes locally. The goal is to catch real issues **before** creating a PR, so you submit with confidence.

This is a local-only review — nothing is posted to GitHub.

## Input

The user invokes `/code-review` optionally with a scope:

- `/code-review` — review all local changes (staged + unstaged + unpushed commits)
- `/code-review staged` — only staged changes
- `/code-review <path>` — only changes in specific files or directories

## Steps

### 1. Determine the diff

Identify what to review based on the scope:

```bash
# Default: all local changes vs the merge base
git diff $(git merge-base HEAD main)..HEAD
git diff HEAD

# Staged only
git diff --cached

# Specific path
git diff $(git merge-base HEAD main)..HEAD -- <path>
```

If there are no changes, tell the user and stop.

### 2. Gather context

In parallel, collect:

- The list of changed files and their directories
- Any `CLAUDE.md` files in the repo root and in affected directories
- A short summary of what the changes do (read the diff)

### 3. Launch review agents

Launch **5 parallel agents**, each with a different review lens. Provide each agent with the diff, changed file list, and relevant CLAUDE.md content.

#### Agent 1 — CLAUDE.md & Convention Compliance

Check whether the changes follow project conventions defined in CLAUDE.md files:

- Naming patterns, coding style, comment style
- Architecture boundaries and module rules
- Any explicit "do" / "don't" instructions

#### Agent 2 — Bug Scan

Shallow scan for obvious bugs in the changed lines only:

- Null/undefined risks, off-by-one errors, missing awaits
- Incorrect conditions, wrong variable references
- Broken error handling, silent failures
- Focus on real bugs — skip anything a linter or type checker would catch

#### Agent 3 — Logic & Completeness

Read the changed files more broadly (not just the diff) to check:

- Does the change do what it claims? Any missing cases?
- Are there partial implementations (TODO left behind, half-wired features)?
- Do new code paths have matching cleanup, rollback, or error handling?

#### Agent 4 — DRY & Simplicity

Check for unnecessary complexity in the changes:

- Duplicated logic that should be extracted
- Over-engineering (abstractions for single use, premature generalization)
- Code that could be simplified without losing clarity
- Dead code or unused imports introduced by the change

#### Agent 5 — Security & Data Integrity

Check the changes for security and data concerns:

- Injection risks (SQL, command, XSS)
- Secrets or credentials in code
- Missing input validation at system boundaries
- Unsafe data handling (unvalidated casts, unchecked access)

### 4. Score each finding

For each issue found across all agents, assign a confidence score (0–100):

| Score | Meaning |
|-------|---------|
| 0–25  | Likely false positive or pre-existing issue |
| 26–50 | Might be real but could be a nitpick |
| 51–75 | Probably real, worth a look |
| 76–100 | High confidence — real issue that should be fixed |

**Discard anything scoring below 60.**

### 5. Present findings

Group the surviving findings by severity:

```markdown
## Code Review — Local

Reviewed N files, M lines changed.

### Critical (must fix)
- [Bug] Missing null check in `src/service.ts:42` — `user.org` can be undefined
  when called from the public endpoint (confidence: 92)

### Important (should fix)
- [Convention] CLAUDE.md requires early returns, but `handleRequest` uses
  nested if/else at `src/handler.ts:18-34` (confidence: 81)

### Suggestions (consider)
- [Simplicity] Lines 50-62 in `src/utils.ts` duplicate the pattern at line 12 —
  extract to a shared helper (confidence: 65)

### Looks Good
- No security issues found
- Error handling is consistent with existing patterns
```

If no issues survive the confidence filter, say so clearly:

```markdown
## Code Review — Local

Reviewed N files, M lines changed.
No significant issues found. Good to submit.
```

### 6. Offer to fix

After presenting findings, ask:

> "Want me to fix any of these before you create the PR?"

If the user says yes, fix the issues and re-run only the affected review agents to verify.

## Guidelines

- **Local only** — never post to GitHub, never read PR comments, never interact with remote
- **Changes only** — review what the user changed, not pre-existing code (unless needed for context)
- **Real issues only** — the confidence scoring exists to kill false positives; be aggressive about filtering
- **Actionable** — every finding must include the file, line, and what's wrong; no vague warnings
- **Fast** — use parallel agents; the user is waiting to submit
- **Respect the codebase** — always check CLAUDE.md conventions before calling something an issue
