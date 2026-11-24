import { request as apiRequest } from "@playwright/test";
import type { APIRequestContext, APIResponse } from "@playwright/test";
import type {
  MeResponseDto,
  SessionTokensResponseDto,
} from "../generated/ayunisCoreAPI.schemas";
import { config } from "../../config";
import { generatedApi } from "./generated-api";

// Token clients (the Outlook add-in) call the API with a Bearer access token
// and never hold cookies. API keys are Bearer secrets too.
async function withAccessToken<T>(
  accessToken: string,
  call: (api: APIRequestContext) => Promise<T>,
): Promise<T> {
  const api = await apiRequest.newContext({
    baseURL: config.apiURL,
    // The backend prefers an access-token cookie over the bearer header, so a
    // context that inherited the spec's cookies would answer as a browser
    // session and a closed-route assertion would pass for the wrong reason.
    storageState: { cookies: [], origins: [] },
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

export async function listThreadsStatus(
  api: APIRequestContext,
): Promise<number> {
  return (await api.get(`${config.apiURL}/api/threads`)).status();
}

export function listThreadsStatusForAccessToken(
  accessToken: string,
): Promise<number> {
  return withAccessToken(accessToken, listThreadsStatus);
}

/** A route the Outlook pane has no business calling. */
export function listApiKeysStatusForAccessToken(
  accessToken: string,
): Promise<number> {
  return withAccessToken(accessToken, async (api) =>
    (await api.get(`${config.apiURL}/api/api-keys`)).status(),
  );
}

export function refreshWithBodyToken(
  api: APIRequestContext,
  refreshToken: string,
): Promise<APIResponse> {
  return api.post(`${config.apiURL}/api/auth/refresh`, {
    data: { refreshToken },
  });
}

/** Refreshes the way the pane does: the token in the body, no cookies. */
export async function refreshPaneTokens(
  refreshToken: string,
): Promise<SessionTokensResponseDto> {
  const api = await apiRequest.newContext({
    baseURL: config.apiURL,
    storageState: { cookies: [], origins: [] },
  });
  try {
    const response = await refreshWithBodyToken(api, refreshToken);
    if (!response.ok()) {
      throw new Error(`Body-token refresh failed (HTTP ${response.status()})`);
    }
    return (await response.json()) as SessionTokensResponseDto;
  } finally {
    await api.dispose();
  }
}

/**
 * Tokens the sign-in dialog would hand the pane for the cookie session in
 * `api`. The backend only hands a session over to the frontend origin.
 */
export async function handOffSessionToOutlook(
  api: APIRequestContext,
): Promise<SessionTokensResponseDto> {
  const response = await api.post(`${config.apiURL}/api/auth/session/handoff`, {
    headers: { Origin: new URL(config.baseURL).origin },
    data: { client: "outlook" },
  });
  if (!response.ok()) {
    throw new Error(
      `Session handoff failed (HTTP ${response.status()}): ${await response.text()}`,
    );
  }
  return (await response.json()) as SessionTokensResponseDto;
}

export interface RouteCall {
  method: "GET" | "POST" | "DELETE";
  path: string;
}

function fetchRoute(
  api: APIRequestContext,
  { method, path }: RouteCall,
): Promise<APIResponse> {
  return api.fetch(`${config.apiURL}/api${path}`, { method });
}

export async function routeStatus(
  api: APIRequestContext,
  call: RouteCall,
): Promise<number> {
  return (await fetchRoute(api, call)).status();
}

export function routeDenialWithBearer(
  bearer: string,
  call: RouteCall,
): Promise<{ status: number; code?: string }> {
  return withAccessToken(bearer, async (api) => {
    const response = await fetchRoute(api, call);
    const { code } = (await response.json()) as { code?: string };
    return { status: response.status(), code };
  });
}

export function routeStatusWithBearer(
  bearer: string,
  call: RouteCall,
): Promise<number> {
  return withAccessToken(bearer, (api) => routeStatus(api, call));
}
