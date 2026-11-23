import type { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from '../../config';

const SOME_SYSTEM_ID = '00000000-0000-4000-8000-000000000000';

/** Raw responses of every super-admin OParl route, for asserting the status a principal gets. */
export function requestOparlSystemRoutes(
  api: APIRequestContext,
  apiURL = config.apiURL,
): Promise<APIResponse[]> {
  const base = `${apiURL}/api/super-admin/oparl/systems`;
  return Promise.all([
    api.get(base),
    api.post(base, {
      data: { url: 'https://ris.example.de/oparl/v1.1/system' },
    }),
    api.post(`${base}/${SOME_SYSTEM_ID}/sync`),
  ]);
}
