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

## Application Services

- **ModelPolicyService** (`application/services/model-policy.service.ts`): Enforces provider constraints on models. Currently validates that image-generation models only use supported providers (Azure).
- **TeamPermittedModelValidatorService** (`application/services/team-permitted-model-validator.service.ts`): Validates team ownership and org-scoping for team-scoped permitted model operations.

## Use Cases

- **CreateLanguageModelUseCase** (`application/use-cases/create-language-model`): Creates a new language model in the catalog.
- **CreateEmbeddingModelUseCase** (`application/use-cases/create-embedding-model`): Creates a new embedding model in the catalog.
- **CreateImageGenerationModelUseCase** (`application/use-cases/create-image-generation-model`): Creates a new image-generation model in the catalog, enforcing provider constraints via `ModelPolicyService`.
- **UpdateLanguageModelUseCase** (`application/use-cases/update-language-model`): Updates an existing language model in the catalog.
- **UpdateEmbeddingModelUseCase** (`application/use-cases/update-embedding-model`): Updates an existing embedding model in the catalog.
- **UpdateImageGenerationModelUseCase** (`application/use-cases/update-image-generation-model`): Updates an existing image-generation model in the catalog, enforcing provider constraints via `ModelPolicyService`.
- **UpdatePermittedModelUseCase** (`application/use-cases/update-permitted-model`): Updates a permitted model's flags (default, anonymous-only).
- **CreatePermittedModelUseCase** (`application/use-cases/create-permitted-model`): Creates a new org-scoped permitted model entry.
- **DeletePermittedModelUseCase** (`application/use-cases/delete-permitted-model`): Removes a permitted model entry and clears related defaults.
- **DeleteModelUseCase** (`application/use-cases/delete-model`): Deletes a model from the catalog.
- **GetPermittedModelsUseCase** (`application/use-cases/get-permitted-models`): Retrieves all permitted models for an org.
- **GetPermittedModelUseCase** (`application/use-cases/get-permitted-model`): Retrieves a single permitted model by ID.
- **GetPermittedLanguageModelsUseCase** (`application/use-cases/get-permitted-language-models`): Retrieves permitted language models for an org.
- **GetPermittedLanguageModelUseCase** (`application/use-cases/get-permitted-language-model`): Retrieves the single permitted language model by model ID.
- **GetPermittedEmbeddingModelUseCase** (`application/use-cases/get-permitted-embedding-model`): Retrieves the single permitted embedding model for an org.
- **GetPermittedImageGenerationModelUseCase** (`application/use-cases/get-permitted-image-generation-model`): Retrieves the single permitted image-generation model for an org.
- **GetConfiguredModelsByTypeUseCase** (`application/use-cases/get-configured-models-by-type`): Retrieves all catalog models of a given type, used for populating model selection dropdowns.
- **GetAllModelsUseCase** (`application/use-cases/get-all-models`): Retrieves all models from the catalog.
- **GetModelUseCase** (`application/use-cases/get-model`): Retrieves a single model by slug.
- **GetModelByIdUseCase** (`application/use-cases/get-model-by-id`): Retrieves a single model by ID.
- **GetModelProviderInfoUseCase** (`application/use-cases/get-model-provider-info`): Retrieves provider metadata for a model.
- **GetEffectiveLanguageModelsUseCase** (`application/use-cases/get-effective-language-models`): Computes the effective set of language models for a user, combining org and team scopes.
- **GetTeamPermittedModelsUseCase** (`application/use-cases/get-team-permitted-models`): Retrieves team-scoped permitted models.
- **CreateTeamPermittedModelUseCase** (`application/use-cases/create-team-permitted-model`): Creates a team-scoped permitted model entry.
- **DeleteTeamPermittedModelUseCase** (`application/use-cases/delete-team-permitted-model`): Removes a team-scoped permitted model entry.
- **SetTeamDefaultModelUseCase** (`application/use-cases/set-team-default-model`): Sets the default model for a team.
- **SetOrgDefaultLanguageModelUseCase** (`application/use-cases/set-org-default-language-model`): Sets the org-level default language model.
- **SetUserDefaultLanguageModelUseCase** (`application/use-cases/set-user-default-language-model`): Sets a user's default language model.
- **GetOrgDefaultModelUseCase** (`application/use-cases/get-org-default-model`): Retrieves the org-level default model.
- **GetUserDefaultModelUseCase** (`application/use-cases/get-user-default-model`): Retrieves a user's default model.
- **GetDefaultModelUseCase** (`application/use-cases/get-default-model`): Resolves the effective default model for a user (user → org → system fallback).
- **DeleteUserDefaultModelUseCase** (`application/use-cases/delete-user-default-model`): Removes a user's default model preference.
- **DeleteUserDefaultModelsByModelIdUseCase** (`application/use-cases/delete-user-default-models-by-model-id`): Removes all user defaults referencing a specific model.
- **ClearDefaultsByCatalogModelIdUseCase** (`application/use-cases/clear-defaults-by-catalog-model-id`): Clears all default references for a catalog model being deleted.
- **IsModelPermittedUseCase** (`application/use-cases/is-model-permitted`): Checks whether a model is permitted for an org.
- **IsEmbeddingModelEnabledUseCase** (`application/use-cases/is-embedding-model-enabled`): Checks whether an embedding model is enabled for an org.
- **GetInferenceUseCase** (`application/use-cases/get-inference`): Retrieves inference configuration for a model.
- **StreamInferenceUseCase** (`application/use-cases/stream-inference`): Routes and streams inference requests to the appropriate provider.

## Infrastructure Services

- **PermittedModelQueryService** (`infrastructure/persistence/local-permitted-models/permitted-model-query.service.ts`): Centralizes permitted model queries with type-safe filtering by model type (language, embedding, image-generation) and scope (org, team). Handles both org-scoped and team-scoped lookups.
