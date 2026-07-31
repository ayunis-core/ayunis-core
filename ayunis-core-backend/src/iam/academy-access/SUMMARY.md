# Academy Access

Per-org gate tying **Ayunis Core chat** to the KI-Führerschein certificate
issued by the academy (`src/domain/academy`). An org admin picks one of three
`AcademyAccessMode`s; users without a valid certificate cannot start or advance
a conversation, while the academy itself stays reachable so they can earn one.

## Model

`OrgAcademyAccessSettings` — `{ id, orgId, mode }`, one row per org
(`org_academy_access_settings`, unique `orgId`, FK to `orgs` `ON DELETE
CASCADE`). **An absent row means `UNRESTRICTED`**, applied in the entity
constructor, so the migration leaves every existing org ungated.

`AcademyAccessMode`:

- `unrestricted` — no gate (default, and the pre-gate behaviour)
- `required_once` — the certificate must be earned once; the pass is permanent
- `required_annually` — the certificate must be renewed every 12 months

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
   `completedAt`/`expiresAt`. Only the academy knows the validity period; this
   module never imports it.

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
  gate *and* issues API keys retains an ungated inference path.
- `shares` — org-sharing admin surface; gating it would stop a lapsed user from
  *un*sharing.

## HTTP

`AcademyAccessController` (`academy-access`):

- `GET status` — any authenticated user, **not** gated (a blocked user has to be
  able to read why). Returns the evaluation above.
- `GET`/`PUT org-settings` — `@Roles(ADMIN)`.

## Layout

Standard hexagonal: `domain/` (settings entity + mode enum), `application/`
(port, errors, decorator, guard, use cases), `infrastructure/persistence/postgres/`
(record + mapper + repository), `presenters/http/`.
