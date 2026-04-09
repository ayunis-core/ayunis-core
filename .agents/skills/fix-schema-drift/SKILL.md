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
npm run openapi:update
```

Then stage and commit the changed files with `gt modify` or `gt create`.

## Notes

- Never hand-edit generated files — always regenerate via `npm run openapi:update`
- `npm run openapi:update` runs `openapi:fetch` → `openapi:format` → `openapi:generate`. The format step (`prettier --write`) is required: `fetch-openapi-schema.js` writes via `JSON.stringify(_, null, 2)`, which puts every short array on multiple lines, but the canonical on-disk format is prettier's compact-when-fits style. Without the format step, schema regens produce ~2000 lines of whitespace-only churn.
- If you ever need to format the schema by itself: `npm run openapi:format`
- Formatting-only changes are normal — still commit them to keep CI green
