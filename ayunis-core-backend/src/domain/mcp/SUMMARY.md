Protocol Integrations
Model Context Protocol server connections and capability discovery

MCP integrations connect external tool servers to the platform using the Model Context Protocol. Organizations configure predefined, custom, or marketplace integrations with authentication, then discover available tools, resources, and prompts.

The MCP module manages connections to external Model Context Protocol servers at the organization level. Core entities include `McpIntegration` (abstract base with predefined, custom, and marketplace subtypes), `SchemaConfiguredMcpIntegration` (shared org/user configuration schema behavior for custom and marketplace integrations), `McpIntegrationUserConfig` (per-user configuration values), and the per-user OAuth entities `McpOAuthClientRegistration`, `McpOAuthUserToken`, and `McpOAuthPendingSession`. `McpTool`, `McpResource`, and `McpPrompt` are ephemeral entities fetched from remote servers, not persisted locally. Predefined integrations use the authentication entity hierarchy; custom and marketplace integrations map typed organization/user config fields to HTTP headers. OAuth schemas use `authType: OAUTH` plus an `oauth` configuration, normalize scopes, and reserve the Authorization header for OAuth bearer tokens. Migration `1785752072933-BackfillLegacyCustomMcpIntegrations` converts supported legacy custom authentication rows into the schema-configured representation; unsupported or malformed legacy rows fail the migration instead of being silently changed.

**Use Cases:**

- `CreateMcpIntegrationUseCase` — Creates predefined integrations or schema-configured custom integrations
- `InstallMarketplaceIntegrationUseCase` — Installs a marketplace integration by identifier, persisting org-level config values and config schema
- `GetMcpIntegrationUseCase` — Fetches a single integration by ID
- `ListOrgMcpIntegrationsUseCase` — Lists all integrations for the current org
- `ListAvailableMcpIntegrationsUseCase` — Lists enabled integrations for the current org
- `UpdateMcpIntegrationUseCase` — Updates integration settings (name, credentials, org config values, etc.)
- `DeleteMcpIntegrationUseCase` — Deletes an integration and its associated user configs
- `EnableMcpIntegrationUseCase` / `DisableMcpIntegrationUseCase` — Toggles integration enabled state
- `ValidateMcpIntegrationUseCase` — Validates connection to the MCP server
- `ListPredefinedMcpIntegrationConfigsUseCase` — Lists available predefined integration configurations
- `DiscoverMcpCapabilitiesUseCase` — Discovers tools, resources, and prompts from a server
- `ExecuteMcpToolUseCase` — Executes a tool on a remote MCP server
- `RetrieveMcpResourceUseCase` — Retrieves a resource from a remote MCP server
- `GetMcpPromptUseCase` — Fetches a prompt from a remote MCP server
- `SetUserMcpConfigUseCase` — Saves per-user config values for a schema-configured integration
- `GetUserMcpConfigUseCase` — Retrieves per-user config values (with secret masking)

**Services:**

- `McpClientService` — Handles actual server communication via the MCP SDK
- `McpCapabilityCacheService` — In-process TTL cache for discovered capabilities (per integration and user); invalidated on integration update, delete, and user-config changes
- `McpConfigService` — Validates schemas and merges, encrypts, and retains organization/user config values
- `ConnectionValidationService` — Validates MCP server connectivity, used by `ValidateMcpIntegrationUseCase`
- `McpOAuthAuthorizationService` — Starts and completes per-user OAuth authorization and disconnects grants
- `McpOAuthClientConfigurationService` — Validates static client configuration and invalidates issuer-bound OAuth state when it changes
- `McpOAuthProviderFactory` — Implements the SDK OAuth provider with durable discovery, registration, PKCE, tokens, and locked refresh
- `McpOAuthFetchService` — Applies HTTPS, private-address, DNS-pinning, and same-origin redirect protections to every server-side OAuth request

**Ports:**

- `McpIntegrationsRepository` — Persistence port for MCP integrations
- `McpIntegrationUserConfigRepository` — Persistence port for per-user config values
- `McpClientPort` — Abstract port for MCP server communication
- `McpCredentialEncryptionPort` — Abstract port for credential encryption/decryption
- `McpOAuthClientRegistrationRepositoryPort` — Issuer-bound dynamic registrations and one unbound static registration per integration
- `McpOAuthUserTokenRepositoryPort` — Encrypted per-user tokens with a pessimistic-lock transaction seam for refresh
- `McpOAuthPendingSessionRepositoryPort` — Encrypted PKCE sessions with atomic single-use state consumption
- `McpOAuthFetchPort` — Guarded outbound request boundary used by OAuth discovery, registration, token, transport, and revocation flows

**Presenters:**

- `McpIntegrationsController` — REST controller exposing:
  - `POST /mcp-integrations/predefined` — Create predefined integration (admin)
  - `POST /mcp-integrations/custom` — Create custom integration (admin)
  - `POST /mcp-integrations/install-from-marketplace` — Install marketplace integration (admin)
  - `GET /mcp-integrations` — List org integrations (admin)
  - `GET /mcp-integrations/available` — List enabled integrations
  - `GET /mcp-integrations/predefined/available` — List predefined configs (admin)
  - `GET /mcp-integrations/:id` — Get integration by ID (admin)
  - `PATCH /mcp-integrations/:id` — Update integration (admin)
  - `DELETE /mcp-integrations/:id` — Delete integration (admin)
  - `POST /mcp-integrations/:id/enable` — Enable integration (admin)
  - `POST /mcp-integrations/:id/disable` — Disable integration (admin)
  - `POST /mcp-integrations/:id/validate` — Validate connection (admin)
  - `GET /mcp-integrations/:id/user-config` — Get user config (user, admin)
  - `PATCH /mcp-integrations/:id/user-config` — Set user config (user, admin)
  - `POST /mcp-integrations/:id/oauth/authorize` — Start per-user OAuth authorization
  - `POST /mcp-integrations/oauth/complete` — Complete a pending OAuth authorization
  - `DELETE /mcp-integrations/:id/oauth/authorization` — Revoke and remove the current user's OAuth grant
- `McpOAuthMetadataController` — Public OAuth client metadata:
  - `GET /mcp-integrations/oauth/client-metadata.json` — Client ID Metadata Document derived from public URLs

**Module Dependencies:**

- **marketplace** — `InstallMarketplaceIntegrationUseCase` uses `GetMarketplaceIntegrationUseCase` to fetch integration metadata from the marketplace

**Dependent Modules:**

- **agents** — Uses MCP integration assignment for agent tool access
- **tools** — Wraps discovered MCP tools, resources, and prompts as executable tool entities
