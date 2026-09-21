# Workspaces Module

## Purpose

Workspaces group a user's chats and own workspace-scoped skills and knowledge bases. A workspace carries a name, optional description, appearance, and optional project instruction. User favorites and ordering belong to the favorites module.

The module is guarded by `FEATURE_WORKSPACES_ENABLED` (off by default).

## Domain behavior

- A workspace belongs to one user and organization.
- Creating a workspace does not add it to favorites. Users explicitly favorite or unfavorite it; existing favorites are unchanged.
- Workspace skills and knowledge bases use `workspaceId` ownership and cannot be mixed with personal resources.
- Skill and knowledge-base activation is workspace-wide. Both start active; deactivation excludes them from new run context. Deactivating a skill also clears its pin.
- Enabled skills are advertised as activation candidates. Instructions and attached resources are loaded only after `activate_skill` or a trusted quick action.
- `GetWorkspaceAiContextUseCase` resolves instruction, active skill candidates, independently active knowledge bases, and source counts. `BuildWorkspaceRunContextUseCase` prepares this for inference.

## Tutorial provisioning

`WorkspaceTutorialUserCreatedListener` reacts to `UserCreatedEvent`, which every signup path publishes after the user-creation transaction commits (admin create, invite acceptance, org self-registration, SSO provisioning). It delegates to `WorkspaceTutorialProvisioningService.provisionFor(userId, orgId)`, which runs the exported create use cases inside `OrgContextRunner.runForUser` so they act as the new user rather than the creator. The template creates the workspace, an active workspace-owned explanatory skill, and an active workspace-owned knowledge collection linked to that skill. It creates no chat or favorite. Once the template transaction commits, the provisioning service uses `AddUrlToKnowledgeBaseUseCase` in the new user's context to attach `https://help.ayunis.com/de/workspaces/` with crawl depth zero. The existing URL queue fetches, chunks and indexes the article asynchronously; no network crawl or embedding runs inside the template transaction. Scheduling failures are logged separately without undoing the tutorial or failing signup; processing failures use the normal source status and queue retry behavior. Indexing requires an available embedding model for the organization.

The service's template step is `@Transactional()`, so the workspace, skill, collection and assignment commit as one unit or not at all; `LocalWorkspacesRepository` resolves the ambient transaction manager (falling back to the default repository outside CLS) so authorization sees the uncommitted workspace. Provisioning at signup is exactly-once by construction because the event fires once per user, so there is no marker or claim. It is best effort like the pre-installed skills listener: the publisher is fire-and-forget and failures are logged without affecting signup. Users created while `FEATURE_WORKSPACES_ENABLED` is off get no tutorial at signup. Users may edit or delete every tutorial resource; nothing recreates them, and a user who renames the tutorial would receive a fresh copy from a later backfill run.

Existing users are backfilled with `pnpm backfill:workspace-tutorials:ts [--org-id <uuid>]` (compiled: `pnpm backfill:workspace-tutorials`) from `ayunis-core-backend/`. The script in `src/db/scripts/backfill-workspace-tutorials.ts` bootstraps the application context, refuses to run while `FEATURE_WORKSPACES_ENABLED` is off, skips users who already own a workspace named `So geht's | Arbeitsbereiche`, and calls the same `provisionFor` for the rest, so backfilled and signup-provisioned tutorials are identical. It is safe to re-run; it logs provisioned/skipped/failed counts and exits non-zero when any user failed. There is no data migration for this.

## Access boundary

`WorkspaceAccessService` and the repository port are internal. Other modules use:

- `AssertWorkspaceReadAccessUseCase`
- `AssertWorkspaceWriteAccessUseCase`
- `AssertWorkspaceExecutionAccessUseCase`

Trusted execution resolves the authenticated persisted thread and verifies its workspace; a raw workspace ID cannot establish execution access. Skills and knowledge bases translate workspace-not-found denials into resource-not-found errors to avoid leaking resource existence.

Workspace-owned resource lifecycle is exposed by the canonical `/skills` and `/knowledge-bases` APIs. The workspace module has no forwarding CRUD, state, relation, or source use cases and no nested resource controllers.

## Deletion

`DeleteWorkspaceUseCase` emits `WorkspaceDeletionRequestedEvent` before deleting and drains deferred cleanup only after the database delete succeeds. Favorites, threads, skills, and knowledge bases listen for their cleanup responsibilities. Database cascades remove owned rows and relation state; listeners handle external object and processing cleanup.

## HTTP API

| Method | Route                                 | Purpose                        |
| ------ | ------------------------------------- | ------------------------------ |
| POST   | `/workspaces`                         | Create a workspace             |
| GET    | `/workspaces`                         | List accessible workspaces     |
| GET    | `/workspaces/:id`                     | Read one workspace             |
| PATCH  | `/workspaces/:id`                     | Update metadata and appearance |
| DELETE | `/workspaces/:id`                     | Delete a workspace             |
| GET    | `/workspaces/:id/context`             | Read the full runtime context  |
| PATCH  | `/workspaces/:id/context/instruction` | Update project instruction     |

## Structure

- `domain/`: workspace and runtime-context entities.
- `application/use-cases/`: workspace CRUD, access capabilities, instruction update, and run-context orchestration.
- `infrastructure/persistence/local/`: TypeORM repository and mapper.
- `presenters/http/`: workspace and runtime-context controllers and DTO mappers.

## Dependencies

The runs module consumes `BuildWorkspaceRunContextUseCase`. Skills and knowledge bases use exported workspace access capabilities. Workspace runtime context imports exported skills and knowledge-base application use cases. Cross-module persistence ownership remains represented by foreign keys and database cascades.
