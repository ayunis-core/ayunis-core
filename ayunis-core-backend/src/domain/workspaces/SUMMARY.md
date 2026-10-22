# Workspaces Module

## Purpose

Workspaces group chats and own workspace-scoped skills and knowledge bases. A workspace carries a name, optional description, appearance, and optional project instruction, and can be shared with people, teams and the whole organisation. User favorites and ordering belong to the favorites module.

## Domain behavior

- A workspace has one owner and belongs to one organization. Everyone else reaches it through sharing (see below); chats stay private to the person who wrote them. The list's chat count, last activity and activity sort only count the viewer's own chats.
- Creating a workspace does not add it to favorites. Users explicitly favorite or unfavorite it; existing favorites are unchanged.
- Workspace skills and knowledge bases use `workspaceId` ownership and cannot be mixed with personal resources.
- Skill and knowledge-base activation is workspace-wide. Both start active; deactivation excludes them from new run context. Deactivating a skill also clears its pin.
- Enabled skills are advertised as activation candidates. Instructions and attached resources are loaded only after `activate_skill` or a trusted quick action.
- Personal, team and organisation skills and knowledge bases can be linked into a workspace. Link storage and rules live in the skills and knowledge-bases modules. Linked items are always active; `GetWorkspaceAiContextUseCase` returns them as `linkedSkills` and `linkedKnowledgeBases`, the run context merges them with the workspace's own items, and list stats count both. `DescribeLinkedWorkspacesUseCase` names the workspaces an item is linked into, limited to the ones the caller can open.
- `GetWorkspaceAiContextUseCase` resolves instruction, active skill candidates, independently active knowledge bases, and source counts. `BuildWorkspaceRunContextUseCase` prepares this for inference.

## Sharing and access levels

- Levels: owner, `full` ("Vollzugriff"), `edit` ("Kann bearbeiten"), `use` ("Kann verwenden"). A person's level is the highest of their direct grant, each granted team they belong to (per-person override, or excluded) and the organisation share (`use` unless excluded). No level means no access (404).
- Storage: `workspace_access_people`, `workspace_access_teams`, `workspace_access_team_overrides`, `workspace_access_org_exclusions` and `workspaces.isSharedWithOrganization`. The `WorkspaceSharing` aggregate holds the rules (invite, change level, remove, organisation share) and mirrors the prototype: directly invited members of a granted team move into that team's section, overrides equal to the team level are dropped, a team without included members disappears, × removes only the source it is shown under, and a team grant disappears only when the team the person was taken out of has nobody left. Inviting skips people who already have access and teams that are already granted, so a second invite never resets levels, overrides or exclusions. `WorkspaceSharingRepository.save` replaces a workspace's rows in one transaction.
- Rights (`WorkspaceSharingRights`): owners and `full` manage sharing. Inviting, changing and removing need the role right `share_workspaces`, or the team-admin right `team_share_workspaces` for the teams the person administers (then only those teams and their members; a person shown in a team section only for admins of that team). Changes and removals need a person of this organisation; unknown ids get 404. Sharing with the organisation needs `share_workspaces_org`. Nobody changes the owner or their own row. Ending a team share drops the grant with its overrides (people shown in that team lose access unless another team or the organisation share covers them, later team members get none); it needs the invite right for that team and is refused when the caller would lose their own access.
- Losing access removes the person's linked personal skills and knowledge bases from that workspace (`WorkspaceLinkCleanupService`), after every sharing change and after `TeamMembershipEndedEvent` (team member removed, team deleted). Their chats in the workspace are hidden from chat lists but kept.
- `OrgDirectory` (people, teams, memberships of the caller's organisation) backs the sharing view, the invite candidates and member counts.

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

| Method | Route                                  | Purpose                                                |
| ------ | -------------------------------------- | ------------------------------------------------------ |
| POST   | `/workspaces`                          | Create a workspace (`create_workspaces`)               |
| GET    | `/workspaces`                          | List accessible workspaces with level and member count |
| GET    | `/workspaces/:id`                      | Read one workspace                                     |
| PATCH  | `/workspaces/:id`                      | Update metadata and appearance                         |
| DELETE | `/workspaces/:id`                      | Delete a workspace                                     |
| GET    | `/workspaces/:id/context`              | Read the full runtime context                          |
| GET    | `/workspaces/:id/sharing`              | Members by section and the caller's rights             |
| GET    | `/workspaces/:id/share-candidates`     | People, teams and organisation to invite               |
| POST   | `/workspaces/:id/shares`               | Invite people and teams at one level                   |
| PUT    | `/workspaces/:id/members/:userId`      | Change a member's level                                |
| DELETE | `/workspaces/:id/members/:userId`      | Remove a member from where they are shown              |
| DELETE | `/workspaces/:id/teams/:teamId`        | End a team share                                       |
| PUT    | `/workspaces/:id/sharing/organization` | Share with the organisation, or stop                   |
| PATCH  | `/workspaces/:id/context/instruction`  | Update project instruction                             |

## Structure

- `domain/`: workspace and runtime-context entities.
- `application/use-cases/`: workspace CRUD, access capabilities, instruction update, and run-context orchestration.
- `infrastructure/persistence/local/`: TypeORM repository and mapper.
- `presenters/http/`: workspace and runtime-context controllers and DTO mappers.

## Dependencies

The runs module consumes `BuildWorkspaceRunContextUseCase`. The threads module uses `FindAccessibleWorkspaceIdsUseCase` to hide chats of workspaces the person can no longer open. The workspace module imports `TeamsModule` and `UsersModule` for memberships and names. The workspace module imports `OwnershipModule` to name the people who linked items. Skills and knowledge bases use exported workspace access capabilities. Workspace runtime context imports exported skills and knowledge-base application use cases. Cross-module persistence ownership remains represented by foreign keys and database cascades.
