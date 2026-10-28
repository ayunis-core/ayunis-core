# Academy Access

Per-org gate tying **Ayunis Core chat** to the KI-Schulung nach EU AI Act
completion recorded by the academy (`src/domain/academy`). An org admin picks one
of three `AcademyAccessMode`s; users without a valid Academy completion cannot start or advance
a conversation, while the academy itself stays reachable so they can earn one.

## Model

`OrgAcademyAccessSettings` — `{ id, orgId, mode }`, one row per org
(`org_academy_access_settings`, unique `orgId`, FK to `orgs` `ON DELETE
CASCADE`). **An absent row means `UNRESTRICTED`**, applied in the entity
constructor, so the migration leaves every existing org ungated.

`AcademyAccessMode`:

- `unrestricted` — no gate (default, and the pre-gate behaviour)
- `required_once` — the Academy must be completed once; completion is permanent
- `required_annually` — the Academy must be completed again every 12 months

## Evaluation

`EvaluateAcademyAccessUseCase({ userId, orgId })` →
`{ mode, required, allowed, completedAt, expiresAt }`. It runs on every gated
request, so the checks are ordered cheapest-first and short-circuit:

1. Org settings. `UNRESTRICTED` returns immediately — the default org pays
   exactly **one** indexed lookup and never touches the other two tables.
2. `IsAddonActiveUseCase(AYUNIS_CORE_ACADEMY)`. An org without the add-on
   **fails open**: it cannot take the certificate at all, so gating on it would
   lock the org out with no way forward.
3. `GetAcademyCompletionUseCase` (exported by `AcademyModule`) for
   `completedAt`/`expiresAt`. Access evaluation uses Academy's derived expiry
   rather than calculating it locally. Chapter confirmations remain entirely
   inside the academy module.

`expiresAt` is reported only in `required_annually` — surfacing it elsewhere
would imply a deadline that mode does not have. Nothing is cached: "passing
immediately unlocks Core" rules out caching completion, and the short-circuit
already makes the common path free.

## Enforcement

`@RequireAcademyCertificate()` marks a controller as part of the chat surface;
`AcademyCertificateGuard` decides per request. It is bound globally by
`IamModule` — the module owning the data owns the guard, mirroring
`IpAllowlistGuard`.

The guard blocks **state-changing requests only**: `GET`/`HEAD`/`OPTIONS` and
`DELETE` pass through, so a blocked user keeps read access to their chat history
and can still delete their own data. That is a verb-level rule — an endpoint
that triggers inference from a `GET` would slip through and must be gated
explicitly.

Denials `throw AcademyCertificateRequiredError`
(`ACADEMY_CERTIFICATE_REQUIRED`, 403, metadata `{ mode, expiresAt }`) rather
than returning `false`, so the frontend can tell this apart from every other 403
and point the user at the academy.

Gated controllers: `runs` (`POST send-message`), `transcriptions`, `threads` and
its thread-scoped sub-controllers (sources, knowledge bases, MCP integrations).

Deliberately **not** gated:

- `skills`, `artifacts`, `knowledge-bases` — authoring and configuration. They
  consume no inference without a run, and gating them yields confusing 403s on
  pages that otherwise work.
- `openai-compat` — API-key authenticated, and `ApiKeyPrincipal` has no
  `userId`; a machine principal has no certificate holder. The guard skips
  api-key principals for the same reason. **Known gap:** an org that enables the
  gate _and_ issues API keys retains an ungated inference path.
- `shares` — org-sharing admin surface; gating it would stop a lapsed user from
  *un*sharing.

## HTTP

`AcademyAccessController` (`academy-access`):

- `GET status` — any authenticated user, **not** gated (a blocked user has to be
  able to read why). Returns the evaluation above.
- `GET`/`PUT org-settings` — `@Roles(ADMIN)`.
- `GET org-certificates` — `@Roles(ADMIN)`. The admin overview, see below.
- `GET org-certificates/export.csv` — `@Roles(ADMIN)`. The overview as a CSV
  file: the whole filtered list, not one page, with German headers, dates
  formatted `dd.MM.yyyy` in `Europe/Berlin` and formula-prefixed cells
  neutralized through PapaParse’s `escapeFormulae` option in `src/common/util/csv.ts`.
  The frontend owns the localized download filename; this endpoint returns the
  CSV body without a filename header. Exports allow ten requests per authenticated admin
  per 15 minutes, independently of office IP. There is deliberately no row cap:
  an export contains all matching members, and no data is silently truncated.
  CSV memory use grows with the filtered organization; substantially larger
  organizations would justify streaming or an asynchronous export.
- `GET org-certificates/:userId/certificate` — `@Roles(ADMIN)`, rate-limited
  at 60 downloads per authenticated administrator per 15 minutes. The member's Teilnahmebestätigung PDF, see
  below.

## Admin overview

The list and export use cases resolve the authenticated organization from
`ContextService`, load its settings and call `OrgCertificateStatusesRepository`
directly. Their queries accept filters and pagination rather than an organization
ID. Missing organization context fails before settings or members are read.
Each reported member has a `CertificateValidityStatus`
(`not_passed`, `valid`, `expiring_soon`, `expired`).
SQL derives status; a test-only `resolveCertificateValidityStatus` reference
under `testing/` checks those rules independently. `expiring_soon` starts
`EXPIRING_SOON_DAYS` (30) before expiry — deliberately the same moment the user
gets their first expiry notification, so admin and member see the same thing.
`expiring_soon`/`expired` can only occur in `required_annually`; a permanent pass
never lapses, so `required_once` reports `valid` however old the pass is.

The pure `buildOrgCertificateStatusesCriteria` helper combines filters, org mode
and one clock captured by the use case with Academy's
`ACADEMY_COMPLETION_VALIDITY_MONTHS` constant. The reporting query filters, derives
status, orders and paginates in PostgreSQL. A shared CTE serves both the table
and the full CSV export; the table's count and page come from one SQL statement,
including an empty or out-of-range page. Only page rows reach the application.

`PostgresOrgCertificateStatusesRepository` is a deliberate reporting exception
to ordinary cross-module use-case composition, following the users-export read
model: it queries the mapped `AcademyCertificateMemberView`. The ordinary
PostgreSQL view `academy_certificate_members` joins `UserRecord` to
`AcademyCompletionRecord`, exposing only member identity, org ID and completion
date. The query applies org scoping before status filtering and pagination;
the view itself is not an authorization boundary. Completion changes appear
immediately without refreshing the view. Users and Academy document the view's
column dependencies in their summaries: migrations that drop or change a
referenced column's type must drop and recreate the view in the same migration.
The academy still owns the validity
period; SQL receives that period rather than hardcoding it. Importing the
shared policy constant is a deliberate exception to cross-module use-case
composition; no wrapper use case or duplicate definition is needed.

The SQL normalizes pg's timestamp-without-time-zone interpretation to UTC before
adding calendar months, matching Academy's month-end clamping across leap days
and daylight-saving transitions. Status boundaries use the same captured clock
and exact 30-day window as the TypeScript policy. Integration tests compare the
SQL output against that policy in the regular backend suite. Run the local
timezone parity check below when changing expiry rules or timestamp handling.
Calendar-policy changes must update the TypeScript function and reporting SQL together. Keeping
SQL filtering and urgency ordering avoids loading the entire organization for
every table page; calculating statuses only after pagination would produce
incorrect filtered totals and ordering. Name ordering uses PostgreSQL's ICU root
collation, followed by user ID for stable pagination.

Default order is most-urgent-first (`expired`, `expiring_soon`, `not_passed`,
`valid`, then name and user ID). Export uses the same filters and order without
pagination. Existing org/user indexes and the unique completion user ID support
the join. `CreateAcademyCertificateMembersView` creates the view; no new table
or materialized copy is added.

## Timezone parity check

The normal backend suite runs the reporting integration tests in CI's default
timezone. When changing certificate expiry, SQL timestamp conversion or pg/TypeORM
timestamp handling, run the same suite in four timezones from `ayunis-core-backend/`:

```sh
for certificate_timezone in UTC Europe/Berlin America/New_York Australia/Lord_Howe; do
  NODE_ENV=test TZ="$certificate_timezone" pnpm test --runInBand --testPathPatterns=org-certificate-statuses.repository.integration.spec
done
```

This exercises UTC, different daylight-saving transitions and Lord Howe's
30-minute shift without adding feature-specific steps to the general CI workflow.

## Member certificate download

`GetOrgMemberCertificateUseCase` lets an admin download a member's
Teilnahmebestätigung for the personnel file. It resolves the member through
`FindUsersByIdsUseCase`, which is scoped to the caller's org, and additionally
compares the member's `orgId` with the admin's: an unknown id and a member of
another org both answer `OrgMemberNotFoundError` (404), so the endpoint cannot
be used to probe whether a user id exists elsewhere. The PDF itself comes from
the academy's exported `GetAcademyCertificateUseCase`, so the admin receives
exactly the file the member would; a member without a completion surfaces the
academy's own `AcademyCompletionNotFoundError` (404).

## Layout

Standard hexagonal: `domain/` (settings entity + mode and validity-status
enums), `application/` (port, errors, decorator, guard, use cases, the
`OrgCertificateStatus` model, pure status and criteria utils), `infrastructure/persistence/postgres/` (records, mapped view, mapper and repository),
`presenters/http/`.
