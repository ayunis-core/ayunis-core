import type { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from '../../config';

export function requestCreateWorkspace(
  api: APIRequestContext,
  name: string,
): Promise<APIResponse> {
  return api.post(`${config.apiURL}/api/workspaces`, { data: { name } });
}
