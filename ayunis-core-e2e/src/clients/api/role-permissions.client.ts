import type { APIRequestContext } from '@playwright/test';
import type { UpdateRolePermissionsDtoPermissionsItem } from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';

export function setUserRolePermissions(
  api: APIRequestContext,
  permissions: UpdateRolePermissionsDtoPermissionsItem[],
) {
  return generatedApi.rolePermissionsControllerUpdate(
    'user',
    { permissions },
    { api },
  );
}

export function setManagerRolePermissions(
  api: APIRequestContext,
  permissions: UpdateRolePermissionsDtoPermissionsItem[],
) {
  return generatedApi.rolePermissionsControllerUpdate(
    'manager',
    { permissions },
    { api },
  );
}

export function getUserRolePermissions(
  api: APIRequestContext,
): Promise<string[]> {
  return getRolePermissions(api, 'user');
}

export async function getRolePermissions(
  api: APIRequestContext,
  role: 'user' | 'manager',
): Promise<string[]> {
  const { roles } = await generatedApi.rolePermissionsControllerGet({ api });
  return roles.find((entry) => entry.role === role)?.permissions ?? [];
}
