import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

/**
 * What a user may do in one team: the permissions their organisation role
 * holds everywhere, plus the permissions their team role holds in this team.
 */
export class TeamAccess {
  readonly teamRole: UserRole | null;
  private readonly orgPermissions: ReadonlySet<Permission>;
  private readonly teamPermissions: ReadonlySet<Permission>;

  constructor(params: {
    teamRole: UserRole | null;
    orgPermissions: Iterable<Permission>;
    teamPermissions: Iterable<Permission>;
  }) {
    this.teamRole = params.teamRole;
    this.orgPermissions = new Set(params.orgPermissions);
    this.teamPermissions = new Set(params.teamPermissions);
  }

  can(permission: Permission): boolean {
    return this.canOrgWide(permission) || this.teamPermissions.has(permission);
  }

  canAny(...permissions: Permission[]): boolean {
    return permissions.some((permission) => this.can(permission));
  }

  canOrgWide(permission: Permission): boolean {
    return this.orgPermissions.has(permission);
  }

  get permissions(): Permission[] {
    return Object.values(Permission).filter((permission) =>
      this.can(permission),
    );
  }

  /**
   * Member management held only through a team role (e.g. a team manager)
   * covers adding and removing ordinary members. Changing roles and removing
   * team admins needs team admin or organisation-wide member management.
   */
  get canManageRoles(): boolean {
    return (
      this.canOrgWide(Permission.ASSIGN_USERS_TO_TEAMS) ||
      this.teamRole === UserRole.ADMIN
    );
  }
}
