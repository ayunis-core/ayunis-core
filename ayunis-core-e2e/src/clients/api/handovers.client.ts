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

export async function handOverAtOnce(
  api: APIRequestContext,
  kind: HandoverKind,
  resourceId: string,
  target: { teamId: string } | "org",
): Promise<void> {
  const response = await requestCreateHandover(api, kind, resourceId, target);
  const body = (await response.json()) as { status?: string };
  if (response.status() !== 201 || body.status !== "approved") {
    throw new Error(
      `Handover of ${kind} ${resourceId} was not applied (${response.status()})`,
    );
  }
}
