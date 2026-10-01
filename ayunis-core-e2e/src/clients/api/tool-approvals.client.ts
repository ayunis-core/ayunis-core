import type { APIRequestContext, APIResponse } from "@playwright/test";
import { config } from "../../config";

export function decideToolApprovalResponse(
  api: APIRequestContext,
  threadId: string,
  toolCallId: string,
  decision: "approved" | "declined",
): Promise<APIResponse> {
  return api.post(`${config.apiURL}/api/threads/${threadId}/tool-approvals/${toolCallId}`, {
    data: { decision },
  });
}
