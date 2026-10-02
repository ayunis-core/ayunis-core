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

export function requestUpdateApiKey(
  api: APIRequestContext,
  apiKeyId: string,
  data: { name?: string; description?: string | null },
): Promise<APIResponse> {
  return api.patch(`${config.apiURL}/api/api-keys/${apiKeyId}`, { data });
}
