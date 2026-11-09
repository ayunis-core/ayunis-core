# Workspaces Module

## Purpose

Workspaces group their members' chats and own workspace-scoped skills and knowledge bases. A workspace carries a name, optional description, appearance, and optional project instruction. User favorites and ordering belong to the favorites module.

## Domain behavior

- A workspace belongs to one organization and to its members (`workspace_members`: `workspaceId`, `userId`, `role` as `UserRole`, `createdAt`; unique per workspace and user, both foreign keys cascade). There is no separate owner.
- Creating a workspace adds the creator as `admin` in the same transaction.
- Workspace lookups (`findById`, `findAllByUserId`, `findAllByIds`) only return workspaces the user is a member of. The list's chat count and chat activity only cover the requesting member's own chats, because chats stay private to their creator.
- Creating a workspace does not add it to favorites. Users explicitly favorite or unfavorite it; existing favorites are unchanged.
- Workspace skills and knowledge bases use `workspaceId` ownership and cannot be mixed with personal resources.
- Skill and knowledge-base activation is workspace-wide. Both start active; deactivation excludes them from new run context. Deactivating a skill also clears its pin.
- Enabled skills are advertised as activation candidates. Instructions and attached resources are loaded only after `activate_skill` or a trusted quick action.
- `GetWorkspaceAiContextUseCase` resolves instruction, active skill candidates, independently active knowledge bases, and source counts. `BuildWorkspaceRunContextUseCase` prepares this for inference.

## Access boundary

`WorkspaceAccessService.requireMember` grants read, write and execution access to any member of the workspace in the caller's organization; anyone else, org admins included, gets `WorkspaceNotFoundError` (404). The service and the repository ports are internal. Other modules use:

- `AssertWorkspaceReadAccessUseCase`
- `AssertWorkspaceWriteAccessUseCase`
- `AssertWorkspaceExecutionAccessUseCase`

Trusted execution resolves the authenticated persisted thread and verifies its workspace; a raw workspace ID cannot establish execution access. Skills and knowledge bases translate workspace-not-found denials into resource-not-found errors to avoid leaking resource existence.

Workspace-owned resource lifecycle is exposed by the canonical `/skills` and `/knowledge-bases` APIs. The workspace module has no forwarding CRUD, state, relation, or source use cases and no nested resource controllers.

## Deletion

`WorkspaceDeletionService` emits `WorkspaceDeletionRequestedEvent` before deleting and drains deferred cleanup only after the database delete succeeds. `DeleteWorkspaceUseCase` uses it after checking membership. Favorites, threads, skills, and knowledge bases listen for their cleanup responsibilities. Database cascades remove owned rows and relation state; listeners handle external object and processing cleanup.

Deleting a user account cascades their memberships but no workspace. `WorkspacesUserDeletionRequestedListener` resolves the user's workspaces before the user row is deleted and defers two independent tasks until after it: `WorkspaceMembersRepository.promoteSuccessors` makes the longest-standing remaining member `admin` wherever no admin is left (it locks the workspace rows first), and every workspace left without members is deleted through `WorkspaceDeletionService`, so the regular deletion listeners still run.

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

- `domain/`: workspace, workspace member and runtime-context entities.
- `application/use-cases/`: workspace CRUD, access capabilities, instruction update, and run-context orchestration.
- `application/services/`: membership access check and the shared deletion flow.
- `application/listeners/`: workspace succession on user deletion.
- `infrastructure/persistence/local/`: TypeORM workspace and membership repositories and mappers.
- `presenters/http/`: workspace and runtime-context controllers and DTO mappers.

## Dependencies

The runs module consumes `BuildWorkspaceRunContextUseCase`. Skills and knowledge bases use exported workspace access capabilities. Workspace runtime context imports exported skills and knowledge-base application use cases. Cross-module persistence ownership remains represented by foreign keys and database cascades.
