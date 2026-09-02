---
name: feature-toggles
description: Add, modify, remove, or review feature toggles. Use when gating a feature, changing a toggle default, or changing behavior shared with a feature-gated path.
---

# Feature Toggles

## Key files

- Config: `ayunis-core-backend/src/config/features.config.ts` — `FeaturesConfig` interface + `registerAs('features', ...)`
- Guard: `ayunis-core-backend/src/common/guards/feature.guard.ts` — `@RequireFeature(FeatureFlag.Xxx)` decorator (composes `UseGuards` internally)
- Endpoint: `ayunis-core-backend/src/app/presenters/http/app.controller.ts` — `GET /feature-toggles`
- Response DTO: `ayunis-core-backend/src/app/presenters/http/dto/feature-toggles-response.dto.ts`
- Frontend hooks: `ayunis-core-frontend/src/features/feature-toggles/`

## Define both contracts first

Before implementation, state the observable behavior with the flag enabled and disabled. Identify any existing workflow that shares a route, controller, navigation action, service, or persisted state with the gated feature.

- Gate the narrowest new entry point that satisfies the product contract.
- Keep shared cleanup, revocation, logout, recovery, and existing-user paths available unless the disabled-state contract explicitly removes them.
- Do not switch an existing shared consumer to a gated endpoint without proving its flag-off behavior.

## Adding a new toggle

### Backend

1. Add property to `FeaturesConfig` interface and the `registerAs` factory in `features.config.ts`. Env var pattern: `FEATURE_<SNAKE_CASE>_ENABLED`. Pick the right default (off = not yet released, on = already shipped).
2. Add property to `FeatureTogglesResponseDto` with `@ApiProperty`.
3. Return it in `AppController.featureToggles()`.
4. Apply `@RequireFeature(FeatureFlag.Xxx)` to the controller(s). Controller-level = gates all routes. The decorator composes `UseGuards` internally — do not add `@UseGuards(FeatureGuard)` separately.
5. Run guard tests: `pnpm run test -- --testPathPattern=feature.guard`

### Frontend

1. Regenerate API client: `VITE_API_BASE_URL=http://localhost:<backend-port>/api pnpm run openapi:update` from `ayunis-core-frontend/`.
1. Add convenience hook in `useIsFeatureEnabled.ts` (follow `useIsSkillsEnabled` pattern).
1. Gate sidebar item in `AppSidebar.tsx` — add to the conditional spread pattern.
1. Gate route loaders — `throw redirect({ to: '/chat' })` when disabled (see `skills.index.tsx`).
1. Gate any other UI that references the feature (chat widgets, plus button, etc.).

## Changing a default

Edit the default value in `features.config.ts`. `parseBooleanWithDefault` uses the default only when `FEATURE_<NAME>_ENABLED` is unset or empty, so the code default is the deployed value only if that host's `ayunis-core-backend/.env` does not set the var. Check the host file before claiming an environment flipped (`DEPLOYMENT.md` → Configuration Updates); CI sets several of these explicitly (`.github/workflows/e2e-tests.yml`).

## Verification

1. **Config** — add the default and the explicit-`true` case to `ayunis-core-backend/src/config/features.config.spec.ts`.
2. **Flag ON** — the normal e2e run; enable the flag in the backend `.env` heredoc in `.github/workflows/e2e-tests.yml`.
3. **Flag OFF** — required when the gate lands on something that already existed: a route, controller, navigation entry, or persisted state an existing workflow already depends on. If the gate covers only new code, OFF means "feature absent" and no OFF test is needed. One focused spec when it is needed, never a duplicated suite.

### Flag-off e2e recipe

The flag resolves from `process.env` at boot, so one stack cannot serve both states — the OFF spec needs its own backend. Copy the `sso-disabled` setup from AYC-367; all three pieces are in-tree:

- `.github/workflows/e2e-tests.yml` — steps `Start backend with SSO login disabled` and `Test logout lifecycle with SSO login disabled`: the same build artifact started again with the flag off on a spare port, health-polled, log added to the `backend-log` artifact. Same job as the flag-on run: one extra process and one spec, not a matrix.
- `ayunis-core-e2e/playwright.config.ts` — the `sso-disabled` project. The spec must also be listed in the `chromium` project's `testIgnore`, or it runs in both states.
- `ayunis-core-e2e/tests/auth/sso-disabled-logout.spec.ts` — prove the feature is gone first (gated route 404s; `publicApi` fixture for unauthenticated endpoints), then exercise the shared workflow that must stay available.

Locally: `FEATURE_<NAME>_ENABLED=false pnpm run start:dev` in a second slot. Shell env wins over `.env.dev` and `.env`; never hand-edit the generated `.env.dev`.

Mocked guards, mocked API clients, and direct controller invocation exercise wiring, not runtime composition: they do not satisfy the OFF contract for a shared path.

Record both ON and OFF results in the PR validation summary.

## Guard behavior

- `@RequireFeature(FeatureFlag.Xxx)` on class → applies to all routes in that controller
- `@RequireFeature(FeatureFlag.Xxx)` on method → applies to that route only
- Disabled → throws `NotFoundException` (404)
- Missing metadata → allows (guard is a no-op without `@RequireFeature`)
- Flag must be a member of `FeatureFlag` enum (type-safe)
