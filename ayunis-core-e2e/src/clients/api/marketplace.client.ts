import type { APIRequestContext, APIResponse } from "@playwright/test";
import { config } from "../../config";
import type {
  MarketplaceConfigResponseDto,
  RoutineResponseDto,
} from "../generated/ayunisCoreAPI.schemas";
import { generatedApi } from "./generated-api";

export function getMarketplaceConfig(
  api: APIRequestContext,
): Promise<MarketplaceConfigResponseDto> {
  return generatedApi.marketplaceControllerGetConfig({ api });
}

export function requestMarketplaceSkillInstall(
  api: APIRequestContext,
  identifier: string,
): Promise<APIResponse> {
  return api.post(`${config.apiURL}/api/skills/install-from-marketplace`, {
    data: { identifier },
  });
}

export function installMarketplaceRoutine(
  api: APIRequestContext,
  identifier: string,
): Promise<RoutineResponseDto> {
  return generatedApi.routinesControllerInstallFromMarketplace(
    { identifier },
    { api },
  );
}

// Raw requests for asserting status codes; `apiURL` targets another backend
// (e.g. the one started with routines disabled).
export function requestMarketplaceRoutine(
  api: APIRequestContext,
  identifier: string,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.get(`${apiURL}/api/marketplace/routines/${identifier}`);
}

export function requestMarketplaceRoutineInstall(
  api: APIRequestContext,
  identifier: string,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.post(`${apiURL}/api/routines/install-from-marketplace`, {
    data: { identifier },
  });
}

export function requestSuggestedMarketplaceRoutines(
  api: APIRequestContext,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.get(`${apiURL}/api/marketplace/suggested-routines`);
}
