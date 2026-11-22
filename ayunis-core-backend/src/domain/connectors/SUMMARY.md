# Connectors Module

Connects an organization to an external product, such as Microsoft 365, so that other features can read from it on the organization's behalf. The module owns one connector per organization and product, its setup, its encrypted credentials and, later, the product-specific clients. Other modules get listings and file contents through its exported use cases; tokens and credentials never leave it.

Everything here is behind the `connectorsEnabled` feature flag (`FEATURE_CONNECTORS_ENABLED`, off by default).

## Domain

- **`Connector`** — `id`, `orgId`, `product`, `setup` (non-secret, product-specific values such as a tenant ID; `{}` when none) and `encryptedCredentials` (the product's secrets encrypted as one value, `null` when there are none). Unique per (`orgId`, `product`). A connector is **set up** while it has credentials, otherwise **not set up**: removing a connection clears its credentials but keeps the connector, so whatever references it reconnects when it is set up again.
- **`ConnectorProduct`** — `microsoft_365`.
- **`ConnectorStatus`** — `set_up`, `not_set_up`.

## Ports

- **`ConnectorsRepository`** — `findAllByOrgId`
- **`ConnectorCredentialEncryptionPort`** — `encrypt` / `decrypt` for credentials at rest

## Use Cases

- **`ListConnectorsUseCase`** — Every available product with its status for the organization of the current user; a product without a connector is not set up

## Infrastructure

- **`LocalConnectorsRepository`** — TypeORM implementation backed by `connectors`. FK to `orgs` with cascade delete.
- **`ConnectorCredentialEncryptionService`** — AES-256-GCM under `CONNECTOR_ENCRYPTION_KEY` (64 hex characters), output `base64(iv + ciphertext + authTag)` like the MCP credentials. The key is required only while the flag is on: the environment validation rejects a boot with the flag on and no key, and rejects a malformed key either way. Without a key the service fails on use, not at startup.

## HTTP API

Controller: `ConnectorsController`, base path `/connectors`, tag `connectors`. Org admins only (`@Roles(ADMIN)`), scoped to the admin's organization. Every route answers 404 while the flag is off.

| Method | Path          | Description                                                             |
| ------ | ------------- | ----------------------------------------------------------------------- |
| GET    | `/connectors` | Every available product with its status, never its setup or credentials |

## Consumers

- Frontend: admin settings → **Integrations** (`/admin-settings/integrations`), in the Connections section above the MCP integrations.
