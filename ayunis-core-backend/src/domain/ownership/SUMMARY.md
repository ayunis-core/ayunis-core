# Ownership Module

## Purpose

Decides who may use, read, change and create skills and knowledge bases that belong to a team or to the organisation. Skills and knowledge bases call this module; it never calls them.

## Rules

`OwnershipViewer` is computed per request from the caller's role permissions, team memberships, administered teams and the organisation's team admin rights. Every check first requires the owner to belong to the caller's organisation.

| Owner | Use | Change and delete | Create |
| --- | --- | --- | --- |
| Team | Current members of the team | Admins, and team admins of that team while the team admin right `team_manage_skills` / `team_manage_knowledge` is on | Team admins of that team with the right (admins only for teams they administer) |
| Organisation | Everyone in the organisation | Holders of `manage_org_skills` / `manage_org_knowledge` (admins always) | Same as change |

Read is use or change: an admin who is not in the team can open and change a team item but cannot use it.

## Use cases

- `GetOwnershipViewerUseCase`: the viewer for the authenticated user.
- `ListOwnerOptionsUseCase`: owners the caller may create a skill or knowledge base for, in the order personal, teams by name, organisation, with member counts and whether a non-admin role holds the organisation right. Backs `GET /skills/owner-options` and `GET /knowledge-bases/owner-options`.
- `DescribeCollectiveOwnersUseCase`: team names, member counts, team editors (team admins while the team right is on) and the organisation audience for a set of owners, using set-based team queries.
- `BuildOwnershipLookupUseCase`: combines the viewer and owner descriptions into an `OwnershipLookup` that resource modules use to fill `viewer` and `ownerDescription` on their responses. For handed-over team and organisation items it also names the person who submitted them (`ownerDescription.submittedBy`, loaded in one batch through `FindUsersByIdsUseCase`).
- `NameOwnersUseCase`: names of personal and team owners and of people (for example who linked an item into a workspace) in one call.

## Dependencies

Imports `PermissionsModule` (my permissions, role permissions, team admin rights), `TeamsModule` (my teams, administered teams, `DescribeTeamsUseCase`) and `UsersModule` (organisation user count, submitter names).
