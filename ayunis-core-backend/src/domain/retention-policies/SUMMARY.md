# Retention Policies Module

Org-level data retention. Lets an org admin opt in to automatic deletion of conversation data that has been inactive past a configured window, and runs a nightly job that enforces it. Retention is **disabled by default** for every org (data kept forever) until an admin sets a window.

## Domain Entities

- **`OrgRetentionPolicy`** — An org's retention setting (`id`, `orgId`, `retentionDays`, `createdAt`, `updatedAt`). One per org, upsert semantics. `retentionDays === null` means disabled (keep forever); `isEnabled()` reflects this. `cutoffFrom(now)` returns the activity cutoff (`now − retentionDays`, computed with absolute-time arithmetic so it is timezone/DST-independent), or `null` when disabled.
- **`retention-period.ts`** — `ALLOWED_RETENTION_DAYS` (`[30, 90, 180, 365, 730]`) is an allowlist, not a free-form integer, so an admin cannot configure a destructive value like "1 day". `isValidRetentionDays(value)` accepts `null` (disabled) or an allowed window, and is shared by the HTTP DTO and the domain use case so non-HTTP callers are held to the same constraint.

## Ports

- **`RetentionPoliciesRepository`** — `findByOrgId`, `upsert`, `findAllEnabled` (every org with retention enabled; drives the nightly job).

## Use Cases

- **`GetOrgRetentionPolicyUseCase`** — Retrieves an org's policy (returns `null` if never configured).
- **`UpsertOrgRetentionPolicyUseCase`** — Creates or replaces an org's policy; validates the window against the allowlist.
- **`EnforceRetentionUseCase`** — Core enforcement. For each enabled org it pages through expired threads (via the threads module's `FindExpiredThreadRefsByOrgUseCase`) in batches of 100 and deletes each one through `DeleteThreadUseCase` (which purges storage objects and cascades messages/artifacts/images) under a per-thread CLS context. Failures are isolated per thread so one bad thread can't abort the run; the paging offset advances only past failed deletes. A `dryRun` config flag counts candidates without deleting. A per-org safety cap (`MAX_BATCHES_PER_ORG`) guards against a pathological loop; reaching it sets `capReached` on the result and logs a warning so silent truncation is observable. Returns per-org and aggregate `scanned`/`deleted`/`failed` counts.

## Infrastructure

- **`PostgresRetentionPoliciesRepository`** — TypeORM implementation backed by the `org_retention_policies` table.
- **`OrgRetentionPolicyRecord`** — TypeORM entity (unique per org).
- **`OrgRetentionPolicyMapper`** — Domain ↔ Record conversion.
- **`RetentionCleanupTask`** — Nightly Nest-schedule job at 4 AM (staggered after the threads module's 2 AM / 3 AM cleanups) that runs `EnforceRetentionUseCase`. An in-memory lock skips overlapping executions; success/failure counts are logged.

## HTTP API

`RetentionPoliciesController` — base path `/retention-policies`, tag `retention-policies`, all routes **org-admin only**.

| Method | Path                       | Description                                                  |
| ------ | -------------------------- | ------------------------------------------------------------ |
| GET    | `/retention-policies/org`  | Get the current org's policy (disabled if never configured)  |
| PUT    | `/retention-policies/org`  | Set or clear the current org's policy                        |

## Exports

- `GetOrgRetentionPolicyUseCase`, `UpsertOrgRetentionPolicyUseCase`, `EnforceRetentionUseCase`

## Dependencies

- **threads** — `FindExpiredThreadRefsByOrgUseCase` to locate expired threads and `DeleteThreadUseCase` to delete them (imports `ThreadsModule`).
- **IAM** — org/user scoping via the request context and admin role guard.
