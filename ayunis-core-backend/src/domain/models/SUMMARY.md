AI Models
Multi-provider language and embedding model management system

Models manages AI model definitions across providers (Ollama, Mistral, Anthropic, OpenAI, STACKIT), organization-level model permissions, user and org default selections, and inference routing for language and embedding workloads.

The models module is the central registry for AI model configuration. The abstract `Model` entity splits into `LanguageModel` (with pricing, context window, tool choice support) and `EmbeddingModel` (with dimensions). `PermittedModel` controls which models an organization can use, with default and anonymous-only flags. `ModelProviderInfoEntity` describes provider metadata and hosting locations. Key use cases include CRUD for models and permitted models, managing org/user default model preferences, checking model permissions, retrieving provider info, and routing inference requests. The module integrates with **agents** and **threads** for model selection, **runs** for inference execution, **rag** for embedding model access, and **usage** for tracking token consumption and costs per provider.

## Controllers

- **ModelsController** (`presenters/http/models.controller.ts`): User-facing endpoints for retrieving available models, managing user default models, and model provider info.
- **SuperAdminPermittedModelsController** (`presenters/http/super-admin-permitted-models.controller.ts`): Super admin endpoints for managing organization-level permitted models, including CRUD operations and org default model management.
- **SuperAdminCatalogModelsController** (`presenters/http/super-admin-catalog-models.controller.ts`): Super admin endpoints for managing the master model catalog, including creating, updating, and deleting language and embedding models.
- **TeamPermittedModelsController** (`presenters/http/team-permitted-models.controller.ts`): Admin endpoints for managing team-scoped permitted models — listing, creating, deleting, and setting team defaults. All operations go through use-case layer with team ownership and org-scoping validation.
