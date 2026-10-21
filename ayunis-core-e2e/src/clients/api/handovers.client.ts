import type { APIRequestContext, APIResponse } from "@playwright/test";
import { config } from "../../config";

export type HandoverKind = "skill" | "knowledge_base";

export function requestCreateHandover(
  api: APIRequestContext,
  kind: HandoverKind,
  resourceId: string,
  target: { teamId: string } | "org",
): Promise<APIResponse> {
  return api.post(`${config.apiURL}/api/handover-requests`, {
    data: {
      resourceType: kind,
      resourceId,
      ...(target === "org"
        ? { targetType: "org" }
        : { targetType: "team", targetTeamId: target.teamId }),
    },
  });
}

export function requestListHandovers(
  api: APIRequestContext,
  kind: HandoverKind,
): Promise<APIResponse> {
  return api.get(`${config.apiURL}/api/handover-requests?resourceType=${kind}`);
}

export function requestHandoverSummary(
  api: APIRequestContext,
): Promise<APIResponse> {
  return api.get(`${config.apiURL}/api/handover-requests/summary`);
}

export function requestDecideHandover(
  api: APIRequestContext,
  requestId: string,
  decision: "approve" | "reject",
): Promise<APIResponse> {
  return api.post(
    `${config.apiURL}/api/handover-requests/${requestId}/${decision}`,
  );
}

export function requestWithdrawHandover(
  api: APIRequestContext,
  requestId: string,
): Promise<APIResponse> {
  return api.delete(`${config.apiURL}/api/handover-requests/${requestId}`);
}
