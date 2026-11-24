---
name: fix-schema-drift
description: Fix OpenAPI schema drift between backend and frontend. Use when CI fails with "API Schema Drift" or "API client is out of date", or after adding/changing backend controllers or DTOs.
---

# Fix OpenAPI Schema Drift

## Prerequisites

The dev stack must be running (`./dev status`). Start with `./dev up` if needed.

## Fix

```bash
cd ayunis-core-frontend
pnpm run openapi:update
cd ..
pnpm --filter ayunis-core-e2e run openapi:generate
```

Then stage and commit the changed files per `git-workflow`: amend the branch that changed the backend, or commit them as their own change.

## Notes

- Never hand-edit generated files — always regenerate via `pnpm run openapi:update`
- The frontend command fetches using its `.env` and runs formatting and generation in `packages/api-client`. The format step keeps the schema in Prettier's compact-when-fits style.
- If you ever need to format the schema by itself: `pnpm run openapi:format`
- Formatting-only changes are normal — still commit them to keep CI green
