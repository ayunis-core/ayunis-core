---
name: browser-verify
description: Verify frontend changes in the browser — check pages render, catch console errors, and debug runtime issues using bb (headless Chrome CLI).
---

# Browser Verification

Use `bb` (headless Chrome CLI) to verify frontend changes render correctly and produce no runtime errors. Run `bb help` for the full command reference.

## Determine the Frontend URL

The frontend port depends on the dev slot. Check with:

```bash
./dev status
```

Or derive it: frontend port = `3001 + (slot × 10)`. Slot 2 → `http://localhost:3021`.

## Verification Flow

After making frontend changes:

1. **Open the page** — `bb open http://localhost:3021/your-page`
2. **Check for React error overlay** — `bb exists "#webpack-dev-server-client-overlay"`
3. **Screenshot if needed** — `bb screenshot page.png`
4. **Stop when done** — `bb stop`

## Catching Console Errors

Inject an error collector before navigating, then check it after:

```bash
bb open --raw http://localhost:3021
bb js "window.__errs=[]; const o=console.error; console.error=(...a)=>{window.__errs.push(a.join(' ')); o.apply(console,a)}"
bb open http://localhost:3021/your-page
bb js "window.__errs"
```

## Debugging with CDP

`bb cdp <method> [params-json]` gives direct access to the Chrome DevTools Protocol. Useful for:

- **Network issues** — `bb cdp Network.enable`, then inspect cookies or replay requests
- **Runtime exceptions** — `bb cdp Runtime.enable` to track uncaught errors
- **DOM inspection** — `bb cdp DOM.getDocument '{"depth": 3}'`

## Authentication

The dev database is seeded via `npm run seed:minimal:ts` (in `ayunis-core-backend`). The default fixture creates a super-admin user with the credentials below. See `src/db/fixtures/minimal.fixture.ts` for the full seed data.

If the page requires login, fill in the login form first:

```bash
bb open http://localhost:3021/login
bb input "input[name='email']" "admin@demo.local"
bb input "input[name='password']" "admin"
bb click "button[type='submit']"
bb sleep 2
bb open http://localhost:3021/your-page
```

## Cleanup

Always stop the browser when done to free resources:

```bash
bb stop
```
