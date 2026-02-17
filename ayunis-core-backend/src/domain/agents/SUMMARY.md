AI Assistants
Configurable AI agents with tools and sources

Agents are personalized AI assistants users build by combining a language model, custom instructions, tool assignments, and data source assignments. Users create, update, and delete agents scoped to their account.

The agents module manages the lifecycle of user-configured AI assistants. The core entity is `Agent`, which binds a `PermittedLanguageModel` with custom instructions and optional tool/source/MCP integration assignments. Supporting entities include `AgentToolAssignment`, `AgentSourceAssignment`, and MCP integration references.

Key use cases cover:
- CRUD operations (`CreateAgentUseCase`, `UpdateAgentUseCase`, `DeleteAgentUseCase`, `FindOneAgentUseCase`, `FindManyAgentsUseCase`, `FindAllAgentsUseCase`)
- Assigning and unassigning tools, sources, and MCP integrations (`AddSourceToAgentUseCase`, `RemoveSourceFromAgentUseCase`, `AssignMcpIntegrationToAgentUseCase`, `UnassignMcpIntegrationFromAgentUseCase`, `ListAgentMcpIntegrationsUseCase`)
- Replacing models with user defaults (`ReplaceModelWithUserDefaultUseCase`)

The module integrates with **models** for language model selection, **tools** for capability assignment, **sources** for RAG data binding, **mcp** for external protocol integrations, and **shares** for organization-wide agent sharing via an authorization strategy.
