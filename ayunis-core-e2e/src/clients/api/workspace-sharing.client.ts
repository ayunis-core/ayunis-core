import type { APIRequestContext, APIResponse } from "@playwright/test";
import { config } from "../../config";

export type WorkspaceGrantLevel = "use" | "edit" | "full";

function url(workspaceId: string, path = ""): string {
  return `${config.apiURL}/api/workspaces/${workspaceId}${path}`;
}

export function requestGetWorkspace(
  api: APIRequestContext,
  workspaceId: string,
): Promise<APIResponse> {
  return api.get(url(workspaceId));
}

export async function listedWorkspaceIds(
  api: APIRequestContext,
): Promise<string[]> {
  const response = await api.get(`${config.apiURL}/api/workspaces?limit=100`);
  const body = (await response.json()) as { data: { id: string }[] };
  return body.data.map(({ id }) => id);
}

export function requestSharing(
  api: APIRequestContext,
  workspaceId: string,
): Promise<APIResponse> {
  return api.get(url(workspaceId, "/sharing"));
}

export function requestShareCandidates(
  api: APIRequestContext,
  workspaceId: string,
): Promise<APIResponse> {
  return api.get(url(workspaceId, "/share-candidates"));
}

export function requestShare(
  api: APIRequestContext,
  workspaceId: string,
  share: { userIds?: string[]; teamIds?: string[]; accessLevel: WorkspaceGrantLevel },
): Promise<APIResponse> {
  return api.post(url(workspaceId, "/shares"), {
    data: { userIds: [], teamIds: [], ...share },
  });
}

export function requestSetMemberAccess(
  api: APIRequestContext,
  workspaceId: string,
  userId: string,
  accessLevel: WorkspaceGrantLevel,
  teamId?: string,
): Promise<APIResponse> {
  return api.put(url(workspaceId, `/members/${userId}`), {
    data: { accessLevel, ...(teamId && { teamId }) },
  });
}

export function requestRemoveMember(
  api: APIRequestContext,
  workspaceId: string,
  userId: string,
  teamId?: string,
): Promise<APIResponse> {
  const query = teamId ? `?teamId=${teamId}` : "";
  return api.delete(url(workspaceId, `/members/${userId}${query}`));
}

export function requestEndTeamSharing(
  api: APIRequestContext,
  workspaceId: string,
  teamId: string,
): Promise<APIResponse> {
  return api.delete(url(workspaceId, `/teams/${teamId}`));
}

export function requestOrganizationSharing(
  api: APIRequestContext,
  workspaceId: string,
  shared: boolean,
): Promise<APIResponse> {
  return api.put(url(workspaceId, "/sharing/organization"), {
    data: { shared },
  });
}

export function requestUpdateInstruction(
  api: APIRequestContext,
  workspaceId: string,
  instruction: string,
): Promise<APIResponse> {
  return api.patch(url(workspaceId, "/context/instruction"), {
    data: { instruction },
  });
}
