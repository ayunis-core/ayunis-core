Protocol Integrations
Model Context Protocol server connections and capability discovery

MCP integrations connect external tool servers to the platform using the Model Context Protocol. Organizations configure predefined, custom, or marketplace integrations with authentication, then discover available tools, resources, and prompts.

The MCP module manages connections to external Model Context Protocol servers at the organization level. Core entities include `McpIntegration` (abstract base with predefined, custom, and marketplace subtypes), `SchemaConfiguredMcpIntegration` (shared org/user configuration schema behavior for custom and marketplace integrations), `McpIntegrationUserConfig` (per-user configuration values), `McpTool`, `McpResource`, and `McpPrompt`—the latter three are ephemeral entities fetched from remote servers, not persisted locally. Predefined integrations use the authentication entity hierarchy; custom and marketplace integrations map typed organization/user config fields to HTTP headers. Migration `1785752072933-BackfillLegacyCustomMcpIntegrations` converts supported legacy custom authentication rows into the schema-configured representation; unsupported or malformed legacy rows fail the migration instead of being silently changed.

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
