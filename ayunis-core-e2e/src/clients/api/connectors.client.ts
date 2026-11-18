import type { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from '../../config';
import type {
  Microsoft365ConnectorResponseDto,
  SaveMicrosoft365ConnectorDto,
} from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';

/** Raw response, for asserting the status a principal gets. */
export function requestConnectors(
  api: APIRequestContext,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.get(`${apiURL}/api/connectors`);
}

/** Raw responses of the Microsoft 365 connection routes, per principal. */
export const requestMicrosoft365Connector = {
  get: (api: APIRequestContext, apiURL = config.apiURL) =>
    api.get(`${apiURL}/api/connectors/microsoft-365`),
  save: (
    api: APIRequestContext,
    data: SaveMicrosoft365ConnectorDto,
    apiURL = config.apiURL,
  ) => api.put(`${apiURL}/api/connectors/microsoft-365`, { data }),
  remove: (api: APIRequestContext, apiURL = config.apiURL) =>
    api.delete(`${apiURL}/api/connectors/microsoft-365`),
};

export function getMicrosoft365Connector(
  api: APIRequestContext,
): Promise<Microsoft365ConnectorResponseDto> {
  return generatedApi.connectorsControllerGetMicrosoft365({ api });
}

export function saveMicrosoft365Connector(
  api: APIRequestContext,
  data: SaveMicrosoft365ConnectorDto,
): Promise<Microsoft365ConnectorResponseDto> {
  return generatedApi.connectorsControllerSaveMicrosoft365(data, { api });
}
