import type { APIRequestContext, APIResponse } from "@playwright/test";
import { config } from "../../config";
import { generatedApi } from "./generated-api";

export const ONE_HOUR_MS = 60 * 60 * 1000;

export async function getRecordingFairUseLimit(
  api: APIRequestContext,
): Promise<{ limit: number; windowMs: number }> {
  const { recordings } =
    await generatedApi.superAdminPlatformConfigControllerGetFairUseLimits({
      api,
    });
  return recordings;
}

export async function setRecordingFairUseLimit(
  api: APIRequestContext,
  limit: number,
  windowMs = ONE_HOUR_MS,
): Promise<void> {
  await generatedApi.superAdminPlatformConfigControllerSetRecordingFairUseLimit(
    { limit, windowMs },
    { api },
  );
}

// Raw request for asserting the status of a call that may be denied; `apiURL`
// targets another backend (e.g. the one started with recordings disabled).
export function requestRecordingFairUseLimitChange(
  api: APIRequestContext,
  limit: number,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.put(
    `${apiURL}/api/super-admin/platform-config/recording-fair-use-limit`,
    { data: { limit, windowMs: ONE_HOUR_MS } },
  );
}
