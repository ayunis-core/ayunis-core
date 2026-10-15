import type {
  MeResponseDtoRole,
  MyPermissionsResponseDtoPermissionsItem,
} from '@/shared/api';

export type AppPermission = MyPermissionsResponseDtoPermissionsItem;

export interface Authorization {
  can: (permission: AppPermission) => boolean;
  canAny: (...permissions: AppPermission[]) => boolean;
  hasRole: (role: MeResponseDtoRole) => boolean;
  isTeamAdmin: () => boolean;
  isTeamAdminOf: (teamId: string) => boolean;
}

export function createAuthorization(
  currentRole: MeResponseDtoRole | undefined,
  grantedPermissions: readonly AppPermission[] = [],
  teamAdminTeamIds: readonly string[] = [],
): Authorization {
  const can = (permission: AppPermission) =>
    grantedPermissions.includes(permission);

  return {
    can,
    canAny: (...permissions) => permissions.some(can),
    hasRole: (role) => currentRole === role,
    isTeamAdmin: () => teamAdminTeamIds.length > 0,
    isTeamAdminOf: (teamId) => teamAdminTeamIds.includes(teamId),
  };
}
