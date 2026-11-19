# Connectors Module

Connects an organization to an external product, such as Microsoft 365, so that other features can read from it on the organization's behalf. The module owns one connector per organization and product, its setup, its encrypted credentials and, later, the product-specific clients. Other modules get listings and file contents through its exported use cases; tokens and credentials never leave it.

Everything here is behind the `connectorsEnabled` feature flag (`FEATURE_CONNECTORS_ENABLED`, off by default).

## Domain

- **`Connector`** — `id`, `orgId`, `product`, `setup` (non-secret, product-specific values such as a tenant ID; `{}` when none) and `encryptedCredentials` (the product's secrets encrypted as one value, `null` when there are none). Unique per (`orgId`, `product`). A connector is **set up** while it has credentials, otherwise **not set up**: removing a connection clears its credentials but keeps the connector, so whatever references it reconnects when it is set up again.
- **`ConnectorProduct`** — `microsoft_365`.
- **`ConnectorStatus`** — `set_up`, `not_set_up`.
- **Microsoft 365** (`domain/microsoft-365/`) — the organization's own Entra app: setup `{ tenantId, clientId }` (GUIDs, `GUID_PATTERN`) and credentials `{ clientSecret }`. Client secret only; no certificates. `MICROSOFT_365_PERMISSIONS` lists the Microsoft Graph application permissions Ayunis uses: `Sites.Selected` (required), `Files.SelectedOperations.Selected` and `Lists.SelectedOperations.Selected` (optional). `Microsoft365ConnectionTestOutcome` is the result of a connection test: `connected` or the setup mistake that stops it (`tenant_not_found`, `client_not_found`, `client_secret_invalid`, `client_secret_expired`, `consent_missing`, `consent_on_wrong_api`, `required_permission_missing`, `rejected` for any other refusal, `microsoft_unavailable`).

## Ports

- **`ConnectorsRepository`** — `findAllByOrgId`, `findByOrgIdAndProduct`, `upsert` (one `INSERT … ON CONFLICT (orgId, product)`, so the connector keeps its ID), `updateSetupOfSetUp` (one `UPDATE … WHERE "encryptedCredentials" IS NOT NULL`, so a concurrent removal cannot leave a setup without credentials) and `clearSetupAndCredentials`
- **`ConnectorCredentialEncryptionPort`** — `encrypt` / `decrypt` for credentials at rest
- **`EntraAppTokenPort`** — `requestToken(credentials, resource)`: an app-only token (client credentials flow) for Microsoft Graph or SharePoint, with the application permissions (`roles` claim) granted in it, or Entra's refusal (`EntraTokenRejection` plus its `AADSTS…` code). Throws a `ProviderUnavailableError` when Entra cannot be reached, times out or answers 5xx/429.

## Application Services

- **`Microsoft365AppTokenService`** — `requestToken(connector, resource)`: decrypts the connector's stored secret and requests an app-only token. Tokens and the secret stay inside the module; SharePoint ingestion reuses this service. `ConnectorNotSetUpError` while the connector has no credentials.
- **`Microsoft365ConnectionTestService`** — `test(connector)`: requests a Graph token and compares its roles with `MICROSOFT_365_PERMISSIONS`. A Graph token without roles is followed by a SharePoint token, which tells missing admin consent (`consent_missing`) from permissions added on the SharePoint API instead of Microsoft Graph (`consent_on_wrong_api`). Entra being unavailable is the outcome `microsoft_unavailable`; the failure is still reported to AppSignal (`reportUnexpectedError`). It does not read the app registration, which would need `Application.Read.All`. Returns `Microsoft365ConnectionTestResult`: outcome, the permissions Ayunis uses with whether each is granted, other granted Graph permissions, Entra's error code; never the token.

## Use Cases

- **`ListConnectorsUseCase`** — Every available product with its status for the organization of the current user; a product without a connector is not set up
- **`GetMicrosoft365ConnectorUseCase`** — Status, tenant ID and client ID of the organization's Microsoft 365 connector (`Microsoft365ConnectorOverview`, never credentials)
- **`SaveMicrosoft365ConnectorUseCase`** — Sets up or changes the connection. With a client secret, it replaces setup and credentials (`{ clientSecret }` encrypted as one value). Without one, it changes the setup and keeps the stored secret; while the connector is not set up, that fails with `ConnectorCredentialsRequiredError` (`CONNECTOR_CREDENTIALS_REQUIRED`, 400). Then it tests the saved connection and returns the result with the overview. The secret is never logged.
- **`TestMicrosoft365ConnectionUseCase`** — Tests the organization's Microsoft 365 connection; `ConnectorNotSetUpError` (`CONNECTOR_NOT_SET_UP`, 404) while it is not set up
- **`RemoveConnectionUseCase`** — Clears setup and credentials of a product's connector and keeps the connector; changes nothing while it is not set up

## Infrastructure

- **`LocalConnectorsRepository`** — TypeORM implementation backed by `connectors`. FK to `orgs` with cascade delete.
- **`EntraAppTokenService`** — `EntraAppTokenPort` over Entra's v2.0 token endpoint (`POST {login}/{tenantId}/oauth2/v2.0/token`, scope `https://graph.microsoft.com/.default` or SharePoint Online's app ID `00000003-0000-0ff1-ce00-000000000000/.default`, 15 s timeout). Reads `roles` from the token without verifying it: it comes straight from Entra over TLS and is only passed back to Microsoft. Classifies `AADSTS90002`/`900023` (tenant not found), `700016` (client not found), `7000215` (invalid secret, also a secret ID entered as the secret) and `7000222` (expired secret); any other 4xx is another rejection. Transport failures, timeouts, 5xx and 429 go through `wrapProviderFailure` (provider `microsoft_entra`). `MICROSOFT_LOGIN_URL` (`connectors.microsoftLoginOrigin`, default `https://login.microsoftonline.com`) only points the e2e backend at a stand-in.
- **`ConnectorCredentialEncryptionService`** — AES-256-GCM under `CONNECTOR_ENCRYPTION_KEY` (64 hex characters), output `base64(iv + ciphertext + authTag)` like the MCP credentials. The key is required only while the flag is on: the environment validation rejects a boot with the flag on and no key, and rejects a malformed key either way. Without a key the service fails on use, not at startup.

## HTTP API

Controller: `ConnectorsController`, base path `/connectors`, tag `connectors`. Org admins only (`@Roles(ADMIN)`), scoped to the admin's organization. Every route answers 404 while the flag is off.

| Method | Path                             | Description                                                                                                                                                             |
| ------ | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/connectors`                    | Every available product with its status, never its setup or credentials                                                                                                 |
| GET    | `/connectors/microsoft-365`      | Status, tenant ID and client ID; never the client secret                                                                                                                |
| PUT    | `/connectors/microsoft-365`      | Set up or change: `tenantId`, `clientId` (GUIDs), optional `clientSecret` (omit to keep the stored one); returns the overview with `connectionTest`                     |
| POST   | `/connectors/microsoft-365/test` | Test the connection: `outcome`, `permissions` (`name`, `required`, `granted`), `otherGrantedPermissions`, `entraErrorCode`; 404 `CONNECTOR_NOT_SET_UP` while not set up |
| DELETE | `/connectors/microsoft-365`      | Remove the connection (204): deletes setup and credentials, keeps the connector                                                                                         |

## Consumers

- Frontend: admin settings → **Connections** (`/admin-settings/connections`, "Members & Access" group) and its Microsoft 365 page (`/admin-settings/connections/microsoft-365`), which shows the connection test after saving and runs it again on request.
