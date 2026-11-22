# Connectors Module

Connects an organization to an external product, such as Microsoft 365, so that other features can read from it on the organization's behalf. The module owns one connector per organization and product, its setup and its encrypted credentials; each product is a **provider** in `providers/<provider>/` with its own layers and NestJS module. Other modules get listings and file contents through its exported use cases; tokens and credentials never leave it.

Everything here is behind the `connectorsEnabled` feature flag (`FEATURE_CONNECTORS_ENABLED`, off by default).

## Structure

- **Core** (everything outside `providers/`) — product-neutral: the `Connector` entity, credential encryption, the `ConnectorSyncAdapter` contract and its registry, and the generic use cases and endpoint. It never imports a provider (dependency-cruiser rule `connectors-core-no-providers`). `ConnectorsInternalModule` holds the repository, the credential encryption and the adapter registry, for the core and the providers only; `ConnectorsCoreModule` holds the generic use cases and endpoint and exports only the use cases.
- **Providers** (`providers/<provider>/`) — one NestJS module each, with its own `domain/`, `application/`, `infrastructure/` and `presenters/` (the layer rules apply to them as to modules). A provider imports `ConnectorsCoreModule` and `ConnectorsInternalModule` and registers its adapter with `ConnectorSyncAdapterRegistry` in its module's constructor, so it is registered before any lifecycle hook can start a sync. Providers: [Microsoft 365](providers/microsoft-365/SUMMARY.md) (SharePoint, credential scope `org`).
- **`ConnectorsModule`** — what other modules import: the core plus every provider module, re-exporting the core's use cases only, so other modules never get the repository or the credential encryption. Importing it is what gives the API and the ingestion worker (through `KnowledgeBaseSyncModule`) every product's adapter. A new provider is added here.

## Domain

- **`Connector`** — `id`, `orgId`, `product`, `setup` (non-secret, product-specific values such as a tenant ID; `{}` when none) and `encryptedCredentials` (the product's secrets encrypted as one value, `null` when there are none). Unique per (`orgId`, `product`). A connector is **set up** while it has credentials, otherwise **not set up**: removing a connection clears its credentials but keeps the connector, so whatever references it reconnects when it is set up again.
- **`ConnectorProduct`** — `microsoft_365`.
- **`ConnectorStatus`** — `set_up`, `not_set_up`.
- **`ConnectorCredentialScope`** — whose credentials a provider connects with: `org` (the admin enters everything, including the secret) or `user` (the admin enters the org settings, each user adds their own credentials for the connection). Declared by each provider's adapter; only `org` is implemented (Microsoft 365). An admin always creates and allows the connection.
- **`ConnectorItem`** (`domain/sync/`) — a file below a synced location as a provider lists it: `id` (stable across renames and moves), `path` below the location, `name`, `version` (changes with the content), `size` and an optional `unprocessableReason` (`unsupported_type`, `too_large`, `encrypted`) the provider already knows.

## Ports

- **`ConnectorsRepository`** — `findAllByOrgId`, `findById`, `findByOrgIdAndProduct`, `upsert` (one `INSERT … ON CONFLICT (orgId, product)`, so the connector keeps its ID), `updateSetupOfSetUp` (one `UPDATE … WHERE "encryptedCredentials" IS NOT NULL`, so a concurrent removal cannot leave a setup without credentials) and `clearSetupAndCredentials`
- **`ConnectorCredentialEncryptionPort`** — `encrypt` / `decrypt` for credentials at rest
- **`ConnectorSyncAdapter`** — the provider contract: its `product` and `credentialScope`, how it syncs a location (`listChanges(connector, location, cursor)` and `fetchContent(connector, location, itemId)`, returning the outcomes in `application/models/connector-sync-results.ts`) and `resolveLocation(connector, location)`, which checks a pasted URL before it is added (`ConnectorLocationResolution`, `application/models/connector-location-resolution.ts`: `found` with `kind`, `name` and `location` (the provider's own URL, to add), `not_granted` or `not_found_or_not_granted` with a `grant` (`scope`, `command`), `not_found`, `unsupported_url`; kinds and scopes are the provider's terms). `resolveLocation` throws an `ApplicationError` when the connector cannot be used, e.g. `CONNECTOR_CONNECTION_FAILED`. `ConnectorSyncAdapterRegistry` holds one adapter per product; providers `register` theirs.

## Application Services

- **`ConnectorSyncAccessService`** — `resolve(connectorId, orgId)`: the connector with its product's adapter, or `null` while the connector is gone, belongs to another organization, is not set up or its product has no adapter.

## Sync contract

The sync engine (`domain/knowledge-base-sync`) sees only these outcomes, never tokens or credentials:

- **Changes** — `{ outcome: 'changes', items, removedItemIds, cursor, fullListing }`: added and changed items (renames and moves included) and the IDs of deleted or moved-out items, which may include IDs never listed. The cursor is opaque and passed back next time (`null` the first time). `fullListing: true` means the items are everything below the location, e.g. after the provider demanded a resync; whatever is not listed is gone.
- **Content** — `{ outcome: 'content', content (a stream), size }`, or `gone` when the item no longer exists, or `unprocessable` with a `reason` the provider only knows once it read the item (e.g. `encrypted`).
- **`access_lost`** — the grant was revoked, or the connector is gone or not set up.
- **`throttled`** — `{ retryAt }`, for the back-off (AYC-1885).

## Use Cases

- **`ListConnectorsUseCase`** (exported) — Every available product with its status and connector ID (`null` without a connector) for the organization of the current user; a product without a connector is not set up. The sync engine reads from it which product a location's connector is and which products may be added.
- **`ListConnectorChangesUseCase`** / **`FetchConnectorItemContentUseCase`** (exported) — The changes below a location since a cursor, and one item's content, with the organization's own connector access. Run without a user (sync jobs), so the organization comes with the command; `access_lost` whenever `ConnectorSyncAccessService` resolves nothing.
- **`FindSetUpConnectorUseCase`** (exported) — The ID of the current user's organization's set-up connector for a product, for referencing it; `ConnectorNotSetUpError` otherwise.
- **`ResolveConnectorLocationUseCase`** (exported) — Checks a pasted location URL through the current user's organization's connector for the product (`resolveLocation` of its adapter) before it is added as a location. `CONNECTOR_NOT_SET_UP` (404) while the connector is not set up or the product has no adapter; otherwise whatever the adapter returns or throws. Microsoft 365 exposes it to every member through `SharePointLocationsController`.
- **`RemoveConnectionUseCase`** (exported, for the providers' controllers) — Clears setup and credentials of a product's connector and keeps the connector; changes nothing while it is not set up

## Infrastructure

- **`LocalConnectorsRepository`** — TypeORM implementation backed by `connectors`. FK to `orgs` with cascade delete.
- **`ConnectorCredentialEncryptionService`** — AES-256-GCM under `CONNECTOR_ENCRYPTION_KEY` (64 hex characters), output `base64(iv + ciphertext + authTag)` like the MCP credentials. The key is required only while the flag is on: the environment validation rejects a boot with the flag on and no key, and rejects a malformed key either way. Without a key the service fails on use, not at startup.

## HTTP API

Controller: `ConnectorsController`, base path `/connectors`, tag `connectors`. Org admins only (`@Roles(ADMIN)`), scoped to the admin's organization. Every route answers 404 while the flag is off. Each provider adds its own routes below `/connectors/<provider>` (Microsoft 365: [its summary](providers/microsoft-365/SUMMARY.md)).

| Method | Path          | Description                                                             |
| ------ | ------------- | ----------------------------------------------------------------------- |
| GET    | `/connectors` | Every available product with its status, never its setup or credentials |

## Consumers

- `domain/knowledge-base-sync`: synced knowledge base locations reference a connector by ID and sync through the exported use cases.
- Frontend: admin settings → **Integrations** (`/admin-settings/integrations`), in the Connections section above the MCP integrations, linking to each provider's page.
