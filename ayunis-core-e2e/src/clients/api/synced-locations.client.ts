import type { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from '../../config';
import type {
  SharePointLocationResolutionResponseDto,
  SyncedLocationListResponseDto,
  SyncedLocationResponseDto,
} from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';

/** Raw responses of the synced-location routes, for the status a principal gets. */
export const requestSyncedLocations = {
  list: (api: APIRequestContext, knowledgeBaseId: string, apiURL = config.apiURL) =>
    api.get(`${apiURL}/api/knowledge-bases/${knowledgeBaseId}/synced-locations`),
  add: (
    api: APIRequestContext,
    knowledgeBaseId: string,
    location: string,
    apiURL = config.apiURL,
  ) =>
    api.post(`${apiURL}/api/knowledge-bases/${knowledgeBaseId}/synced-locations`, {
      data: { product: 'microsoft_365', location },
    }),
  syncNow: (
    api: APIRequestContext,
    knowledgeBaseId: string,
    locationId: string,
    apiURL = config.apiURL,
  ) =>
    api.post(
      `${apiURL}/api/knowledge-bases/${knowledgeBaseId}/synced-locations/${locationId}/sync`,
    ),
  remove: (
    api: APIRequestContext,
    knowledgeBaseId: string,
    locationId: string,
    apiURL = config.apiURL,
  ) =>
    api.delete(
      `${apiURL}/api/knowledge-bases/${knowledgeBaseId}/synced-locations/${locationId}`,
    ),
  resolve: (api: APIRequestContext, url: string, apiURL = config.apiURL) =>
    api.post(`${apiURL}/api/connectors/microsoft-365/sharepoint-locations/resolve`, {
      data: { url },
    }),
} satisfies Record<string, (...args: never[]) => Promise<APIResponse>>;

export function listSyncedLocations(
  api: APIRequestContext,
  knowledgeBaseId: string,
): Promise<SyncedLocationListResponseDto> {
  return generatedApi.knowledgeBaseSyncedLocationsControllerList(knowledgeBaseId, {
    api,
  });
}

export function addSharePointLocation(
  api: APIRequestContext,
  knowledgeBaseId: string,
  location: string,
): Promise<SyncedLocationResponseDto> {
  return generatedApi.knowledgeBaseSyncedLocationsControllerAdd(
    knowledgeBaseId,
    { product: 'microsoft_365', location },
    { api },
  );
}

export function resolveSharePointLocation(
  api: APIRequestContext,
  url: string,
): Promise<SharePointLocationResolutionResponseDto> {
  return generatedApi.sharePointLocationsControllerResolve({ url }, { api });
}
