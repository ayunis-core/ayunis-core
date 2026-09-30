import type { APIRequestContext } from '@playwright/test';
import type {
  RolePermissionSetDtoPermissionsItem,
  UpdateRolePermissionsDtoPermissionsItem,
} from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';

type ConfigurableRole = 'manager' | 'user';

/**
 * Revokes one permission from a role in the caller's org and returns a
 * function that restores the role's previous permissions.
 */
export async function revokeRolePermission(
  adminApi: APIRequestContext,
  role: ConfigurableRole,
  permission: RolePermissionSetDtoPermissionsItem,
): Promise<() => Promise<void>> {
  const { roles } = await generatedApi.rolePermissionsControllerGet({
    api: adminApi,
  });
  const previous = (roles.find((set) => set.role === role)?.permissions ??
    []) as UpdateRolePermissionsDtoPermissionsItem[];
  await generatedApi.rolePermissionsControllerUpdate(
    role,
    { permissions: previous.filter((granted) => granted !== permission) },
    { api: adminApi },
  );
  return () =>
    generatedApi.rolePermissionsControllerUpdate(
      role,
      { permissions: previous },
      { api: adminApi },
    );
}
