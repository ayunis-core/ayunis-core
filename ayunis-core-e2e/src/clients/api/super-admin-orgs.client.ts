import type { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from '../../config';
import { generatedApi } from './generated-api';

export async function createSuperAdminOrg(
  api: APIRequestContext,
  name: string,
) {
  return generatedApi.superAdminOrgsControllerCreateOrg({ name }, { api });
}

export async function getSuperAdminOrg(api: APIRequestContext, orgId: string) {
  return generatedApi.superAdminOrgsControllerGetOrgById(orgId, { api });
}

// Raw response so specs can assert rejected renames; the generated client
// throws on non-2xx.
export function submitSuperAdminOrgRename(
  api: APIRequestContext,
  orgId: string,
  name: string,
): Promise<APIResponse> {
  return api.patch(`${config.apiURL}/api/super-admin/orgs/${orgId}`, {
    data: { name },
  });
}
