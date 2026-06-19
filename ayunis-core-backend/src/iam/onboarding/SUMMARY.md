Onboarding Progress
Persists each user's product-onboarding progress so it follows them across devices.

Stores the IDs of completed onboarding steps and whether the user has hidden the onboarding checklist. The store is intentionally dumb: it persists opaque step-ID strings and a boolean, with no knowledge of the step catalog (which lives in the frontend).

The core entity is `Onboarding` (one row per user, keyed by a unique `userId` with a CASCADE foreign key to the user record). Key use cases are `GetOnboardingUseCase` — returns the user's onboarding, falling back to a transient empty default when no row exists yet so reads never 404 — and `UpdateOnboardingUseCase`, which upserts the completed step IDs and hidden flag. The HTTP surface is `GET /onboarding` and `PUT /onboarding`, both scoped to the current user via the `CurrentUser` decorator. `OnboardingRepository` abstracts persistence, implemented with TypeORM against PostgreSQL.
