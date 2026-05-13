Branding
Manages per-organization appearance customization (display name and favicon) shown to end users.

Branding lives in its own `branding` table (OneToOne to `orgs`, cascade delete) rather than as columns on the org, and is created lazily on first write. The read path resolves the effective branding: a missing row falls back to the org name as `displayName`, a row with `displayName = null` means the admin cleared it and the frontend shows the platform default. Favicons are stored in object storage under `{orgId}/branding/favicon.{ext}` and served via presigned URLs with an in-process cache (50 min TTL, invalidated on update; per-instance only).

Use cases: **get-branding** (resolve effective branding `{ name, displayName, faviconUrl }` for an org; reads the org via `FindOrgByIdUseCase`), **update-branding** (admin upsert of display name and favicon; validates PNG/JPEG ≤ 512 KB, replaces/deletes the stored object). HTTP: `GET /branding` (any authenticated user), `PATCH /branding` (admin, multipart). The org's canonical `name` is intentionally NOT updatable here — branding is appearance only. Errors: `BrandingInvalidFileError` (400), `UnexpectedBrandingError` (500).
