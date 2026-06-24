---
name: feature-toggles
description: Add, modify, or remove feature toggles. Use when gating new features or changing toggle defaults.
---

# Feature Toggles

## Key files

- Config: `ayunis-core-backend/src/config/features.config.ts` — `FeaturesConfig` interface + `registerAs('features', ...)`
- Guard: `ayunis-core-backend/src/common/guards/feature.guard.ts` — `@RequireFeature(FeatureFlag.Xxx)` decorator (composes `UseGuards` internally)
- Endpoint: `ayunis-core-backend/src/app/presenters/http/app.controller.ts` — `GET /feature-toggles`
- Response DTO: `ayunis-core-backend/src/app/presenters/http/dto/feature-toggles-response.dto.ts`
- Frontend hooks: `ayunis-core-frontend/src/features/feature-toggles/`

## Adding a new toggle

### Backend

1. Add property to `FeaturesConfig` interface and the `registerAs` factory in `features.config.ts`. Env var pattern: `FEATURE_<SNAKE_CASE>_ENABLED`. Pick the right default (off = not yet released, on = already shipped).
2. Add property to `FeatureTogglesResponseDto` with `@ApiProperty`.
3. Return it in `AppController.featureToggles()`.
4. Apply `@RequireFeature(FeatureFlag.Xxx)` to the controller(s). Controller-level = gates all routes. The decorator composes `UseGuards` internally — do not add `@UseGuards(FeatureGuard)` separately.
5. Run guard tests: `npm run test -- --testPathPattern=feature.guard`

### Frontend

1. Regenerate API client: `VITE_API_BASE_URL=http://localhost:<backend-port>/api npm run openapi:update` from `ayunis-core-frontend/`.
1. Add convenience hook in `useIsFeatureEnabled.ts` (follow `useIsSkillsEnabled` pattern).
1. Gate sidebar item in `AppSidebar.tsx` — add to the conditional spread pattern.
1. Gate route loaders — `throw redirect({ to: '/chat' })` when disabled (see `skills.index.tsx`).
1. Gate any other UI that references the feature (chat widgets, plus button, etc.).

## Changing a default

Edit the default value in `features.config.ts`. That's it — production never sets env vars, so the code default is the production value.

## Guard behavior

- `@RequireFeature(FeatureFlag.Xxx)` on class → applies to all routes in that controller
- `@RequireFeature(FeatureFlag.Xxx)` on method → applies to that route only
- Disabled → throws `NotFoundException` (404)
- Missing metadata → allows (guard is a no-op without `@RequireFeature`)
- Flag must be a member of `FeatureFlag` enum (type-safe)
