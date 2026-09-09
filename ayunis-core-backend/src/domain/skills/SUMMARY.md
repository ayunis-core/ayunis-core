# Skills Module

## Purpose

Skills are reusable instruction and resource bundles that an AI assistant can activate during a conversation. A skill has exactly one owner: either a user (`PersonalSkill`) or a workspace (`WorkspaceSkill`).

## Ownership and authorization

- Personal reads allow the owner and recipients covered by a skill share; personal writes are owner-only.
- Workspace reads, writes, and trusted execution delegate to the workspace module's exported access capabilities.
- ID-based operations load the persisted skill first and derive its owner. Clients never supply owner IDs for detail, mutation, state, relation, or source operations.
- Workspace authorization failures are exposed as `SkillNotFoundError`, so resource existence is not leaked.
- MCP integration assignment remains personal-only.

## API

Create and list are owner-discriminated while retaining one behavioral contract:

- `ownerType=personal` has no owner ID and resolves the authenticated user.
- `ownerType=workspace` requires `workspaceId`.
- Invalid combinations are rejected by DTO validation.
- Omitted search and pagination return the complete owner scope with deterministic name ordering; either scope uses the same paginated path when search or pagination is supplied.
- Creation honors `isActive` for either owner type and defaults it to `true` when omitted.

| Method          | Path                                                | Description                                           |
| --------------- | --------------------------------------------------- | ----------------------------------------------------- |
| POST            | `/skills`                                           | Create in a personal or workspace owner scope         |
| GET             | `/skills`                                           | Paginated list in a personal or workspace owner scope |
| GET             | `/skills/:id`                                       | Read a skill using persisted-owner authorization      |
| PUT             | `/skills/:id`                                       | Update a skill                                        |
| DELETE          | `/skills/:id`                                       | Delete a skill                                        |
| PATCH           | `/skills/:id/activation`                            | Idempotently set `{ isActive }`                       |
| PATCH           | `/skills/:id/pin`                                   | Idempotently set `{ isPinned }`                       |
| GET             | `/skills/:id/sources`                               | List sources                                          |
| POST            | `/skills/:id/sources/file`                          | Add a file source                                     |
| DELETE          | `/skills/:id/sources/:sourceId`                     | Remove a source                                       |
| GET             | `/skills/:skillId/knowledge-bases`                  | List assigned knowledge bases with state              |
| POST            | `/skills/:skillId/knowledge-bases/:knowledgeBaseId` | Assign a knowledge base                               |
| DELETE          | `/skills/:skillId/knowledge-bases/:knowledgeBaseId` | Unassign a knowledge base                             |
| GET/POST/DELETE | `/skills/:skillId/mcp-integrations/...`             | Personal-only MCP integration operations              |

The former bodyless toggle routes and nested `/workspaces/:id/context/skills` lifecycle/source routes do not exist. Workspace run-context and instruction endpoints remain under `/workspaces/:id/context`.

## State semantics

Activation is represented by `skill_activations`; pinning is stored on the same row. Personal/shared skill state is per authenticated user. Workspace skill state is workspace-wide. Pinning requires active state. Deactivation deletes the activation row and therefore clears pinning. Activation and pin setters are idempotent.

## Relations and sources

Knowledge-base assignment derives both owners from persistence and resolves read access before attachment. Personal skills reference accessible personal knowledge bases; workspace skills reference workspace knowledge bases from the same workspace. Duplicate assignment and absent unassignment use the same documented relation errors for either skill owner. Listing resolves authorization and activation state for both personal and workspace knowledge bases in bulk, omitting references deleted during resolution.

File source creation authorizes the skill before external processing starts, enforces the source cap, and compensates pre-created sources if attachment fails. Relation updates use the original aggregate snapshot so persistence can apply deltas safely.

## Runtime orchestration

`GetWorkspaceSkillsUseCase`, `ActivateWorkspaceSkillByNameUseCase`, `GetWorkspaceAiContextUseCase`, and `BuildWorkspaceRunContextUseCase` remain. Workspace skills are activation candidates; trusted activation derives workspace scope from the persisted thread. `FindActivatableSkillUseCase` resolves personal or workspace activation access, while `SkillActivationService` attaches sources, knowledge bases, and MCP integrations.

## Main structure

- `domain/`: `PersonalSkill`, `WorkspaceSkill`, shared `AbstractSkill`, and the `Skill` union.
- `application/models/skill-owner.ts`: discriminated owner scope.
- `application/services/skill-authorization.service.ts`: owner-aware read/write/execution policy.
- `application/use-cases/`: unified CRUD, state, knowledge-base, and source operations plus runtime orchestration.
- `infrastructure/persistence/local/`: TypeORM repository, state helpers, records, and mappers.
- `presenters/http/`: canonical `/skills` controllers, owner/state DTOs, and response mapper.
