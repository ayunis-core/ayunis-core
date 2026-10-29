# Ayunis Connect SDK

Source of truth for Core-to-Connect webhook contracts and the internal Core API client.
Core imports `@ayunis-core/connect-sdk/contracts`; Connect also uses the `/client` entry
when the generated client is included. The package contains JSON schemas, inferred types,
producer fixtures and transport code. Domain entities and subscription policy stay in Core.

Build with `pnpm --filter @ayunis-core/connect-sdk build` before consuming it.
The package supports ESM and CommonJS; Zod is a peer dependency. Core uses this workspace
package directly. External consumers install exact versions from GitHub Packages.

## Compatibility

Breaking changes require an explicit consumer-first rollout and a major version after
1.0. Optional fields preserve compatibility with older producers. Never replace a published
version. Producer fixtures are generated from actual Core event constructors and consumed
by Connect's validation tests. Dates on the wire are ISO strings.

## Client

```ts
import { createCoreClient } from "@ayunis-core/connect-sdk/client";

const core = createCoreClient({
  baseUrl: config.coreApiUrl,
  token: config.serviceToken,
});
const prepared = await core.prepareExternalSubscription(
  orgId,
  { mode: "sync" },
  { signal },
);
if (!prepared.ok) throw new Error(`Preparation failed: ${prepared.status}`);
// Fetch current provider state after obtaining the revision, then normalize it.
await core.applyExternalSubscription(
  orgId,
  {
    revision: prepared.data.revision,
    ownerId: externalOwnerId,
    subscription: normalizedSubscription,
    academyActive,
    revoke: false,
  },
  { deliveryId, signal },
);
```

The generated client uses Core's internal OpenAPI artifact. Native Fetch attaches the
service token, refuses redirects, serializes JSON bodies and query parameters, and returns
`{ ok: true, status, data }` or `{ ok: false, status }`. Successful data is typed from the actual Core DTOs; non-success bodies are discarded. Calls accept an AbortSignal; absent a caller deadline, they time out after 30 seconds.
The SDK does not call billing providers, retry, reconcile, choose fallbacks or decide subscription access. Connect owns provider orchestration; Core owns atomic local access changes.
Core imports only `/contracts`, which has no HTTP client side effects.

## GitHub Packages

Published as `@ayunis-core/connect-sdk` at `https://npm.pkg.github.com`, linked to
`ayunis-core/ayunis-core`. New packages are private by default. Grant the Connect repository
Read permission in the package's Manage Actions access settings before its CI installs it.
Local developers need a classic GitHub token with `read:packages`; keep it in the environment
or the user's npm configuration, never in source or image layers.

The Publish Connect SDK workflow builds, validates, packs and publishes the same artifact.
Only its publish job receives `packages: write`. The existing SDK branch publishes unique
`<package-version>-preview.<run>.<attempt>` versions under the `next` dist-tag for pre-merge validation.
A `connect-sdk-v<version>` tag publishes a stable release only when it matches package.json.
Manual dispatch publishes a preview. Consumers pin an exact version and lockfile integrity;
Connect's dependency-update automation proposes newer releases for compatibility CI.
Never overwrite a published version or install a floating `latest` in production.

Regenerate with `pnpm --filter @ayunis-core/connect-sdk generate`; CI checks for drift.
Run build, lint, typecheck and tests before publication. Packed-package ESM/CommonJS and
real HTTP tests cover authentication, delivery metadata, encoding, redirects, statuses and cancellation.

## Validation scope

This is a high-risk service contract and distribution change. Ownership is Core events →
SDK contracts → signed webhook delivery → Connect parser → existing sinks. Billing rules,
persistence and authorization do not move into the SDK.

| Failure mode                             | Check                                              |
| ---------------------------------------- | -------------------------------------------------- |
| Producer and consumer payloads drift     | Regenerated producer fixtures and consumer parsing |
| Legacy payload omits optional end date   | Legacy fixture validation                          |
| Malformed event reaches a sink           | Runtime schema rejection                           |
| Packaging differs between services       | ESM and CommonJS packed-package smoke tests        |
| Deployment versions diverge incompatibly | Exact consumer pin and consumer-first rollout      |

## Supported release compatibility

Version 0.3 replaces vendor-specific trigger operations with provider-neutral prepare,
apply, ownership lookup and reconciliation lease operations. It adds typed JSON data
responses, removes the unused acknowledgement-only type and requires callers to send
normalized state after a fresh preparation. Connect holds provider credentials; Core
keeps its subscription rules, transaction, ownership and stale-update checks.

Package checks install the candidate tarball and the exact baseline release from
sdkCompatibility.baselineVersion. Both directions of producer fixtures and public
client/envelope type assignability are checked with TypeScript 5.8.2. Incompatible
changes require a major version (a new minor before 1.0); compatible patches stay
within the supported line. Strict readers still require consumer-first rollout
for added fields or events. Update the baseline deliberately after a supported
release is adopted; never replace a published version. ESM and CommonJS consumers
are typechecked against the minimum supported Zod and compiler versions.
