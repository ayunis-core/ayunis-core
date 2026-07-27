# Permissions

Per-organization **role → permission** grants (fine-grained RBAC on top of the
`UserRole` enum). Admins implicitly hold every permission; `MANAGER` and `USER`
hold whatever an org admin grants them.

## Model

- `Permission` — hardcoded enum of assignable capabilities, currently:
  `manage_teams`, `assign_users_to_teams`, `manage_skills`, `share_skills`,
  `manage_knowledge_bases`, `share_knowledge_bases`. This is the source of truth
  for what a role can be granted.
  How the settings UI labels, groups and orders these is purely a display
  concern and lives in the frontend, keyed on the enum — the API returns grants
  only.
- `RolePermission` — `{ id, orgId, role, permission }`, one row per granted
  (org, role, permission) with `UNIQUE(orgId, role, permission)`. **Row exists =
  granted.**
- `CONFIGURABLE_ROLES` = `[MANAGER, USER]` — the only roles that can be
  configured. `ADMIN` is intentionally excluded (implicit-all, never persisted).
- `DEFAULT_ROLE_PERMISSIONS` — defaults granted on org creation. Chosen to
  preserve pre-RBAC behaviour (all skill + knowledge-base permissions for both
  MANAGER and USER; teams stay admin-only). **Kept in sync with the backfill
  VALUES list in the `CreateRolePermissions` migration.**

## Enforcement

`@RequirePermission(Permission.X)` + `PermissionsGuard` (both live in the
**authorization** module, guard bound globally by `IamModule`). The guard reads
the required permission from route metadata and calls `HasPermissionUseCase`,
which short-circuits to `true` for `ADMIN` and otherwise checks
`RolePermissionsRepository.existsForRole`.

## Seeding

- New orgs: `CreateOrgUseCase` awaits `SeedDefaultRolePermissionsUseCase`, which
  grants `DEFAULT_ROLE_PERMISSIONS` to every configurable role in a single
  `setForRoles` transaction. Inline rather than an `org.created` listener:
  an org without a grant matrix leaves every non-admin with no permissions, so a
  failure must fail org creation instead of being logged and swallowed.
- Existing orgs: backfilled by the `CreateRolePermissions` migration so no
  member silently loses skill/knowledge-base access.

## Management

Admin-only `RolePermissionsController` (`role-permissions`, `@Roles(ADMIN)`):
`GET /role-permissions` returns the per-role grants (admin omitted);
`PUT /role-permissions/:role` replaces a role's set. Validation: at least one
permission required (`ArrayMinSize(1)`) and `ADMIN` is rejected as not
configurable (`RoleNotConfigurableError`). Writes are transactional: both
`setForRole` and `setForRoles` delete then insert in one transaction, so seeding
a new org's whole matrix cannot half-succeed.

## Layout

Standard hexagonal: `domain/` (`RolePermission` entity, `Permission` enum,
`default-role-permissions.constants`), `application/`
(repository port, use-cases, errors), `infrastructure/`
(local TypeORM record + mapper + repository), `presenters/http/` (admin
controller + DTOs).
Two use cases are exported: `HasPermissionUseCase` for the `PermissionsGuard`,
and `SeedDefaultRolePermissionsUseCase` for org creation.
