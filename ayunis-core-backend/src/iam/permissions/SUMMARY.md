# Permissions

Per-organization **role → permission** grants (fine-grained RBAC on top of the
`UserRole` enum). Admins implicitly hold every permission; `MANAGER` and `USER`
hold whatever an org admin grants them.

## Model

- `Permission` — hardcoded enum of assignable capabilities in four groups:
  - teams: `manage_teams`, `assign_users_to_teams`
  - skills: `manage_own_skills`, `install_marketplace_skills`,
    `request_skill_transfer`, `request_skill_transfer_other_teams`,
    `request_skill_transfer_org`, `manage_org_skills`,
    `review_all_skill_requests`
  - knowledge: `manage_own_knowledge`, `request_knowledge_transfer`,
    `request_knowledge_transfer_other_teams`, `request_knowledge_transfer_org`,
    `manage_org_knowledge`, `review_all_knowledge_requests`
  - workspaces: `create_workspaces`, `share_workspaces`, `share_workspaces_org`

  This is the source of truth for what a role can be granted. Enforced today:
  teams, `manage_own_*` (personal and workspace-owned items),
  `install_marketplace_skills`, `create_workspaces`, and the four
  `request_*_transfer` / `request_*_transfer_org` keys, which gate team and org
  shares until handovers replace shares. The other keys are stored and
  configurable but only read by the features that introduce them.
  How the settings UI labels, groups and orders these is purely a display
  concern and lives in the frontend, keyed on the enum — the API returns grants
  only.
- `RolePermission` — `{ id, orgId, role, permission }`, one row per granted
  (org, role, permission) with `UNIQUE(orgId, role, permission)`. **Row exists =
  granted.**
- `CONFIGURABLE_ROLES` = `[MANAGER, USER]` — the only roles that can be
  configured. `ADMIN` is intentionally excluded (implicit-all, never persisted).
- `DEFAULT_ROLE_PERMISSIONS` — defaults granted on org creation: own skills
  and knowledge, marketplace installs, handover requests to own teams and the
  org, creating and managing workspaces. MANAGER additionally gets
  `assign_users_to_teams`. Existing orgs do not follow these defaults; see
  Seeding.

## Enforcement

`@RequirePermission(Permission.X)` + `PermissionsGuard` (both live in the
**authorization** module, guard bound globally by `IamModule`). The guard reads
the required permissions from route metadata and calls `HasPermissionUseCase`,
which short-circuits to `true` for `ADMIN` and otherwise checks
`RolePermissionsRepository.existsForRole`. The decorator is variadic —
`@RequirePermission(A, B)` grants access to holders of *any* of the listed
permissions, used for reads a holder of either permission needs (e.g. the team
reads, reachable with `MANAGE_TEAMS` or `ASSIGN_USERS_TO_TEAMS`).

## Seeding

- New orgs: `CreateOrgUseCase` awaits `SeedDefaultRolePermissionsUseCase`, which
  grants `DEFAULT_ROLE_PERMISSIONS` to every configurable role in a single
  `setForRoles` transaction. `setForRoles` joins an ambient transaction when
  called during registration and opens its own transaction for standalone
  calls. Inline rather than an `org.created` listener:
  an org without a grant matrix leaves every non-admin with no permissions, so a
  failure must fail org creation instead of being logged and swallowed.
- Existing orgs: backfilled by the `CreateRolePermissions` migration so no
  member silently loses skill/knowledge-base access, then mapped onto the
  current keys by `ReplaceRolePermissionKeys`: `manage_skills` →
  `manage_own_skills` + `install_marketplace_skills`, `share_skills` →
  `request_skill_transfer` + `request_skill_transfer_org` (same for knowledge),
  plus `create_workspaces` and `share_workspaces` for MANAGER and USER. Keys
  that widen access (`manage_org_*`, `review_all_*`, `*_other_teams`,
  `share_workspaces_org`, MANAGER `assign_users_to_teams`) are not backfilled.
  `down()` is lossy: it drops the new-only keys and merges the request keys
  back into `share_*`.

## Management

Admin-only `RolePermissionsController` (`role-permissions`, `@Roles(ADMIN)`):
`GET /role-permissions` returns the per-role grants (admin omitted);
`PUT /role-permissions/:role` replaces a role's set. Validation: at least one
permission required (`ArrayMinSize(1)`) and `ADMIN` is rejected as not
configurable (`RoleNotConfigurableError`). Writes are transactional: both
`setForRole` and `setForRoles` delete then insert in one transaction, so seeding
a new org's whole matrix cannot half-succeed.

Any authenticated user can read **their own** effective permissions via
`MyPermissionsController` (`GET /permissions/me`, no role gate) →
`GetMyPermissionsUseCase` (admin ⇒ all permissions, otherwise the caller's
role grants). The frontend uses this to hide controls the user cannot use.

## Layout

Standard hexagonal: `domain/` (`RolePermission` entity, `Permission` enum,
`default-role-permissions.constants`), `application/`
(repository port, use-cases, errors), `infrastructure/`
(local TypeORM record + mapper + repository), `presenters/http/` (admin
`RolePermissionsController`, non-admin `MyPermissionsController`, and DTOs).
Two use cases are exported: `HasPermissionUseCase` for the `PermissionsGuard`,
and `SeedDefaultRolePermissionsUseCase` for org creation.
