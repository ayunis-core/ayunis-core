import type { APIRequestContext, APIResponse } from "@playwright/test";
import { config } from "../../config";
import type { MarketplaceConfigResponseDto } from "../generated/ayunisCoreAPI.schemas";
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
