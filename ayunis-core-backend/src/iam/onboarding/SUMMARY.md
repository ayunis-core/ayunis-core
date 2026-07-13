Onboarding Progress
Persists each user's product-onboarding progress so it follows them across devices.

Stores the IDs of completed onboarding steps, whether the user has hidden the onboarding checklist, and when they first dismissed the welcome video.

The core entity is `Onboarding` (one row per user, keyed by a unique `userId` with a CASCADE foreign key to the user record). Key use cases are `GetOnboardingUseCase` — returns the user's onboarding, falling back to a transient empty default when no row exists yet so reads never 404 — `UpdateOnboardingUseCase`, which upserts checklist progress, and `MarkWelcomeVideoSeenUseCase`, which records the first dismissal independently. The HTTP surface is `GET /onboarding`, `PUT /onboarding`, and `POST /onboarding/welcome-video-seen`, all scoped to the current user via the `CurrentUser` decorator.
