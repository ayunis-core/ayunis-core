import type { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from '../../config';

/** Raw response, for asserting the status a principal gets. */
export function requestConnectors(
  api: APIRequestContext,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.get(`${apiURL}/api/connectors`);
}
