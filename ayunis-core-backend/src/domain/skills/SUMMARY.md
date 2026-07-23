# Skills Module

## Purpose

Skills are reusable knowledge + integration bundles that an AI assistant can activate on-demand during a conversation. Unlike agents, skills don't have their own model or tool assignments — they bring sources (knowledge bases) and MCP integrations that get injected into a thread when activated.

## Key Concepts

- **Skill**: A named bundle with a short description (shown in system prompt), long description (instructions, returned on activation), sources, and MCP integrations.
- **Activation**: Skill activation is tracked in a separate `skill_activations` table (via `SkillActivationRecord`). Only active skills are surfaced in the system prompt as available for the LLM to activate. The repository provides `activateSkill`, `deactivateSkill`, `isSkillActive`, and `getActiveSkillIds` methods to manage activation state.
- **Pinning**: Active skills can be pinned so they appear prominently in the UI. Pinning state is stored as an `isPinned` boolean column on `SkillActivationRecord`. The repository provides `isSkillPinned` (checks if a skill is pinned for a user), `toggleSkillPinned` (returns the new pinned state), and `getPinnedSkillIds` methods. A skill must be active before it can be pinned — attempting to pin an inactive skill raises `SkillNotActiveError`.
- **User context resolution**: Per-user state (isActive, isPinned, isShared) is resolved by `SkillAccessService` via `resolveUserContext(skillId)` (single skill) and `resolveUserContextBatch()` (all skills for a user). Controllers never import repository ports directly — they use use cases and `SkillAccessService` instead. This boundary is enforced by a `controllers-no-ports` dependency-cruiser rule.
- **On-demand injection**: The LLM activates a skill via the `activate_skill` tool, which injects the skill's instructions and attaches its sources/MCP integrations to the thread.
- **Name uniqueness**: Skill names must be unique per user (enforced at repository level) because the `activate_skill` tool uses the name as the identifier.

## Structure

```text
skills/
├── SUMMARY.md
├── domain/
│   └── skill.entity.ts                    # Skill domain entity
├── application/
│   ├── ports/skill.repository.ts          # Abstract repository (includes activation + pinning methods)
│   ├── services/
│   │   ├── marketplace-skill-installation.service.ts  # Marketplace install logic (resolve name, create, activate)
│   │   ├── skill-access.service.ts        # Shared access-check logic (exported cross-module, used by runs)
│   │   ├── skill-activation.service.ts    # Activates a skill on a thread (sources, MCP, instructions)
│   │   └── skill-creator-name.service.ts  # Resolves shared-skill creators' display names (single + batched)
│   ├── listeners/
│   │   ├── share-deleted.listener.ts      # Reconciles activations on share deletion
│   │   └── user-created.listener.ts       # Installs pre-installed marketplace skills for new users
│   ├── skills.errors.ts                   # Domain errors
│   └── use-cases/
│       ├── create-skill/
│       ├── update-skill/
│       ├── delete-skill/
│       ├── find-one-skill/
│       ├── find-all-skills/
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
│       └── install-skill-from-marketplace/
├── infrastructure/
│   └── persistence/local/
│       ├── schema/
│       │   ├── skill.record.ts             # TypeORM entity (ManyToMany for sources + MCP)
│       │   └── skill-activation.record.ts  # Activation state (unique per skillId + userId)
│       ├── mappers/skill.mapper.ts
│       ├── local-skill.repository.ts
│       └── local-skill-repository.module.ts
├── presenters/http/
│   ├── skills.controller.ts                # Core CRUD + toggle-active + toggle-pinned
│   ├── skill-sources.controller.ts         # Source management endpoints
│   ├── skill-mcp-integrations.controller.ts # MCP integration endpoints
│   ├── dto/
│   │   ├── base-skill.dto.ts
│   │   ├── create-skill.dto.ts
│   │   ├── update-skill.dto.ts
│   │   └── skill-response.dto.ts
│   └── mappers/skill.mapper.ts
└── skills.module.ts
```

## Design Decisions

Both sources and MCP integrations use the same `@ManyToMany` + `@JoinTable` pattern. The domain entity stores `sourceIds: UUID[]` and `mcpIntegrationIds: UUID[]`. Full entity objects are fetched via dedicated list use cases (`ListSkillSourcesUseCase`, `ListSkillMcpIntegrationsUseCase`) that batch-fetch by IDs. File uploads are orchestrated by `AddFileSourceToSkillUseCase`, which detects the file type, dispatches documents to processing and CSV/spreadsheet files to data-source creation via the sources module's `DataSourceCommandBuilderService`, and attaches every created source to the skill (the CSV and spreadsheet paths are transactional); the controller only handles the HTTP concerns.

Activation state is stored in a separate `skill_activations` table rather than a boolean on the skill entity. This allows tracking activation per user without modifying the skill record itself. The `SkillActivationRecord` has a unique constraint on `(skillId, userId)` to ensure each user can only have one activation per skill. The repository uses atomic upsert operations (`INSERT ... ON CONFLICT DO NOTHING`) to handle concurrent activation requests safely.

Pinning state is co-located on `SkillActivationRecord` (the `isPinned` column, defaulting to `false`) rather than in a separate table. This ensures pinning is tightly coupled to activation — when a skill is deactivated, its pinned state is naturally removed with the activation record. `SkillNotActiveError` is thrown when attempting to pin a skill that has no activation record.

When a new user is created, the `UserCreatedListener` listens for `UserCreatedEvent` and installs pre-installed marketplace skills via `MarketplaceSkillInstallationService`. The service encapsulates the shared install logic (fetch marketplace skill → resolve unique name → create `Skill` → activate) used by both the listener and `InstallSkillFromMarketplaceUseCase`. If the marketplace is unavailable during user creation, the listener logs a warning and continues — pre-installed skills are best-effort.

When a skill share is deleted, the `ShareDeletedListener` handles cleanup of activations. If no other shares remain for the skill, all non-owner activations are removed. If other shares still exist, the listener resolves the remaining scopes to user IDs (via `FindAllUserIdsByOrgIdUseCase` and `FindAllUserIdsByTeamIdUseCase`) and only deactivates users who are no longer covered by any remaining share scope.

## Dependencies

- **SourcesModule** — for source management (create/delete sources, batch fetch by IDs)
- **McpModule** — for MCP integration validation and batch fetch
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

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/skills/install-from-marketplace` | Install a skill from the marketplace |
| POST | `/skills` | Create a skill |
| GET | `/skills` | List all skills for current user |
| GET | `/skills/:id` | Get a skill by ID |
| PUT | `/skills/:id` | Update a skill |
| DELETE | `/skills/:id` | Delete a skill |
| PATCH | `/skills/:id/toggle-active` | Toggle skill active/inactive |
| PATCH | `/skills/:id/toggle-pinned` | Toggle skill pinned/unpinned |
| GET | `/skills/:id/sources` | List sources for a skill |
| POST | `/skills/:id/sources/file` | Add a file source to a skill |
| DELETE | `/skills/:id/sources/:sourceId` | Remove a source from a skill |
| POST | `/skills/:skillId/mcp-integrations/:integrationId` | Assign MCP integration |
| DELETE | `/skills/:skillId/mcp-integrations/:integrationId` | Unassign MCP integration |
| GET | `/skills/:skillId/mcp-integrations` | List assigned MCP integrations |
