# Skills Module

## Purpose

Skills are reusable knowledge + integration bundles that an AI assistant can activate on-demand during a conversation. Unlike agents, skills don't have their own model or tool assignments — they bring sources (knowledge bases) and MCP integrations that get injected into a thread when activated.

## Key Concepts

- **Skill**: A named bundle with a short description (shown in system prompt), long description (instructions, returned on activation), sources, and MCP integrations.
- **Activation**: Skill activation is tracked in the separate `skill_activations` table (via `SkillActivationRecord`) for both user and workspace scopes. Row presence means active; ownership remains on `skills.userId` or `skills.workspaceId`.
- **Pinning**: `isPinned` belongs to the activation row. Personal activation and pinning are per-user, while workspace activation and pinning are workspace-wide. Deactivation removes the activation row and therefore clears pinning.
- **User context resolution**: Per-user state (isActive, isPinned, isShared) is resolved by `SkillAccessService` via `resolveUserContext(skillId)` (single skill) and `resolveUserContextBatch()` (all skills for a user). Controllers never import repository ports directly — they use use cases and `SkillAccessService` instead. This boundary is enforced by a `controllers-no-ports` dependency-cruiser rule.
- **Workspace activation**: Enabled workspace skills are candidates, not always-on instructions. `ActivateWorkspaceSkillByNameUseCase` resolves names through the authorized thread's workspace; `SkillAccessService.findActivatableSkill` checks thread ownership and the workspace activation state before resource attachment. Personal/shared and workspace names have separate tool namespaces. Explicit quick actions use the same activation service. Disabling a skill prevents new activation; resources already attached to a conversation follow the regular skill lifecycle.
- **On-demand injection**: The LLM activates a skill via the `activate_skill` tool, which injects the skill's instructions and attaches its sources/MCP integrations to the thread. Successful activation emits `SkillUsedEvent` with user, organization, skill ID, and display name for downstream product analytics.
- **Ownership scope**: Every skill has exactly one owner. Personal skills have a `userId` and no workspace ID; workspace-owned skills have a `workspaceId` and no user ID. Workspace skills are created directly in their workspace; personal skills cannot be copied or attached.
- **Name uniqueness**: Personal skill names are unique per user, while workspace-owned skill names are unique within their workspace. The `activate_skill` tool uses the name as the identifier.

## Structure

```text
skills/
├── SUMMARY.md
├── domain/
│   ├── abstract-skill.entity.ts           # Shared fields and validation
│   ├── personal-skill.entity.ts           # Required user owner
│   ├── workspace-skill.entity.ts          # Required workspace owner
│   └── skill.ts                          # Mixed-scope Skill union
├── application/
│   ├── ports/skill.repository.ts          # Abstract repository (includes activation + pinning methods)
│   ├── services/
│   │   ├── marketplace-skill-installation.service.ts  # Marketplace install logic (resolve name, create, activate)
│   │   ├── skill-access.service.ts        # Shared access-check logic (exported cross-module, used by runs)
│   │   ├── skill-activation.service.ts    # Activates a skill on a thread (sources, MCP, instructions)
│   │   ├── skill-creator-name.service.ts  # Resolves shared-skill creators' display names (single + batched)
│   │   └── workspace-skill.service.ts     # Manages workspace-owned skill properties and state
│   ├── listeners/
│   │   ├── share-deleted.listener.ts      # Reconciles activations on share deletion
│   │   ├── user-created.listener.ts       # Installs pre-installed marketplace skills for new users
│   │   └── workspace-deletion-requested.listener.ts # Cleans workspace skill sources before deletion
│   ├── skills.errors.ts                   # Domain errors
│   └── use-cases/
│       ├── create-skill/
│       ├── update-skill/
│       ├── delete-skill/
│       ├── find-one-skill/
│       ├── find-all-skills/
│       ├── get-skills-by-ids/
│       ├── find-skill-by-name/
│       ├── toggle-skill-active/
│       ├── toggle-skill-pinned/
│       ├── find-active-skills/
│       ├── add-source-to-skill/
│       ├── add-file-source-to-skill/
│       ├── remove-source-from-skill/
│       ├── list-skill-sources/
│       ├── assign-mcp-integration-to-skill/
│       ├── unassign-mcp-integration-from-skill/
│       ├── list-skill-mcp-integrations/
│       ├── assign-knowledge-base-to-skill/
│       ├── unassign-knowledge-base-from-skill/
│       ├── list-skill-knowledge-bases/
│       ├── check-knowledge-base-skill-share-access/  # KB reachable via a shared skill of the KB owner? (exported, used by knowledge-bases)
│       ├── find-knowledge-base-ids-accessible-via-shared-skills/  # bulk KB access projection for shared-skill lists (exported, used by knowledge-bases)
│       └── install-skill-from-marketplace/
├── infrastructure/
│   └── persistence/local/
│       ├── schema/
│       │   ├── skill.record.ts             # TypeORM entity (ManyToMany for sources, MCP, knowledge bases)
│       │   └── skill-activation.record.ts  # Activation state (unique per skillId + userId)
│       ├── mappers/skill.mapper.ts
│       ├── local-skill.repository.ts
│       └── local-skill-repository.module.ts
├── presenters/http/
│   ├── skills.controller.ts                # Core CRUD + toggle-active + toggle-pinned
│   ├── skill-sources.controller.ts         # Source management endpoints
│   ├── skill-mcp-integrations.controller.ts # MCP integration endpoints
│   ├── skill-knowledge-bases.controller.ts # Knowledge base assignment endpoints
│   ├── dto/
│   │   ├── base-skill.dto.ts
│   │   ├── create-skill.dto.ts
│   │   ├── update-skill.dto.ts
│   │   └── skill-response.dto.ts
│   └── mappers/skill.mapper.ts
└── skills.module.ts
```

## Design Decisions

Both sources and MCP integrations use the same `@ManyToMany` + `@JoinTable` pattern. The domain entity stores `sourceIds: UUID[]` and `mcpIntegrationIds: UUID[]`. Updates carry the original skill snapshot and apply only scalar changes and relationship deltas inside a row-locked transaction. Concurrent edits cannot overwrite unrelated properties or assignments, and source capacity is checked against the locked current state. Full entity objects are fetched via dedicated list use cases (`ListSkillSourcesUseCase`, `ListSkillMcpIntegrationsUseCase`) that batch-fetch by IDs. Repository reads and writes used by transactional mutation flows resolve through the ambient CLS transaction so repeated relation updates see earlier uncommitted changes. `FindAllSkillsUseCase` is exported so other modules can list skill candidates and resolve assigned skills through the application layer.

File uploads are orchestrated by `AddFileSourceToSkillUseCase`. It first resolves the skill (ownership check) and asserts the `SkillsConstants.MAX_SOURCES` cap (via `assertSkillHasSourceCapacity` in `application/util/skill-source-capacity.ts`) — object-storage uploads and enqueued processing jobs cannot be rolled back, so a skill already at the cap must be rejected before any of that work happens. It then detects the file type and starts async processing via the sources module: documents/audio through `StartDocumentProcessingUseCase`, CSV/spreadsheet files through `StartDataSourceProcessingUseCase` (which re-checks the cap with the actual per-sheet source count via the command's `ensureCapacityFor` callback before creating anything). Every returned PROCESSING source is attached to the skill transactionally, with attach failures compensated by deleting the pre-created sources; a background job fills the data and flips the status. `AddSourceToSkillUseCase` re-checks the cap against a freshly loaded skill and remains authoritative for concurrent adds. Personal endpoints resolve ownership inside their use cases; workspace endpoints pass a skill already authorized against the workspace route into the same source operations, so source ownership remains represented solely by the skill aggregate. The controller only handles the HTTP concerns.

Domain ownership uses `PersonalSkill` and `WorkspaceSkill`, sharing `AbstractSkill`. Only persistence records have nullable ownership columns; the mapper rejects invalid ownership and verifies scoped results. Personal and workspace repository queries expose concrete types, with scope filtered in SQL. Mixed lookups use the `Skill` union; callers narrow ownership with `instanceof PersonalSkill` or `instanceof WorkspaceSkill`. `withUpdates` preserves ownership and the concrete subtype while revalidating properties.

Activation state is stored in a separate `skill_activations` table rather than a boolean on the skill entity. This allows tracking activation per user without modifying the skill record itself. The `SkillActivationRecord` has a unique constraint on `(skillId, userId)` to ensure each user can only have one activation per skill. The repository uses atomic upsert operations (`INSERT ... ON CONFLICT DO NOTHING`) to handle concurrent activation requests safely.

Pinning state is co-located on `SkillActivationRecord` (the `isPinned` column, defaulting to `false`) rather than in a separate table. This ensures pinning is tightly coupled to activation — when a skill is deactivated, its pinned state is naturally removed with the activation record. `SkillNotActiveError` is thrown when attempting to pin a skill that has no activation record.

When a new user is created, the `UserCreatedListener` listens for `UserCreatedEvent` and installs pre-installed marketplace skills via `MarketplaceSkillInstallationService`. The service encapsulates the shared install logic (fetch marketplace skill → resolve unique name → create `Skill` → activate) used by both the listener and `InstallSkillFromMarketplaceUseCase`. If the marketplace is unavailable during user creation, the listener logs a warning and continues — pre-installed skills are best-effort.

When a skill share is deleted, the `ShareDeletedListener` handles cleanup of activations. If no other shares remain for the skill, all non-owner activations are removed. If other shares still exist, the listener resolves the remaining scopes to user IDs (via `FindAllUserIdsByOrgIdUseCase` and `FindAllUserIdsByTeamIdUseCase`) and only deactivates users who are no longer covered by any remaining share scope.

Workspace resource operations are exposed through dedicated exported use cases (find, paginated state lookup, property update, activation, pinning, and knowledge-base assignment). Those use cases own their operation logic directly, including duplicate-name validation, snapshot-preserving updates, activation, and pinning rules. The internal `WorkspaceSkillAccessService.requireInWorkspace` only checks scoped resource ownership; workspace authorization is performed by the calling workspace use case. Personal and workspace activation use cases stay separate.

## Dependencies

- **SourcesModule** — for source management (create/delete sources, batch fetch by IDs)
- **McpModule** — for MCP integration validation and batch fetch
- **KnowledgeBasesModule** — for resolving assigned knowledge bases (`GetKnowledgeBasesByIdsUseCase`) and their access/activation context (`GetAccessibleKnowledgeBaseContextsUseCase`). `ListSkillKnowledgeBasesUseCase` performs this orchestration; the HTTP controller only maps the result.
- **ThreadsModule** — for adding sources and MCP integrations to threads during skill activation
- **SharesModule** — for share authorization strategy registration
- **UsersModule** — for resolving org-scoped share members (`FindAllUserIdsByOrgIdUseCase`) and shared-skill creator display names (`FindUsersByIdsUseCase`, consumed by `SkillCreatorNameService`)
- **TeamsModule** — for resolving team-scoped share members (`FindAllUserIdsByTeamIdUseCase`)
- **MarketplaceModule** — for fetching marketplace skill definitions (`GetMarketplaceSkillUseCase`)
- **ContextService** — for user context (userId, orgId)

## Marketplace Integration

The skills module supports installing skills from the external Ayunis Marketplace. The `InstallSkillFromMarketplaceUseCase` fetches a skill definition from the marketplace (via `GetMarketplaceSkillUseCase` from the **MarketplaceModule**) and creates a local `Skill` entity with the marketplace skill's name, short description, and instructions. The `marketplaceIdentifier` field on the `Skill` entity tracks which skills were installed from the marketplace.

Error handling: `MarketplaceInstallFailedError` is raised when the installation process fails unexpectedly.

## API Endpoints

| Method | Path                                                | Description                          |
| ------ | --------------------------------------------------- | ------------------------------------ |
| POST   | `/skills/install-from-marketplace`                  | Install a skill from the marketplace |
| POST   | `/skills`                                           | Create a skill                       |
| GET    | `/skills`                                           | List all skills for current user     |
| GET    | `/skills/:id`                                       | Get a skill by ID                    |
| PUT    | `/skills/:id`                                       | Update a skill                       |
| DELETE | `/skills/:id`                                       | Delete a skill                       |
| PATCH  | `/skills/:id/toggle-active`                         | Toggle skill active/inactive         |
| PATCH  | `/skills/:id/toggle-pinned`                         | Toggle skill pinned/unpinned         |
| GET    | `/skills/:id/sources`                               | List sources for a skill             |
| POST   | `/skills/:id/sources/file`                          | Add a file source to a skill         |
| DELETE | `/skills/:id/sources/:sourceId`                     | Remove a source from a skill         |
| POST   | `/skills/:skillId/mcp-integrations/:integrationId`  | Assign MCP integration               |
| DELETE | `/skills/:skillId/mcp-integrations/:integrationId`  | Unassign MCP integration             |
| GET    | `/skills/:skillId/mcp-integrations`                 | List assigned MCP integrations       |
| POST   | `/skills/:skillId/knowledge-bases/:knowledgeBaseId` | Assign knowledge base                |
| DELETE | `/skills/:skillId/knowledge-bases/:knowledgeBaseId` | Unassign knowledge base              |
| GET    | `/skills/:skillId/knowledge-bases`                  | List assigned knowledge bases        |
