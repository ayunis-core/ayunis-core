# Connectors Module

Connects an organization to an external product, such as Microsoft 365, so that other features can read from it on the organization's behalf. The module owns one connector per organization and product, its setup, its encrypted credentials and, later, the product-specific clients. Other modules get listings and file contents through its exported use cases; tokens and credentials never leave it.

Everything here is behind the `connectorsEnabled` feature flag (`FEATURE_CONNECTORS_ENABLED`, off by default).

## Domain

- **`Connector`** — `id`, `orgId`, `product`, `setup` (non-secret, product-specific values such as a tenant ID; `{}` when none) and `encryptedCredentials` (the product's secrets encrypted as one value, `null` when there are none). Unique per (`orgId`, `product`). A connector is **set up** while it has credentials, otherwise **not set up**: removing a connection clears its credentials but keeps the connector, so whatever references it reconnects when it is set up again.
- **`ConnectorProduct`** — `microsoft_365`.
- **`ConnectorStatus`** — `set_up`, `not_set_up`.
- **Microsoft 365** (`domain/microsoft-365/`) — the organization's own Entra app: setup `{ tenantId, clientId }` (GUIDs, `GUID_PATTERN`) and credentials `{ clientSecret }`. Client secret only; no certificates.

## Ports

- **`ConnectorsRepository`** — `findAllByOrgId`, `findByOrgIdAndProduct`, `upsert` (one `INSERT … ON CONFLICT (orgId, product)`, so the connector keeps its ID), `updateSetupOfSetUp` (one `UPDATE … WHERE "encryptedCredentials" IS NOT NULL`, so a concurrent removal cannot leave a setup without credentials) and `clearSetupAndCredentials`
- **`ConnectorCredentialEncryptionPort`** — `encrypt` / `decrypt` for credentials at rest

## Use Cases

- **`ListConnectorsUseCase`** — Every available product with its status for the organization of the current user; a product without a connector is not set up
- **`GetMicrosoft365ConnectorUseCase`** — Status, tenant ID and client ID of the organization's Microsoft 365 connector (`Microsoft365ConnectorOverview`, never credentials)
- **`SaveMicrosoft365ConnectorUseCase`** — Sets up or changes the connection. With a client secret, it replaces setup and credentials (`{ clientSecret }` encrypted as one value). Without one, it changes the setup and keeps the stored secret; while the connector is not set up, that fails with `ConnectorCredentialsRequiredError` (`CONNECTOR_CREDENTIALS_REQUIRED`, 400). The secret is never logged.
- **`RemoveConnectionUseCase`** — Clears setup and credentials of a product's connector and keeps the connector; changes nothing while it is not set up

## Infrastructure

- **`LocalConnectorsRepository`** — TypeORM implementation backed by `connectors`. FK to `orgs` with cascade delete.
- **`ConnectorCredentialEncryptionService`** — AES-256-GCM under `CONNECTOR_ENCRYPTION_KEY` (64 hex characters), output `base64(iv + ciphertext + authTag)` like the MCP credentials. The key is required only while the flag is on: the environment validation rejects a boot with the flag on and no key, and rejects a malformed key either way. Without a key the service fails on use, not at startup.

## HTTP API

Controller: `ConnectorsController`, base path `/connectors`, tag `connectors`. Org admins only (`@Roles(ADMIN)`), scoped to the admin's organization. Every route answers 404 while the flag is off.

| Method | Path                        | Description                                                                                             |
| ------ | --------------------------- | ------------------------------------------------------------------------------------------------------- |
| GET    | `/connectors`               | Every available product with its status, never its setup or credentials                                 |
| GET    | `/connectors/microsoft-365` | Status, tenant ID and client ID; never the client secret                                                |
| PUT    | `/connectors/microsoft-365` | Set up or change: `tenantId`, `clientId` (GUIDs), optional `clientSecret` (omit to keep the stored one) |
| DELETE | `/connectors/microsoft-365` | Remove the connection (204): deletes setup and credentials, keeps the connector                         |

## Consumers

- Frontend: admin settings → **Integrations** (`/admin-settings/integrations`), in the Connections section above the MCP integrations, and its Microsoft 365 page (`/admin-settings/integrations/microsoft-365`).
