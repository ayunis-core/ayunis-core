import type { APIRequestContext } from '@playwright/test';
import type {
  RolePermissionSetDtoPermissionsItem,
  TeamAdminPermissionsResponseDtoPermissionsItem,
} from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';

export type ConfigurableRole = 'manager' | 'user';
export type Permission = RolePermissionSetDtoPermissionsItem;
export type TeamAdminPermission = TeamAdminPermissionsResponseDtoPermissionsItem;

export async function getRolePermissions(
  api: APIRequestContext,
  role: ConfigurableRole,
): Promise<Permission[]> {
  const { roles } = await generatedApi.rolePermissionsControllerGet({ api });
  return roles.find((set) => set.role === role)?.permissions ?? [];
}

export async function setRolePermissions(
  api: APIRequestContext,
  role: ConfigurableRole,
  permissions: Permission[],
): Promise<void> {
  await generatedApi.rolePermissionsControllerUpdate(
    role,
    { permissions },
    { api },
  );
}

export async function getTeamAdminPermissions(
  api: APIRequestContext,
): Promise<TeamAdminPermission[]> {
  const { permissions } =
    await generatedApi.teamAdminPermissionsControllerGet({ api });
  return permissions;
}

export async function setTeamAdminPermissions(
  api: APIRequestContext,
  permissions: TeamAdminPermission[],
): Promise<void> {
  await generatedApi.teamAdminPermissionsControllerUpdate(
    { permissions },
    { api },
  );
}
