# Core Connect internal API

`core-connect.openapi.json` is generated from Core's actual internal sync controllers.
Run `pnpm --filter core-backend contracts:openapi` to regenerate. Do not edit it.
The exporter needs no database, Fynn credentials or running backend.

Connect pins this artifact and generates its HTTP client with Orval. Update the
artifact and consumer together when changing a route, parameter, status or response.
The runtime public Swagger document continues to exclude these controllers.

This high-risk contract change preserves authentication and synchronization behavior.
Tests cover internal operation IDs, UUID paths, optional delivery headers, typed
responses, bearer security and absence from public paths and models. Existing
controller HTTP tests cover authentication, flag gating and provider failures.
CI regenerates the artifact and fails on drift. No persistence or billing logic changes.
