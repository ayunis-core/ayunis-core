---
name: fix-sentry-issues
description: Triage and fix Sentry issues in ayunis-core (backend and frontend). Use when the user asks to fix a Sentry issue, look at recent Sentry errors, or investigate crashes reported in Sentry.
---

# Fix Sentry Issues — ayunis-core

Workflow for investigating and fixing Sentry issues in the ayunis-core backend and frontend.

## Scope

- **Org**: `locaboo`
- **Projects**:
  - `ayunis-core-backend` — NestJS backend
  - `ayunis-core-frontend` — React frontend

## Workflow

### 1. Find the issue

If the user hasn't given a specific issue ID, list recent unresolved issues:

```bash
# Backend
sentry issue list locaboo/ayunis-core-backend --query "is:unresolved" --limit 10 \
  --json --fields shortId,title,level,count,userCount,lastSeen

# Frontend
sentry issue list locaboo/ayunis-core-frontend --query "is:unresolved" --limit 10 \
  --json --fields shortId,title,level,count,userCount,lastSeen
```

Pick the most relevant one with the user (or the one they named). Issue IDs look like `AYUNIS-CORE-BACKEND-AB1` or `AYUNIS-CORE-FRONTEND-CD2`.

### 2. View the issue

```bash
sentry issue view <SHORT_ID>
```

This gives you the stack trace, affected users, release, and a sample event. Read carefully — the top frame of the stack trace usually points directly at the file and line to fix.

For deeper analysis:

```bash
sentry issue explain <SHORT_ID>   # AI root cause analysis
sentry issue plan <SHORT_ID>      # AI-generated fix plan
```

Use these as input, not gospel — always verify against the actual code.

### 3. Locate the code

The stack trace names files relative to the source root. Map the project to the repo path:

- `ayunis-core-backend` → `~/dev/ayunis/ayunis-core/ayunis-core-backend/`
- `ayunis-core-frontend` → `~/dev/ayunis/ayunis-core/ayunis-core-frontend/`

Read the implicated file at the reported line. Check the surrounding context before deciding what's broken.

### 4. Fix the issue

Only fix the root cause the Sentry issue points at. Don't bundle unrelated cleanup.

### 5. Verify

Before reporting done:

```bash
# Backend
cd ayunis-core-backend && npm run lint && npx tsc --noEmit && npm run test

# Frontend
cd ayunis-core-frontend && npm run lint && npx tsc --noEmit
```

If you can reproduce the bug locally (e.g. via curl for backend or the browser for frontend), confirm it no longer fires.

### 6. Report back

Summarize for the user:

- Which Sentry issue was fixed (short ID + one-line title)
- Root cause in one sentence
- The fix (file + what changed)
- Whether it was reproduced and verified

Don't resolve the Sentry issue from the CLI — let it auto-resolve on the next release that includes the fix, or let the user do it manually.

## Tips

- `sentry issue list --json --fields ...` keeps output compact for the context window
- `sentry issue view <ID> -w` opens it in the browser if the user wants to share a link
- Use `sentry event list <SHORT_ID>` to see multiple events for the same issue if you need to spot variations in user/request shape
- If auto-detection picks the wrong project, always pass `locaboo/ayunis-core-backend` or `locaboo/ayunis-core-frontend` explicitly
