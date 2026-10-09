import type { APIRequestContext, APIResponse } from "@playwright/test";
import { config } from "../../config";

export function requestChatCompletionWithApiKey(
  api: APIRequestContext,
  secret: string,
  model: string,
): Promise<APIResponse> {
  return api.post(`${config.apiURL}/api/openai-compat/v1/chat/completions`, {
    headers: { Authorization: `Bearer ${secret}` },
    data: {
      model,
      messages: [{ role: "user", content: "Summarize the budget." }],
    },
  });
}

export function requestApiKeyUsage(
  api: APIRequestContext,
): Promise<APIResponse> {
  return api.get(`${config.apiURL}/api/usage/api-keys`);
}

export function requestSuperAdminApiKeyUsage(
  api: APIRequestContext,
  orgId: string,
): Promise<APIResponse> {
  return api.get(`${config.apiURL}/api/super-admin/usage/${orgId}/api-keys`);
}
