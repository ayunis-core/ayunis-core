import type { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from '../../config';
import type { OparlCatalogBodyResponseDto } from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';

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

/** A body of the OParl catalog by name, as the organization of `api` sees it. */
export async function findOparlCatalogBody(
  api: APIRequestContext,
  name: string,
): Promise<OparlCatalogBodyResponseDto> {
  const bodies = await generatedApi.oparlBodiesControllerList({ api });
  const body = bodies.find((candidate) => candidate.name === name);
  if (!body) throw new Error(`OParl body "${name}" is not in the catalog`);
  return body;
}

export function linkOparlBodies(
  api: APIRequestContext,
  bodyIds: string[],
): Promise<void> {
  return generatedApi.oparlBodiesControllerLink({ bodyIds }, { api });
}

// Raw responses so specs can assert refusals; the generated client throws on
// non-2xx.
export function requestOparlBodiesLink(
  api: APIRequestContext,
  bodyIds: string[],
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.post(`${apiURL}/api/oparl/bodies/links`, { data: { bodyIds } });
}

export function requestOparlBodyUnlink(
  api: APIRequestContext,
  bodyId: string,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.delete(`${apiURL}/api/oparl/bodies/${bodyId}/link`);
}

export function requestOparlCatalogBodies(
  api: APIRequestContext,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.get(`${apiURL}/api/oparl/bodies`);
}
