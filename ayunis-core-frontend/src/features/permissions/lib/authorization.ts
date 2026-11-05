import type {
  MeResponseDtoRole,
  MyPermissionsResponseDtoPermissionsItem,
  MyTeamResponseDto,
} from '@/shared/api';

export type AppPermission = MyPermissionsResponseDtoPermissionsItem;

/** The current user's membership in one team, as returned by `GET /teams/me`. */
export type TeamAccess = Pick<MyTeamResponseDto, 'id' | 'role' | 'permissions'>;

export interface Authorization {
  can: (permission: AppPermission) => boolean;
  canAny: (...permissions: AppPermission[]) => boolean;
  hasRole: (role: MeResponseDtoRole) => boolean;
  /** Org-wide grants, plus what the user's role in that team grants. */
  canInTeam: (teamId: string, permission: AppPermission) => boolean;
  canAnyInTeam: (teamId: string, ...permissions: AppPermission[]) => boolean;
  /** Org-wide grants, or what the user's role in any of their teams grants. */
  canAnyInSomeTeam: (...permissions: AppPermission[]) => boolean;
  /**
   * Mirrors the backend: team admins and org-wide member managers may change
   * team roles and remove team admins.
   */
  canManageTeamRoles: (teamId: string) => boolean;
}

export function createAuthorization(
  currentRole: MeResponseDtoRole | undefined,
  grantedPermissions: readonly AppPermission[] = [],
  teams: readonly TeamAccess[] = [],
): Authorization {
  const can = (permission: AppPermission) =>
    grantedPermissions.includes(permission);
  const findTeam = (teamId: string) => teams.find((team) => team.id === teamId);
  const canInTeam = (teamId: string, permission: AppPermission) =>
    can(permission) ||
    (findTeam(teamId)?.permissions.includes(permission) ?? false);

  return {
    can,
    canAny: (...permissions) => permissions.some(can),
    hasRole: (role) => currentRole === role,
    canInTeam,
    canAnyInTeam: (teamId, ...permissions) =>
      permissions.some((permission) => canInTeam(teamId, permission)),
    canAnyInSomeTeam: (...permissions) =>
      permissions.some(
        (permission) =>
          can(permission) ||
          teams.some((team) => team.permissions.includes(permission)),
      ),
    canManageTeamRoles: (teamId) =>
      can('assign_users_to_teams') || findTeam(teamId)?.role === 'admin',
  };
}
