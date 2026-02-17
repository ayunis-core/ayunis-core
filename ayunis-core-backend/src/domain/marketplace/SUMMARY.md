Marketplace Integration
Fetch and preview marketplace skills for local installation

The marketplace module provides integration with the external Ayunis Marketplace service to browse and install pre-configured skills. Users can preview marketplace skill details before installing them into their local account.

**Use Cases:**
- `GetMarketplaceSkillUseCase` — Fetches skill details from the marketplace by identifier

**Ports:**
- `MarketplaceClient` — Abstract port for marketplace API communication

**Infrastructure:**
- `MarketplaceHttpClient` — HTTP client implementation using the generated marketplace API client

**Presenters:**
- `MarketplaceController` — REST controller exposing `GET /marketplace/skills/:identifier` for previewing skills

**DTOs:**
- `MarketplaceSkillResponseDto` — Response DTO containing skill details (name, shortDescription, aiDescription, instructions, etc.)

**Errors:**
- `MarketplaceSkillNotFoundError` — Skill with given identifier not found (404)
- `MarketplaceUnavailableError` — Marketplace service is unavailable (503)

**Module Dependencies:**
- Uses the generated marketplace API client from `src/common/clients/marketplace/`

**Dependent Modules:**
- **skills** — Uses `GetMarketplaceSkillUseCase` for installing marketplace skills via `InstallSkillFromMarketplaceUseCase`
