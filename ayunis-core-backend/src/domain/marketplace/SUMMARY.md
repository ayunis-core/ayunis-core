Marketplace Integration
Fetch and preview marketplace skills and integrations for local installation

The marketplace module provides integration with the external Ayunis Marketplace service to browse and install pre-configured skills and MCP integrations. Users can preview marketplace item details before installing them into their local account.

**Use Cases:**
- `GetMarketplaceSkillUseCase` — Fetches skill details from the marketplace by identifier
- `GetMarketplaceIntegrationUseCase` — Fetches MCP integration details (including config schema with org/user fields) from the marketplace by identifier

**Ports:**
- `MarketplaceClient` — Abstract port for marketplace API communication

**Infrastructure:**
- `MarketplaceHttpClient` — HTTP client implementation using the generated marketplace API client

**Presenters:**
- `MarketplaceController` — REST controller exposing:
  - `GET /marketplace/skills/:identifier` — Preview a marketplace skill before installation
  - `GET /marketplace/integrations/:identifier` — Preview a marketplace integration before installation

**DTOs:**
- `MarketplaceSkillResponseDto` — Response DTO containing skill details (name, shortDescription, aiDescription, instructions, etc.)
- `MarketplaceIntegrationResponseDto` — Response DTO containing integration details (name, shortDescription, description, serverUrl, configSchema with orgFields/userFields, etc.)

**Errors:**
- `MarketplaceSkillNotFoundError` — Skill with given identifier not found (404)
- `MarketplaceIntegrationNotFoundError` — Integration with given identifier not found (404)
- `MarketplaceUnavailableError` — Marketplace service is unavailable (503)

**Module Dependencies:**
- Uses the generated marketplace API client from `src/common/clients/marketplace/`

**Dependent Modules:**
- **skills** — Uses `GetMarketplaceSkillUseCase` for installing marketplace skills via `InstallSkillFromMarketplaceUseCase`
- **mcp** — Uses `GetMarketplaceIntegrationUseCase` for installing marketplace MCP integrations via `InstallMarketplaceIntegrationUseCase`
