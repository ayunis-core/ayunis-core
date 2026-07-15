Sessions
Server-side refresh-token sessions with rotation, family-based reuse detection, and revocation.

Owns the persistent state behind the refresh cookie: opaque refresh tokens grouped into families (one family per login/device). Rotation atomically consumes the presented token and issues a successor in the same family; presenting a revoked token — or replaying a rotated token after the grace window — revokes the entire family as a theft response. The module deliberately imports nothing from **users** or **authentication** (the record's `ManyToOne(UserRecord)` is a type-only import), so both can depend on it without a cycle.

Domain entity: `RefreshToken` — `familyId` ties a rotation chain to its login, `tokenHash` is the SHA-256 of the opaque plaintext (which is never stored), `usedAt`/`revokedAt` gate rotation, and `replacedByTokenId` is an audit pointer to the successor (FK with `SET NULL` on delete). `isExpired()`/`isRevoked()` are the only domain checks.

Application layer: `RefreshTokenFactory` builds tokens (32 random bytes base64url for the cookie, hash on the entity, TTL from `auth.jwt.refreshTokenExpiresIn`). The `RefreshTokensRepository` port's key operation is `markUsedAndInsertSuccessor` — a single transaction that marks the current token used, links it to the successor, and inserts the successor, so a partial failure can never consume a token without issuing its replacement; it returns `false` (writing nothing) when a concurrent request already won. `wasUsedWithinGrace` distinguishes a benign concurrent rotation (a sibling successor is issued) from a post-grace replay (family revoked). `sessions.errors.ts` defines `RefreshTokenNotFoundError`, `RefreshTokenExpiredError`, and `RefreshTokenReuseError` (all 401).

Use cases: `CreateSessionUseCase` (new family on login), `RotateSessionUseCase` (validate → atomic rotate → grace-window race handling → reuse detection), `RevokeSessionFamilyUseCase` (logout), `RevokeAllSessionsForUserUseCase` (admin password reset), and `RevokeOtherSessionsForUserUseCase` (self-service password change — the actor's current family survives).

Infrastructure: `LocalRefreshTokensRepository` implements the port with TypeORM; rotation-sensitive writes are conditional UPDATEs on DB time (`NOW()`), keeping the winner decision single-writer under concurrency and immune to app-clock skew. `SessionsCleanupTask` deletes rows strictly by expiry nightly at 5 AM — used and revoked rows survive until expiry so grace-window checks and "revoked family" replay responses keep working.

It integrates with **authentication** (login mints a session, refresh rotates it, logout revokes the family) and **users** (password reset/change revoke sessions) via the exported use cases, and with **users** for the `userId` FK relationship.
