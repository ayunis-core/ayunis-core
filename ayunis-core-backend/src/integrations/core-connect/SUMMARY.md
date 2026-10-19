Core Connect Service Authentication
Authenticates Ayunis Core Connect without a browser session or organization scope.

`CoreConnectAuthGuard` accepts `Authorization: Bearer <token>` using the
`coreConnect.serviceToken` configuration, loaded from `CORE_CONNECT_SERVICE_TOKEN`.
Missing, blank, malformed, and incorrect credentials are rejected with HTTP 401.
Token digests are compared in constant time. No user identity or super-admin role
is assigned, so the credential cannot authenticate ordinary Core endpoints.

`GET /api/internal/core-connect/auth` returns HTTP 204 when authenticated. This is
an authentication check for Connect integration setup, not a subscription sync:
AYC-1366 supplies the sync operation. Service controllers use `@Public()` to defer
browser-session authentication and must also apply `CoreConnectAuthGuard`.
The module exports this guard for the future sync endpoint.

Configure separate tokens in Development and Production. Store the same token in
Core and Connect in Infisical. Generate a token with `openssl rand -hex 32`.
To rotate, update both service configurations and restart them; during a rolling
rotation, requests with the old value fail until both services use the new value.
The API key used to read Fynn and Fynn's webhook signing secret are separate.

Validation: guard tests cover invalid credentials and rotation; HTTP tests exercise
real Nest routing and JWT guard composition, distinct browser/service credentials,
and failure after removing configuration. No database, caches, or UI participate.
