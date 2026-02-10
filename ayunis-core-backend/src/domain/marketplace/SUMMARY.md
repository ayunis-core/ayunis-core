Marketplace Integration
Fetch and preview marketplace agents for local installation

The marketplace module provides integration with the external Ayunis Marketplace service to browse and install pre-configured AI agents. Users can preview marketplace agent details before installing them into their local account.

**Use Cases:**
- `GetMarketplaceAgentUseCase` — Fetches agent details from the marketplace by identifier

**Ports:**
- `MarketplaceClient` — Abstract port for marketplace API communication

**Infrastructure:**
- `MarketplaceHttpClient` — HTTP client implementation using the generated marketplace API client

**Presenters:**
- `MarketplaceController` — REST controller exposing `GET /marketplace/agents/:identifier` for previewing agents

**DTOs:**
- `MarketplaceAgentResponseDto` — Response DTO containing agent details (name, instructions, recommended model, etc.)

**Errors:**
- `MarketplaceAgentNotFoundError` — Agent with given identifier not found (404)
- `MarketplaceUnavailableError` — Marketplace service is unavailable (503)

**Module Dependencies:**
- Uses the generated marketplace API client from `src/common/clients/marketplace/`

**Dependent Modules:**
- **agents** — Uses `GetMarketplaceAgentUseCase` for installing marketplace agents via `InstallAgentFromMarketplaceUseCase`
