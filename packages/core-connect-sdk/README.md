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

The internal client and publishing workflow are added with the internal OpenAPI artifact.

## Validation scope

This is a high-risk service contract and distribution change. Ownership is Core events →
SDK contracts → signed webhook delivery → Connect parser → existing sinks. Billing rules,
persistence and authorization do not move into the SDK.

| Failure mode | Check |
| --- | --- |
| Producer and consumer payloads drift | Regenerated producer fixtures and consumer parsing |
| Legacy payload omits optional end date | Legacy fixture validation |
| Malformed event reaches a sink | Runtime schema rejection |
| Packaging differs between services | ESM and CommonJS packed-package smoke tests |
| Deployment versions diverge incompatibly | Exact consumer pin and consumer-first rollout |
