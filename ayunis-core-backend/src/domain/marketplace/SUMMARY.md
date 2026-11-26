Marketplace Integration
Fetch and preview marketplace skills, integrations and routines for local installation

The marketplace module provides integration with the external Ayunis Marketplace service to browse and install pre-configured skills, MCP integrations and routines. Users can preview marketplace item details before installing them into their local account.

**Use Cases:**

- `GetMarketplaceSkillUseCase` — Fetches skill details from the marketplace by identifier
- `GetMarketplaceIntegrationUseCase` — Fetches MCP integration details (including config schema with org/user fields) from the marketplace by identifier
- `GetMarketplaceRoutineUseCase` — Fetches a published routine (name, prompt, `schedule`, `internetAccess`, `allowedDomains`) from the marketplace by identifier; `MarketplaceRoutineNotFoundError` when it does not exist or is unpublished
- `ListMarketplaceSkillsUseCase` — Every published skill as the generated `SkillListResponseDto[]`, featured entries first, then by name (German collation). Consumed by the chat `marketplace_search` tool
- `ListMarketplaceIntegrationsUseCase` — Every published integration as `IntegrationListResponseDto[]`, same ordering, same consumer
- `ListMarketplaceSkillCategoriesUseCase` — The skill categories as `SkillCategoryResponseDto[]`, used by the tool to resolve category IDs to names
- `ListMarketplaceRoutinesUseCase` — Every published routine as `RoutineListItemResponseDto[]` (with schedule and internet access, without the prompt), same ordering, same consumer
- `ListMarketplaceRoutineCategoriesUseCase` — The routine categories as `RoutineCategoryResponseDto[]`, used by the tool to resolve routine category IDs to names

**Ports:**

- `MarketplaceClient` — Abstract port for marketplace API communication (`getSkillByIdentifier`, `getPreInstalledSkills`, `getIntegrationByIdentifier`, `getRoutineByIdentifier`, `listSkills`, `listIntegrations`, `listRoutines`, `listCategories`, `listRoutineCategories`). The list methods walk every page of the public list API (no free-text search exists there) and return published entries only

**Infrastructure:**

- `MarketplaceHttpClient` — HTTP client implementation using the generated marketplace API client (regenerated with orval from a running marketplace, `orval.config.ts` target `marketplace`). `getIntegrationByIdentifier` and `getRoutineByIdentifier` return null for a 404 and throw `MarketplaceUnavailableError` for any other failure

**Presenters:**

- `MarketplaceController` — REST controller exposing:
  - `GET /marketplace/config` — Reports local marketplace availability and public URL (derived from `MARKETPLACE_SERVICE_URL`); used by the frontend to gate the Marketplace sidebar entry and skills-page promo card
  - `GET /marketplace/skills/:identifier` — Preview a marketplace skill before installation
  - `GET /marketplace/integrations/:identifier` — Preview a marketplace integration before installation
  - `GET /marketplace/routines/:identifier` — Preview a marketplace routine before installation (name, descriptions, icon, schedule, internet mode and allowed domains; not the prompt). Behind the `routines` feature flag (404 when off); like the skill preview, any signed-in member may read it

**DTOs:**

- `MarketplaceConfigResponseDto` — Response DTO containing `{ enabled, url }` for the `/config` endpoint
- `MarketplaceSkillResponseDto` — Response DTO containing skill details (name, shortDescription, aiDescription, instructions, Lucide `iconName`, etc.)
- `MarketplaceRoutineResponseDto` — Routine preview; its `schedule` has the shape of the routines API's schedule and shares its `RoutineFrequency` / `RoutineInternetAccess` enum schemas
- `MarketplaceIntegrationResponseDto` — Response DTO containing integration details (name, shortDescription, description, configSchema with orgFields/userFields, etc.). `serverUrl` is the vendor's fixed MCP server, or `null` when `customerProvidesServerUrl` is set; then the installing organization enters its own instance's URL, guided by `serverUrlHint`

**Errors:**

- `MarketplaceSkillNotFoundError` — Skill with given identifier not found (404)
- `MarketplaceIntegrationNotFoundError` — Integration with given identifier not found (404)
- `MarketplaceRoutineNotFoundError` — Routine with given identifier not found or unpublished (404, `MARKETPLACE_ROUTINE_NOT_FOUND`)
- `MarketplaceUnavailableError` — Marketplace service is unavailable (503); returns safe retry guidance to clients and is classified as an expected dependency failure rather than a first-occurrence AppSignal incident
- `MarketplaceRequestRejectedError` — The marketplace answered a catalogue list call with a 4xx (502). Transport failures and 5xx are outages; a 4xx means the generated client drifted from the marketplace API, so this one alerts on first occurrence
- `UnexpectedMarketplaceError` — Boundary error for `@HandleUnexpectedErrors` in this module (500)

**Module Dependencies:**

- Uses the generated marketplace API client from `src/common/clients/marketplace/`

**Dependent Modules:**

- **skills** — Uses `GetMarketplaceSkillUseCase` for installing marketplace skills via `InstallSkillFromMarketplaceUseCase`; `MarketplaceSkillInstallationService` consumes `MarketplaceClient.getPreInstalledSkills()` for pre-installed skill provisioning
- **mcp** — Uses `GetMarketplaceIntegrationUseCase` for installing marketplace MCP integrations via `InstallMarketplaceIntegrationUseCase`
- **routines** — Uses `GetMarketplaceRoutineUseCase` for installing marketplace routines via `InstallRoutineFromMarketplaceUseCase`
