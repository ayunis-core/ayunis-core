import type { APIRequestContext } from '@playwright/test';
import { generatedApi } from './generated-api';

export async function createSuperAdminOrg(
  api: APIRequestContext,
  name: string,
) {
  return generatedApi.superAdminOrgsControllerCreateOrg({ name }, { api });
}
