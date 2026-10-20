Core Connect Service Authentication
Authenticates Ayunis Core Connect without a browser session or organization scope.

`CoreConnectAuthGuard` accepts `Authorization: Bearer <token>` using the
`coreConnect.serviceToken` configuration, loaded from `CORE_CONNECT_SERVICE_TOKEN`.
Missing, blank, malformed, and incorrect credentials are rejected with HTTP 401.
Token digests are compared in constant time. No user identity or super-admin role
is assigned, so the credential cannot authenticate ordinary Core endpoints.

`CoreConnectModule` exports the guard for internal integration controllers.
Consumers import this module and apply both `@Public()` to defer browser-session
authentication and `@UseGuards(CoreConnectAuthGuard)` to require the service token.
This module exposes no HTTP routes; AYC-1366 supplies the subscription sync routes.

Configure separate tokens in Development and Production. Store the same token in
Core and Connect in Infisical. Generate a token with `openssl rand -hex 32`.
To rotate, update both service configurations and restart them; during a rolling
rotation, requests with the old value fail until both services use the new value.
Provider API credentials and webhook signing secrets belong only in Connect.

Validation: guard tests cover invalid credentials and rotation; HTTP tests exercise
real Nest routing and JWT guard composition, distinct browser/service credentials,
and failure after removing configuration. No database, caches, or UI participate.
