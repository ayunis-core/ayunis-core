import { request as apiRequest } from '@playwright/test';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { MeResponseDto } from '../generated/ayunisCoreAPI.schemas';
import { config } from '../../config';
import { generatedApi } from './generated-api';

// Token clients (the Outlook add-in) call the API with a Bearer access token
// and never hold cookies.
async function withAccessToken<T>(
  accessToken: string,
  call: (api: APIRequestContext) => Promise<T>,
): Promise<T> {
  const api = await apiRequest.newContext({
    baseURL: config.apiURL,
    extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` },
  });
  try {
    return await call(api);
  } finally {
    await api.dispose();
  }
}

export function currentUserForAccessToken(
  accessToken: string,
): Promise<MeResponseDto> {
  return withAccessToken(accessToken, (api) =>
    generatedApi.authenticationControllerMe({ api }),
  );
}

export async function listThreadsStatus(api: APIRequestContext): Promise<number> {
  return (await api.get(`${config.apiURL}/api/threads`)).status();
}

export function listThreadsStatusForAccessToken(
  accessToken: string,
): Promise<number> {
  return withAccessToken(accessToken, listThreadsStatus);
}

export function refreshWithBodyToken(
  api: APIRequestContext,
  refreshToken: string,
): Promise<APIResponse> {
  return api.post(`${config.apiURL}/api/auth/refresh`, {
    data: { refreshToken },
  });
}
