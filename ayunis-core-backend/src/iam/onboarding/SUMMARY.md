Onboarding Progress
Persists each user's product-onboarding progress so it follows them across devices, and works out which onboarding hint (if any) the new-chat page should show.

Stores the IDs of completed onboarding steps, whether the user has hidden the onboarding checklist, and when they first dismissed the welcome video.

The core entity is `Onboarding` (one row per user, keyed by a unique `userId` with a CASCADE foreign key to the user record). Key use cases are `GetOnboardingUseCase` — returns the user's onboarding, falling back to a transient empty default when no row exists yet so reads never 404 — `UpdateOnboardingUseCase`, which upserts checklist progress and emits `OnboardingUpdatedEvent` with the previous and persisted checklist state for analytics, and `MarkWelcomeVideoSeenUseCase`, which records the first dismissal independently. The HTTP surface is `GET /onboarding`, `PUT /onboarding`, `GET /onboarding/stage` and `POST /onboarding/welcome-video-seen`, all scoped to the current user.

`GetOnboardingStageUseCase` (`GET /onboarding/stage`) returns `{ stage, modelId }`, worked out on every request with no stored state:

- `profile` — the reserved `personal` memory entry has no content and at least one of the user's effective language models has memory available (`isMemoryAvailable` from the models domain: `memoryAccess` and not anonymous-only, the same rule `PersonalContextAccessService` applies to runs) and `canUseTools`, since a profile chat needs `set_memory` to record the profile. `modelId` is the permitted model of the user's default (`GetDefaultModelUseCase`, anonymous-only excluded) when it qualifies, otherwise the alphabetically first qualifying one.
- `first_skill` — `personal` has content, the user owns no personal skill (`HasPersonalSkillUseCase`; shared, workspace, team and org skills do not count) and the user's role has `manage_skills`. `modelId` is `null`.
- `null` in every other case, including while the `memoryEnabled` flag is off; the route answers 200 then, never 404.

It reads other modules only through their exported use cases (memory `FindUserMemoryUseCase`, models `GetEffectiveLanguageModelsUseCase`/`GetDefaultModelUseCase`, skills `HasPersonalSkillUseCase`, permissions `HasPermissionUseCase`). It is a separate route from `GET /onboarding` so that a memory or model failure cannot break the checklist.
