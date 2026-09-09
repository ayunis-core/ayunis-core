# Workspaces Module

## Purpose

Workspaces group a user's chats and own workspace-scoped skills and knowledge bases. A workspace carries a name, optional description, appearance, and optional project instruction. User favorites and ordering belong to the favorites module.

The module is guarded by `FEATURE_WORKSPACES_ENABLED` (off by default).

## Domain behavior

- A workspace belongs to one user and organization.
- Workspace skills and knowledge bases use `workspaceId` ownership and cannot be mixed with personal resources.
- Skill and knowledge-base activation is workspace-wide. Both start active; deactivation excludes them from new run context. Deactivating a skill also clears its pin.
- Enabled skills are advertised as activation candidates. Instructions and attached resources are loaded only after `activate_skill` or a trusted quick action.
- `GetWorkspaceAiContextUseCase` resolves instruction, active skill candidates, independently active knowledge bases, and source counts. `BuildWorkspaceRunContextUseCase` prepares this for inference.

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
