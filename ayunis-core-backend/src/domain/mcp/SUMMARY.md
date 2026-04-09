Protocol Integrations
Model Context Protocol server connections and capability discovery

MCP integrations connect external tool servers to the platform using the Model Context Protocol. Organizations configure predefined, custom, marketplace, or self-defined integrations with authentication, then discover available tools, resources, and prompts.

The MCP module manages connections to external Model Context Protocol servers at the organization level. Core entities include `McpIntegration` (abstract base with four subtypes — predefined, custom, marketplace, and self-defined — corresponding to the `McpIntegrationKind.PREDEFINED` / `CUSTOM` / `MARKETPLACE` / `SELF_DEFINED` enum variants), `McpIntegrationUserConfig` (per-user configuration values for marketplace and self-defined integrations), `McpIntegrationOAuthToken` (encrypted OAuth access/refresh tokens with optional expiry and scope; `userId === null` is an org-level token, non-null is a per-user token; tri-state preserve/clear/replace `updateTokens()` for RFC 6749 §6 refresh-token rotation), `McpTool`, `McpResource`, and `McpPrompt`—the latter three are ephemeral entities fetched from remote servers, not persisted locally. Authentication is handled through a hierarchy supporting bearer tokens, custom headers, OAuth, and no-auth. `MarketplaceMcpIntegration` adds a marketplace identifier, a typed config schema (org-level and user-level fields), and org-level config values. `SelfDefinedMcpIntegration` is the self-hosted analog of marketplace integrations — admin-authored locally with the same config schema (`orgFields`, `userFields`, optional `oauth`), persisted with the same per-user config table, but without a marketplace identifier or logo. The `McpIntegration` abstract base also carries optional OAuth client credential fields (`oauthClientId`, `oauthClientSecretEncrypted`), writable only for `MARKETPLACE` and `SELF_DEFINED` integrations via `setOAuthClientCredentials()` / `clearOAuthClientCredentials()`; the matching persistence columns and use cases land in later steps.

**Use Cases:**
- `CreateMcpIntegrationUseCase` — Creates predefined or custom integrations
- `InstallMarketplaceIntegrationUseCase` — Installs a marketplace integration by identifier, persisting org-level config values and config schema
- `GetMcpIntegrationUseCase` — Fetches a single integration by ID
- `ListOrgMcpIntegrationsUseCase` — Lists all integrations for the current org
- `ListAvailableMcpIntegrationsUseCase` — Lists enabled integrations for the current org
- `UpdateMcpIntegrationUseCase` — Updates integration settings (name, credentials, org config values, etc.)
- `CreateSelfDefinedMcpIntegrationUseCase` — Creates a self-defined integration with admin-authored config schema
- `DeleteMcpIntegrationUseCase` — Deletes an integration, its associated user configs, and OAuth tokens
- `EnableMcpIntegrationUseCase` / `DisableMcpIntegrationUseCase` — Toggles integration enabled state
- `ValidateMcpIntegrationUseCase` — Validates connection to the MCP server
- `ListPredefinedMcpIntegrationConfigsUseCase` — Lists available predefined integration configurations
- `DiscoverMcpCapabilitiesUseCase` — Discovers tools, resources, and prompts from a server
- `ExecuteMcpToolUseCase` — Executes a tool on a remote MCP server
- `RetrieveMcpResourceUseCase` — Retrieves a resource from a remote MCP server
- `GetMcpPromptUseCase` — Fetches a prompt from a remote MCP server
- `SetUserMcpConfigUseCase` — Saves per-user config values for a marketplace integration
- `GetUserMcpConfigUseCase` — Retrieves per-user config values (with secret masking)
- `StartMcpOAuthAuthorizationUseCase` — Initiates OAuth authorization flow, returns authorization URL
- `CompleteMcpOAuthAuthorizationUseCase` — Handles OAuth callback, exchanges code for tokens
- `RevokeMcpOAuthAuthorizationUseCase` — Revokes stored OAuth tokens
- `GetMcpOAuthAuthorizationStatusUseCase` — Returns authorization status for an integration

**Services:**
- `McpClientService` — Handles actual server communication via the MCP SDK
- `MarketplaceConfigService` — Resolves effective server URL and auth headers by merging org-level and user-level config values against the integration's config schema
- `ConnectionValidationService` — Validates MCP server connectivity, used by `ValidateMcpIntegrationUseCase`
- `OAuthFlowService` — Orchestrates OAuth 2.1 + PKCE flows (authorization URL building, code exchange, lazy token refresh, revocation, status queries)

**Ports:**
- `McpIntegrationsRepository` — Persistence port for MCP integrations
- `McpIntegrationUserConfigRepository` — Persistence port for per-user config values
- `McpClientPort` — Abstract port for MCP server communication
- `McpCredentialEncryptionPort` — Abstract port for credential encryption/decryption
- `McpIntegrationOAuthTokenRepositoryPort` — Abstract repository for OAuth token persistence
- `McpOAuthStatePort` — Abstract port for signing/verifying OAuth state JWTs

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
  - `POST /mcp-integrations/self-defined` — Create self-defined integration (admin)
  - `POST /mcp-integrations/:id/oauth/authorize` — Start OAuth authorization (user, admin)
  - `GET /mcp-integrations/oauth/callback` — OAuth callback (public)
  - `POST /mcp-integrations/:id/oauth/revoke` — Revoke OAuth authorization (user, admin)
  - `GET /mcp-integrations/:id/oauth/status` — Get OAuth authorization status (user, admin)

**Module Dependencies:**
- **marketplace** — `InstallMarketplaceIntegrationUseCase` uses `GetMarketplaceIntegrationUseCase` to fetch integration metadata from the marketplace

**Dependent Modules:**
- **agents** — Uses MCP integration assignment for agent tool access
- **tools** — Wraps discovered MCP tools, resources, and prompts as executable tool entities
