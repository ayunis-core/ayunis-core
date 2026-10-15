import type {
  MeResponseDtoRole,
  MyPermissionsResponseDtoPermissionsItem,
  MyPermissionsResponseDtoTeamAdminPermissionsItem,
} from '@/shared/api';

export type AppPermission = MyPermissionsResponseDtoPermissionsItem;
export type TeamAdminPermission =
  MyPermissionsResponseDtoTeamAdminPermissionsItem;

export interface TeamAdminGrants {
  teamIds: readonly string[];
  permissions: readonly TeamAdminPermission[];
}

export interface Authorization {
  can: (permission: AppPermission) => boolean;
  canAny: (...permissions: AppPermission[]) => boolean;
  hasRole: (role: MeResponseDtoRole) => boolean;
  isTeamAdmin: () => boolean;
  isTeamAdminOf: (teamId: string) => boolean;
  teamAdminCan: (teamId: string, permission: TeamAdminPermission) => boolean;
}

const NO_TEAM_ADMIN_GRANTS: TeamAdminGrants = { teamIds: [], permissions: [] };

export function createAuthorization(
  currentRole: MeResponseDtoRole | undefined,
  grantedPermissions: readonly AppPermission[] = [],
  teamAdmin: TeamAdminGrants = NO_TEAM_ADMIN_GRANTS,
): Authorization {
  const can = (permission: AppPermission) =>
    grantedPermissions.includes(permission);
  const isTeamAdminOf = (teamId: string) => teamAdmin.teamIds.includes(teamId);

  return {
    can,
    canAny: (...permissions) => permissions.some(can),
    hasRole: (role) => currentRole === role,
    isTeamAdmin: () => teamAdmin.teamIds.length > 0,
    isTeamAdminOf,
    teamAdminCan: (teamId, permission) =>
      isTeamAdminOf(teamId) && teamAdmin.permissions.includes(permission),
  };
}
