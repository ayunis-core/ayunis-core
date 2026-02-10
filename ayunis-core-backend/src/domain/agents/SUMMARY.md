AI Assistants
Configurable AI agents with tools and sources

Agents are personalized AI assistants users build by combining a language model, custom instructions, tool assignments, and data source assignments. Users create, update, and delete agents scoped to their account.

The agents module manages the lifecycle of user-configured AI assistants. The core entity is `Agent`, which binds a `PermittedLanguageModel` with custom instructions and optional tool/source/MCP integration assignments. The `Agent` entity includes a `marketplaceIdentifier` property to track agents installed from the marketplace. Supporting entities include `AgentToolAssignment`, `AgentSourceAssignment`, and MCP integration references.

Key use cases cover:
- CRUD operations (`CreateAgentUseCase`, `UpdateAgentUseCase`, `DeleteAgentUseCase`, `FindOneAgentUseCase`, `FindManyAgentsUseCase`, `FindAllAgentsUseCase`)
- Assigning and unassigning tools, sources, and MCP integrations (`AddSourceToAgentUseCase`, `RemoveSourceFromAgentUseCase`, `AssignMcpIntegrationToAgentUseCase`, `UnassignMcpIntegrationFromAgentUseCase`, `ListAgentMcpIntegrationsUseCase`)
- Replacing models with user defaults (`ReplaceModelWithUserDefaultUseCase`)
- **Marketplace integration** (`InstallAgentFromMarketplaceUseCase`) for installing pre-configured agents from the marketplace

The `ModelResolverService` handles model resolution for marketplace agents using a fallback chain: exact match on recommended model → user's default model → org's default model → first available permitted language model.

Error classes include `NoPermittedModelError` (when no permitted model is available for marketplace installation) and `MarketplaceInstallFailedError` (when marketplace agent installation fails).

The module integrates with **models** for language model selection, **tools** for capability assignment, **sources** for RAG data binding, **mcp** for external protocol integrations, **shares** for organization-wide agent sharing via an authorization strategy, and **marketplace** for fetching marketplace agent definitions.
