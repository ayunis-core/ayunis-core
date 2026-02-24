Knowledge Bases
Document collections for organized RAG retrieval

Knowledge bases group uploaded documents into named collections that can be queried semantically. Each knowledge base belongs to an organization and is scoped to the user who created it.

The `KnowledgeBase` domain entity holds a name, optional description, org scope (`orgId`), and user ownership (`userId`). The `KnowledgeBaseRepository` port defines persistence operations (save, find by ID, find all by user, delete). A local TypeORM implementation (`LocalKnowledgeBaseRepository`) backs the port with a mapper and `KnowledgeBaseRecord` schema. Domain errors (`KnowledgeBaseNotFoundError`) are defined in `knowledge-bases.errors.ts`.

Five CRUD use cases are provided: `CreateKnowledgeBaseUseCase` (persists a new knowledge base), `UpdateKnowledgeBaseUseCase` (updates name/description, verifies ownership), `DeleteKnowledgeBaseUseCase` (removes by ID, verifies ownership), `FindKnowledgeBaseUseCase` (retrieves a single knowledge base by ID and user), and `ListKnowledgeBasesUseCase` (returns all knowledge bases for a user). Each use case has a corresponding command/query DTO.

The HTTP presenter layer exposes a `KnowledgeBasesController` at `/knowledge-bases` with five endpoints: `POST /` (create), `GET /` (list), `GET /:id` (find), `PATCH /:id` (update), and `DELETE /:id` (delete, returns 204). Request DTOs (`CreateKnowledgeBaseDto`, `UpdateKnowledgeBaseDto`) handle input validation, `KnowledgeBaseResponseDto` and `KnowledgeBaseListResponseDto` define the response shape, and `KnowledgeBaseDtoMapper` maps domain entities to response DTOs.

The `KnowledgeBasesModule` imports `LocalKnowledgeBaseRepositoryModule`, registers all five use cases and the DTO mapper as providers, declares the controller, and exports the repository module and use cases for consumption by other modules (e.g., sources).
