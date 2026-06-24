---
name: backend-debugging
description: Debug backend runtime errors (500s, crashes, unexpected behavior). Use when something is broken at runtime — not for writing new code.
---

# Backend Debugging

## Step 1 — Read the logs

Before reading code, guessing, or querying the database, **check the backend logs**:

```bash
# From the repo root (slot is remembered from ./dev up):
./dev logs backend                # Last 80 lines
./dev logs --tail 200 backend     # More context

# Or read the log file directly:
cat .dev/slot-$(cat .dev/slot)/backend.log
```

The logs contain full stack traces with file names and line numbers. This tells you exactly what's broken — no guessing needed.

**Do not skip this step.** Code review without the actual error is guesswork.

## Step 2 — Reproduce the error

Confirm the error independently with curl. This isolates whether the problem is backend vs. frontend vs. CORS:

```bash
# Login first (adjust credentials as needed):
curl -s -c /tmp/cookies.txt http://localhost:3020/api/auth/login \
  -X POST -H 'Content-Type: application/json' \
  -d '{"email":"...","password":"..."}'

# Hit the failing endpoint:
curl -s -b /tmp/cookies.txt "http://localhost:3020/api/..." | head -50
```

Replace port `3020` with whatever the current slot uses. Check with `./dev status`.

### Recognizing CORS errors

If the browser console shows "blocked by CORS policy" but the request returns a valid status code (e.g., 201), the backend works — the browser is rejecting the response. Look for:

- Hardcoded `Access-Control-Allow-Origin` headers in the controller that override the global CORS middleware
- The global CORS config in `src/main.ts` — in development mode (`NODE_ENV !== 'production'`) it should allow all origins

## Step 3 — Go to the error location

The stack trace gives you the exact file and line. Read that code. Common patterns:

### "Cannot read properties of undefined (reading 'map')"

A relation wasn't loaded by TypeORM but the mapper assumes it's always present. Fix with optional chaining:

```typescript
// Before — crashes when relation not loaded:
items.map(x => ...)

// After:
items?.map(x => ...) ?? []
```

This is especially common when:

- A `findAll` query doesn't load the same relations as `findOne`
- Eager relations don't cascade through deeply nested joins (e.g., `thread → sourceAssignments → source → details → contentChunks`)

### "Invalid source type" / "Invalid message role"

A mapper's `instanceof` or `switch` doesn't cover all cases. Check what the database actually contains:

```bash
# Quick database query through the dev stack:
cd ayunis-core-backend
npx ts-node -r tsconfig-paths/register -e "
import './src/config/env';
import { DataSource } from 'typeorm';
// ... query the relevant table
"
```

## Step 4 — Fix, verify, check logs again

1. Make the fix
2. Wait for `nest --watch` to reload (or check `./dev logs backend` for compilation errors)
3. Re-run the curl command from Step 2
4. Check `./dev logs backend` to confirm no new errors
5. Run the validation sequence:

```bash
cd ayunis-core-backend
npm run lint && npx tsc --noEmit && npm run test
```
