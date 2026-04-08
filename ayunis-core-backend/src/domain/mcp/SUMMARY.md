Protocol Integrations
Model Context Protocol server connections and capability discovery

MCP integrations connect external tool servers to the platform using the Model Context Protocol. Organizations configure predefined, custom, marketplace, or self-defined integrations with authentication, then discover available tools, resources, and prompts.

The MCP module manages connections to external Model Context Protocol servers at the organization level. Core entities include `McpIntegration` (abstract base with predefined, custom, marketplace, and self-defined subtypes), `McpIntegrationUserConfig` (per-user configuration values for marketplace integrations), `McpIntegrationOAuthToken` (stored OAuth access/refresh tokens keyed by integration and optional user), `McpTool`, `McpResource`, and `McpPrompt`—the latter three are ephemeral entities fetched from remote servers, not persisted locally. The base `McpIntegration` class carries optional `oauthClientId` and `oauthClientSecretEncrypted` fields for OAuth client credential support. Authentication is handled through a hierarchy supporting bearer tokens, custom headers, OAuth, and no-auth. `MarketplaceMcpIntegration` adds a marketplace identifier, a typed config schema (org-level and user-level fields), and org-level config values. `SelfDefinedMcpIntegration` uses the same `IntegrationConfigSchema` shape as marketplace integrations but is authored locally by an org admin via a raw configuration schema, with auth handled via config fields and optionally the dedicated OAuth token entity.

**Use Cases:**
- `CreateMcpIntegrationUseCase` — Creates predefined or custom integrations
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
- `SetUserMcpConfigUseCase` — Saves per-user config values for a marketplace integration
- `GetUserMcpConfigUseCase` — Retrieves per-user config values (with secret masking)

**Services:**
- `McpClientService` — Handles actual server communication via the MCP SDK
- `MarketplaceConfigService` — Resolves effective server URL and auth headers by merging org-level and user-level config values against the integration's config schema
- `ConnectionValidationService` — Validates MCP server connectivity, used by `ValidateMcpIntegrationUseCase`

**Ports:**
- `McpIntegrationsRepository` — Persistence port for MCP integrations
- `McpIntegrationUserConfigRepository` — Persistence port for per-user config values
- `McpClientPort` — Abstract port for MCP server communication
- `McpCredentialEncryptionPort` — Abstract port for credential encryption/decryption

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

**Module Dependencies:**
- **marketplace** — `InstallMarketplaceIntegrationUseCase` uses `GetMarketplaceIntegrationUseCase` to fetch integration metadata from the marketplace

**Dependent Modules:**
- **agents** — Uses MCP integration assignment for agent tool access
- **tools** — Wraps discovered MCP tools, resources, and prompts as executable tool entities
