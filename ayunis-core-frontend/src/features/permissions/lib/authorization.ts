import type {
  MeResponseDtoRole,
  MyPermissionsResponseDtoPermissionsItem,
} from '@/shared/api';

export type AppPermission = MyPermissionsResponseDtoPermissionsItem;

export interface Authorization {
  can: (permission: AppPermission) => boolean;
  canAny: (...permissions: AppPermission[]) => boolean;
  hasRole: (role: MeResponseDtoRole) => boolean;
}

export function createAuthorization(
  currentRole: MeResponseDtoRole | undefined,
  grantedPermissions: readonly AppPermission[] = [],
): Authorization {
  const can = (permission: AppPermission) =>
    grantedPermissions.includes(permission);

  return {
    can,
    canAny: (...permissions) => permissions.some(can),
    hasRole: (role) => currentRole === role,
  };
}
