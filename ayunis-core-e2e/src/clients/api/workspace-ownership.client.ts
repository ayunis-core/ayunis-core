import type { APIRequestContext, APIResponse } from "@playwright/test";
import { config } from "../../config";

function url(workspaceId: string, path = ""): string {
  return `${config.apiURL}/api/workspaces/${workspaceId}${path}`;
}

export function requestRenameWorkspace(
  api: APIRequestContext,
  workspaceId: string,
  name: string,
): Promise<APIResponse> {
  return api.patch(url(workspaceId), { data: { name } });
}

export function requestDeleteWorkspace(
  api: APIRequestContext,
  workspaceId: string,
): Promise<APIResponse> {
  return api.delete(url(workspaceId));
}

export function requestOwnershipCandidates(
  api: APIRequestContext,
  workspaceId: string,
): Promise<APIResponse> {
  return api.get(url(workspaceId, "/ownership/candidates"));
}

export function requestTransferOwnership(
  api: APIRequestContext,
  workspaceId: string,
  userId: string,
): Promise<APIResponse> {
  return api.post(url(workspaceId, "/ownership"), { data: { userId } });
}
