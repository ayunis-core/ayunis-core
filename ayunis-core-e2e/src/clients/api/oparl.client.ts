import type { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from '../../config';
import type { OparlCatalogBodyResponseDto } from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';
import { chat, defaultModel } from './memory.client';

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

export type OparlTool =
  | 'oparl_search'
  | 'oparl_get'
  | 'oparl_read_file'
  | 'oparl_list';

export const OPARL_TOOL_NOT_OFFERED = 'not-offered';

/** A new chat on the user's default model, for calling the council tools. */
export async function createCouncilChat(
  api: APIRequestContext,
): Promise<string> {
  const thread = await generatedApi.threadsControllerCreate(
    { modelId: (await defaultModel(api)).id },
    { api },
  );
  return thread.id;
}

/**
 * The result the run's `tool` call returned to the mock model, or
 * OPARL_TOOL_NOT_OFFERED when the run did not offer the tool.
 */
export async function callOparlTool(
  api: APIRequestContext,
  threadId: string,
  tool: OparlTool,
  args: Record<string, unknown>,
  apiURL = config.apiURL,
): Promise<string> {
  const answer = await chat(
    api,
    threadId,
    `E2E oparl call ${tool} ${JSON.stringify(args)}`,
    apiURL,
  );
  const prefix = 'oparl-result::';
  if (!answer.startsWith(prefix)) {
    throw new Error(`Not an OParl tool result: ${answer}`);
  }
  return answer.slice(prefix.length);
}
