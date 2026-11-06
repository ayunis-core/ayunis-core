# Skills Module

## Purpose

Skills are reusable instruction and resource bundles that an AI assistant can activate during a conversation. A skill has exactly one owner: a user (`PersonalSkill`), a workspace (`WorkspaceSkill`), a team (`TeamSkill`) or the organization (`OrgSkill`). The database enforces this with `CHK_skills_single_owner` (`num_nonnulls` over `userId`, `workspaceId`, `teamId`, `orgId`), and names are unique per owner.

## Ownership and authorization

- Personal reads allow the owner and recipients covered by a skill share; personal writes are owner-only.
- Workspace reads, writes, and trusted execution delegate to the workspace module's exported access capabilities.
- ID-based operations load the persisted skill first and derive its owner. Clients never supply owner IDs for detail, mutation, state, relation, or source operations.
- Workspace authorization failures are exposed as `SkillNotFoundError`, so resource existence is not leaked.
- Team and org skills (`CollectiveSkill`) are read by team members and organization members respectively. Managing them (edit, delete, activation, pin, sources, relations) takes the permission that would also allow sharing with that audience: `share_skills_with_teams` as resolved for the user's role in that team (so team admins qualify) plus membership, or `share_skills_with_org`. The routes keep the org-wide `manage_skills` guard. The policy itself is the teams module's `GetCollectiveOwnerAccessUseCase`; `CollectiveSkillAccessService` supplies the skill permissions and maps the result to errors: a readable skill the user may not manage yields 403, an unreadable one 404. Creating for a team or the org checks the same right before anything is written.
- Team and org skills cannot be shared: the share strategy only resolves skills the caller personally owns.
- MCP integrations attach to personal, team and org skills, never to workspace skills.

## API

Create and list are owner-discriminated while retaining one behavioral contract:

- `ownerType=personal` has no owner ID and resolves the authenticated user. Its list also contains the team and org skills the user can read.
- `ownerType=team` (create only) requires `teamId`; `ownerType=org` (create only) uses the caller's organization.
- `ownerType=workspace` requires `workspaceId`.
- Invalid combinations are rejected by DTO validation.
- Omitted search and pagination return the complete owner scope with deterministic name ordering; either scope uses the same paginated path when search or pagination is supplied.
- Creation honors `isActive` for every owner type (for team and org skills as their global state) and defaults it to `true` when omitted.
- `GET /skills/marketplace/:identifier` answers per user whether the caller already installed a marketplace entry (`FindInstalledMarketplaceSkillUseCase` over `SkillRepository.findPersonalByMarketplaceIdentifier`). It returns the oldest matching personal skill's ID or `null`; the chat install card uses it to link to the existing skill instead of creating a numbered duplicate.

| Method          | Path                                                | Description                                           |
| --------------- | --------------------------------------------------- | ----------------------------------------------------- |
| POST            | `/skills`                                           | Create for the user, a workspace, a team or the org   |
| POST            | `/skills/improve-text`                              | Rewrite a draft's trigger or instructions             |
| GET             | `/skills`                                           | Paginated list; `personal` adds readable team/org     |
| GET             | `/skills/marketplace/:identifier`                   | Caller's skill installed from a marketplace entry     |
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
| GET/POST/DELETE | `/skills/:skillId/mcp-integrations/...`             | MCP integrations of personal, team and org skills     |

`POST /skills/improve-text` (`ImproveSkillTextUseCase`, requires `MANAGE_SKILLS`) rewrites a draft's trigger or instructions using the other text and the name as context; nothing is persisted. The optional `language` (`en` or `de`) carries the current UI language as the fallback for unidentifiable draft text; recognizable author languages are preserved, and older clients default to English. `SkillTextModelResolver` picks the organization default model when the caller may use it, else an eligible user default, team default, or deterministic alphabetical fallback, and never an anonymous-only one (anonymized placeholders would end up in the skill); when every permitted model is anonymous-only it fails with `SKILL_TEXT_IMPROVEMENT_UNAVAILABLE` (422), and when nothing is permitted at all the models module's `NO_DEFAULT_MODEL_FOUND` passes through unchanged. Like send-message, the route requires an active subscription or a trial with messages left (`@RequireSubscription()`) and, when the organization gates chat behind the KI-Schulung certificate, a valid completion (`@RequireAcademyCertificate()` on this handler only, so skill CRUD stays open to blocked members); and a rewrite admitted on trial capacity consumes one trial message (fire-and-forget `IncrementTrialMessagesUseCase`, mirroring send-message) because trial organizations have no credit budget for `InferenceAdmissionGuard` to enforce. The call is a paid model call: admission goes through the quotas module's `InferenceAdmissionGuard` (fair-use and credit checks) and the tokens used are recorded through the usage module's `CollectUsageAsyncService`, awaited at the inference response boundary before truncation checks. Model eligibility and fallback selection reuse the Models module's default resolver without a second effective-grant lookup. An answer that is empty after stripping surrounding quotes fails with `SKILL_TEXT_IMPROVEMENT_FAILED` (502) instead of clearing the field.

The former bodyless toggle routes and nested `/workspaces/:id/context/skills` lifecycle/source routes do not exist. Workspace run-context and instruction endpoints remain under `/workspaces/:id/context`.

## State semantics

Activation is represented by `skill_activations`; pinning is stored on the same row. Personal/shared skill state is per authenticated user. Workspace skill state is workspace-wide. Team and org skill state is global and stored on the skill itself (`skills.isActive`, `skills.isPinned`, only authoritative for those owners): switching it applies to everyone with access. New skills of any owner start active unless `isActive: false` is given. Pinning requires active state. Deactivation deletes the activation row (or clears the column) and therefore clears pinning. Activation and pin setters are idempotent.

## Relations and sources

Knowledge-base assignment derives both owners from persistence and resolves read access before attachment. Personal skills reference accessible personal knowledge bases; workspace skills reference workspace knowledge bases from the same workspace; team skills reference knowledge bases of the same team and org skills knowledge bases of the organization (same owner only, never a wider or narrower one). Duplicate assignment and absent unassignment use the same documented relation errors for either skill owner. Listing resolves authorization and activation state for knowledge bases of every owner in bulk, omitting references deleted during resolution.

File source creation authorizes the skill before external processing starts, enforces the source cap, and compensates pre-created sources if attachment fails. Relation updates use the original aggregate snapshot so persistence can apply deltas safely.

## Runtime orchestration

`FindActiveSkillsUseCase` returns the user's active personal and shared skills plus the active team and org skills they can read, in a deterministic order (`createdAt`, `id`) for the latter. Run assembly advertises them under the `team__` and `org__` slug prefixes, and `FindActiveCollectiveSkillByNameUseCase` resolves those slugs back through the same ordered set, so a collision resolves to the advertised skill. Only active team and org skills can be activated on a thread.

When a team is deleted its skills cascade with it; `SkillsTeamDeletionRequestedListener` defers deletion of their sources (and in-flight processing), which the join table does not cascade, through `SkillSourceCleanupService`, shared with the workspace-deletion listener.

`GetWorkspaceSkillsUseCase`, `ActivateWorkspaceSkillByNameUseCase`, `GetWorkspaceAiContextUseCase`, and `BuildWorkspaceRunContextUseCase` remain. Workspace skills are activation candidates; trusted activation derives workspace scope from the persisted thread. `FindActivatableSkillUseCase` loads the skill once and resolves personal, workspace, team or org activation access (team and org skills must be switched on for everyone), while `SkillActivationService` attaches sources, knowledge bases, and MCP integrations. `FindOneSkillUseCase` is exported so cross-module consumers such as citation retrieval can reauthorize a persisted skill reference before exposing its resources.

## Main structure

- `domain/`: `PersonalSkill`, `WorkspaceSkill`, `TeamSkill`, `OrgSkill` (the latter two extend `AbstractCollectiveSkill`, which carries the global state), shared `AbstractSkill`, and the `Skill` / `CollectiveSkill` unions.
- `application/models/skill-owner.ts`: discriminated owner scope.
- `application/services/skill-authorization.service.ts`: owner-aware read/write/create/execution policy; delegates team and org skills to `collective-skill-access.service.ts`.
- `application/use-cases/`: unified CRUD, state, knowledge-base, and source operations plus runtime orchestration.
- `infrastructure/persistence/local/`: TypeORM repository, state helpers, records, and mappers.
- `presenters/http/`: canonical `/skills` controllers, owner/state DTOs, and response mapper.
