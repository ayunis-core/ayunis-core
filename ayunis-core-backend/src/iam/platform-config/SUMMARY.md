Platform Configuration
Stores instance-wide configuration as key/value pairs, managed by super admins.

Holds global, deployment-level settings that are not scoped to any organization or user — the credits-per-euro conversion rate, per-tier fair-use limits, the image-generation fair-use limit, and the persistent app-wide alert banner. Values are read by other modules at runtime and edited by super admins through dedicated HTTP endpoints.

This module is a generic platform-wide settings store. The core entity is `PlatformConfig` (a `{ key, value }` pair); valid keys are enumerated in `PlatformConfigKey` (`CREDITS_PER_EURO`, the `FAIR_USE_*` tier limit/window keys, and `APP_ALERT_ENABLED` / `APP_ALERT_MESSAGE`). All values are persisted as strings in a single `platform_config` table (PK on `key`), so adding a new setting is just a new enum key and use case — no migration required. Persistence is abstracted by `PlatformConfigRepositoryPort` (`get`, `set`, and `setMany` — an atomic multi-key upsert used when several keys must change together) with a PostgreSQL implementation (`PlatformConfigRepository`, mapping `PlatformConfigRecord`).

Key use cases: `GetCreditsPerEuroUseCase` / `SetCreditsPerEuroUseCase` (the global credits-per-euro rate used for credit calculations; get throws `PlatformConfigNotFoundError` when unset), `GetFairUseLimitsUseCase` / `SetFairUseLimitUseCase` / `SetImageFairUseLimitUseCase` (per-tier message limits plus a single image-generation bucket; the getter falls back to baked-in defaults so it always returns a value), and `GetAppAlertUseCase` / `SetAppAlertUseCase` (the app-wide alert banner — get returns `{ enabled, message }`, defaulting to disabled/empty when unset; set writes both keys atomically via `setMany` and rejects enabling the banner without a non-empty message). Validation failures raise `PlatformConfigInvalidValueError`.

HTTP entry points:

- `SuperAdminPlatformConfigController` (`super-admin/platform-config`, `SUPER_ADMIN` only) — `GET`/`PUT credits-per-euro`, `GET`/`PUT fair-use-limits`, `PUT image-fair-use-limit`, and `PUT app-alert`.
- `AppAlertController` (`app-alert`, any authenticated user) — `GET` the current alert banner so the frontend can render it on every page. This is intentionally not super-admin-gated; only writing the banner is restricted.

Providers exported for cross-module use: `GetCreditsPerEuroUseCase`, `GetFairUseLimitsUseCase`, and `GetAppAlertUseCase`. The credits-per-euro rate is consumed by credit/usage calculation, the fair-use limits by the **quotas** module's runtime enforcement, and the app alert by the frontend banner widget.
