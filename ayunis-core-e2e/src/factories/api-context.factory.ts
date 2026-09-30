import { request as apiRequest } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { config } from '../config';

type StorageState = Awaited<ReturnType<APIRequestContext['storageState']>>;

export function createApiContext(
  storageState: StorageState,
): Promise<APIRequestContext> {
  return apiRequest.newContext({ baseURL: config.apiURL, storageState });
}
