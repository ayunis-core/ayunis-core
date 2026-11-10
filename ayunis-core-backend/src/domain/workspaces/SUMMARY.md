# Workspaces Module

## Purpose

Workspaces group their members' chats and own workspace-scoped skills and knowledge bases. A workspace carries a name, optional description, appearance, and optional project instruction. User favorites and ordering belong to the favorites module.

## Domain behavior

- A workspace belongs to one organization and to its members (`workspace_members`: `workspaceId`, `userId`, `role` as `UserRole`, `createdAt`; unique per workspace and user, both foreign keys cascade). There is no separate owner.
- Creating a workspace adds the creator as `admin` in the same transaction.
- Members are added, not invited: there is no pending state. Holders of `manage_workspace_members` add users of their own organization in bulk with one role (`user` by default); only workspace admins may assign `admin`. Unknown users and users of another organization reject the whole request (`WORKSPACE_MEMBER_NOT_IN_ORG`, 400) without adding anyone. Users who already are members are skipped and keep their role (an insert with `ON CONFLICT DO NOTHING`, so concurrent adds cannot fail either); the response lists only the members added.
- Holders of `manage_workspace_members` search the colleagues they can add (`ListWorkspaceMemberCandidatesUseCase`): up to 25 users of their organization who are not members yet, matching name or email. The org-wide user list needs `assign_users_to_teams`, which workspace managers usually lack, so the search runs through the users module's `SearchOrgUsersUseCase`, which leaves authorization to the caller.
- Only workspace admins change roles. A workspace always keeps an admin: demoting the last one fails with `WORKSPACE_LAST_ADMIN` (409). There is no org-wide way to repair a workspace without admins, so `UpdateWorkspaceMemberRoleUseCase` locks the workspace row (`WorkspaceMembersRepository.lockWorkspace`, `SELECT … FOR UPDATE` inside its transaction) before it reads the caller's admin role and counts the admins; concurrent role changes are serialized and none passes on a stale read.
- Any member lists the members with name, email and role, ordered by when they joined. Names and emails come from the users module's org-scoped `FindUsersByIdsUseCase` (`WorkspaceMemberProfilesService`).
- Workspace lookups (`findById`, `findAllByUserId`, `findAllByIds`) only return workspaces the user is a member of. The list's chat count and chat activity only cover the requesting member's own chats, because chats stay private to their creator.
- Creating a workspace does not add it to favorites. Users explicitly favorite or unfavorite it; existing favorites are unchanged.
- Workspace skills and knowledge bases use `workspaceId` ownership and cannot be mixed with personal resources.
- Skill and knowledge-base activation is workspace-wide. Both start active; deactivation excludes them from new run context. Deactivating a skill also clears its pin.
- Enabled skills are advertised as activation candidates. Instructions and attached resources are loaded only after `activate_skill` or a trusted quick action.
- `GetWorkspaceAiContextUseCase` resolves instruction, active skill candidates, independently active knowledge bases, and source counts. `BuildWorkspaceRunContextUseCase` prepares this for inference.

## Access boundary

What a member may do follows only their workspace role; the org role grants nothing inside a workspace. `WorkspaceAccess` (`application/models/`) holds the role and its permissions: a workspace `admin` holds every workspace-scoped permission (`WORKSPACE_SCOPED_PERMISSIONS`: `manage_workspace`, `manage_workspace_members`), a `manager` or `user` the workspace-scoped part of that role's row in the org's role matrix, read through the permissions module's `GetMyPermissionsUseCase` at most once per role and request. Defaults: managers hold both, users neither.

`WorkspaceAccessService` resolves the caller's membership (`WorkspaceMembersRepository.findRole`, scoped to the caller's organization) and offers three checks:

- `requireMember`: any member. Reading, chatting and executing.
- `requirePermission(manage_workspace)`: editing details and the instruction, and write access for other modules.
- `requirePermission(manage_workspace_members)`: searching colleagues to add and adding members.
- `requireAdmin`: deleting the workspace, changing roles, and adding admins.

Anyone who is not a member, org admins included, gets `WorkspaceNotFoundError` (404); a member lacking the permission or the admin role gets `UnauthorizedAccessError` (403). The service and the repository ports are internal. Other modules use:

- `AssertWorkspaceReadAccessUseCase`: membership.
- `AssertWorkspaceWriteAccessUseCase`: `manage_workspace`. Skills and knowledge bases use it for every write to a workspace item (create, edit, delete, sources and documents, relations, activation, pin) instead of `manage_skills` / `manage_knowledge_bases`.
- `AssertWorkspaceExecutionAccessUseCase`: membership plus the caller's own thread in the workspace.

Trusted execution resolves the authenticated persisted thread and verifies its workspace; a raw workspace ID cannot establish execution access. Skills and knowledge bases translate workspace-not-found denials into resource-not-found errors to avoid leaking resource existence.

Workspace-owned resource lifecycle is exposed by the canonical `/skills` and `/knowledge-bases` APIs. The workspace module has no forwarding CRUD, state, relation, or source use cases and no nested resource controllers.

## Deletion

`WorkspaceDeletionService` emits `WorkspaceDeletionRequestedEvent` before deleting and drains deferred cleanup only after the database delete succeeds. `DeleteWorkspaceUseCase` uses it after checking that the caller is a workspace admin. Favorites, threads, skills, and knowledge bases listen for their cleanup responsibilities. Database cascades remove owned rows and relation state; listeners handle external object and processing cleanup.

Deleting a user account cascades their memberships but no workspace. `WorkspacesUserDeletionRequestedListener` resolves the user's workspaces before the user row is deleted and defers two independent tasks until after it: `WorkspaceMembersRepository.promoteSuccessors` makes the longest-standing remaining member `admin` wherever no admin is left (it locks the workspace rows first), and every workspace left without members is deleted through `WorkspaceDeletionService`, so the regular deletion listeners still run.

## HTTP API

| Method | Route                                 | Purpose                        |
| ------ | ------------------------------------- | ------------------------------ |
| POST   | `/workspaces`                         | Create a workspace             |
| GET    | `/workspaces`                         | List accessible workspaces     |
| GET    | `/workspaces/:id`                     | Read one workspace             |
| PATCH  | `/workspaces/:id`                     | Update metadata and appearance |
| DELETE | `/workspaces/:id`                     | Delete a workspace (admins)    |
| GET    | `/workspaces/:id/role-permissions`    | What each role grants here     |
| GET    | `/workspaces/:id/members`             | List members (any member)      |
| GET    | `/workspaces/:id/member-candidates`   | Search colleagues to add       |
| POST   | `/workspaces/:id/members`             | Add users with one role        |
| PATCH  | `/workspaces/:id/members/:userId`     | Change a role (admins)         |
| GET    | `/workspaces/:id/context`             | Read the full runtime context  |
| PATCH  | `/workspaces/:id/context/instruction` | Update project instruction     |

Every workspace response carries the caller's workspace `role` and effective workspace `permissions`, so the frontend can hide controls. `GET /workspaces/:id/role-permissions` lists what `user`, `manager` and `admin` grant in the workspace under the current matrix; any member may read it.

## Structure

- `domain/`: workspace, workspace member and runtime-context entities.
- `application/use-cases/`: workspace CRUD, members (list, search candidates, add, change role), access capabilities, instruction update, and run-context orchestration.
- `application/models/`: `WorkspaceAccess`, the workspace-scoped permissions, and the member profile and candidate read models.
- `application/services/`: role-based access checks, member profiles, and the shared deletion flow.
- `application/listeners/`: workspace succession on user deletion.
- `infrastructure/persistence/local/`: TypeORM workspace and membership repositories and mappers.
- `presenters/http/`: workspace, members and runtime-context controllers and DTO mappers.

## Dependencies

The runs module consumes `BuildWorkspaceRunContextUseCase`. Skills and knowledge bases use exported workspace access capabilities. The permissions module supplies the role matrix through `GetMyPermissionsUseCase`; the users module supplies member names and emails and the same-organization check through `FindUsersByIdsUseCase`. Workspace runtime context imports exported skills and knowledge-base application use cases. Cross-module persistence ownership remains represented by foreign keys and database cascades.
