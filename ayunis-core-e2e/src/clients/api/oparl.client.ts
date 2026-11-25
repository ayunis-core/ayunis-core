import type { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from '../../config';

const SOME_ID = '00000000-0000-4000-8000-000000000000';

/** Raw responses of every super-admin OParl route, for asserting the status a principal gets. */
export function requestOparlSuperAdminRoutes(
  api: APIRequestContext,
  apiURL = config.apiURL,
): Promise<APIResponse[]> {
  const systems = `${apiURL}/api/super-admin/oparl/systems`;
  const embeddingModel = `${apiURL}/api/super-admin/oparl/embedding-model`;
  return Promise.all([
    api.get(systems),
    api.post(systems, {
      data: { url: 'https://ris.example.de/oparl/v1.1/system' },
    }),
    api.post(`${systems}/${SOME_ID}/sync`),
    api.get(embeddingModel),
    api.put(embeddingModel, { data: { modelId: SOME_ID } }),
  ]);
}
