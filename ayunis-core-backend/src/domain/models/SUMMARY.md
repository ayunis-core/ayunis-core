AI Models
Multi-provider language, embedding, and image-generation model management system

Models manages AI model definitions across providers (Ollama, Mistral, Anthropic, OpenAI, STACKIT), organization-level model permissions, user and org default selections, and inference routing for language, embedding, and image-generation workloads.

The models module is the central registry for AI model configuration. The abstract `Model` entity splits into `LanguageModel` (with pricing, context window, tool choice support), `EmbeddingModel` (with dimensions), and `ImageGenerationModel`. `PermittedModel` controls which models an organization can use, with default and anonymous-only flags. `ModelProviderInfoEntity` describes provider metadata and hosting locations. Key use cases include CRUD for models and permitted models, managing org/user default model preferences, checking model permissions, retrieving provider info, and routing inference requests. The module integrates with **agents** and **threads** for model selection, **runs** for inference execution, **rag** for embedding model access, and **usage** for tracking token consumption and costs per provider.

## Controllers

- **ModelsController** (`presenters/http/models.controller.ts`): User-facing endpoints for retrieving available models, managing user default models, and model provider info.
- **ModelsDefaultsController** (`presenters/http/models-defaults.controller.ts`): Endpoints for managing org-level default model preferences across model types.
- **SuperAdminPermittedModelsController** (`presenters/http/super-admin-permitted-models.controller.ts`): Super admin endpoints for managing organization-level permitted models, including per-type availability (language, embedding, image-generation), CRUD operations, and org default model management.
- **SuperAdminCatalogModelsController** (`presenters/http/super-admin-catalog-models.controller.ts`): Super admin endpoints for listing and deleting entries from the master model catalog. Create and update are split per model type across the three controllers below.
- **SuperAdminLanguageCatalogModelsController** (`presenters/http/super-admin-language-catalog-models.controller.ts`): Super admin endpoints for creating and updating language models in the catalog.
- **SuperAdminEmbeddingCatalogModelsController** (`presenters/http/super-admin-embedding-catalog-models.controller.ts`): Super admin endpoints for creating and updating embedding models in the catalog.
- **SuperAdminImageGenerationCatalogModelsController** (`presenters/http/super-admin-image-generation-catalog-models.controller.ts`): Super admin endpoints for creating and updating image-generation models in the catalog.
- **TeamPermittedModelsController** (`presenters/http/team-permitted-models.controller.ts`): Admin endpoints for managing team-scoped permitted models — listing, creating, deleting, and setting team defaults. All operations go through use-case layer with team ownership and org-scoping validation.
