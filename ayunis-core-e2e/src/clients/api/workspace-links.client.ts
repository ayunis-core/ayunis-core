import type { APIRequestContext, APIResponse } from "@playwright/test";
import { config } from "../../config";

export type LinkKind = "skills" | "knowledge-bases";

const bodyKey: Record<LinkKind, string> = {
  skills: "skillIds",
  "knowledge-bases": "knowledgeBaseIds",
};

function workspaceUrl(workspaceId: string, path: string): string {
  return `${config.apiURL}/api/workspaces/${workspaceId}/${path}`;
}

export function requestLinkedItems(
  api: APIRequestContext,
  kind: LinkKind,
  workspaceId: string,
): Promise<APIResponse> {
  return api.get(workspaceUrl(workspaceId, `linked-${kind}`));
}

export function requestLinkableItems(
  api: APIRequestContext,
  kind: LinkKind,
  workspaceId: string,
): Promise<APIResponse> {
  return api.get(workspaceUrl(workspaceId, `linkable-${kind}`));
}

export function requestLinkItems(
  api: APIRequestContext,
  kind: LinkKind,
  workspaceId: string,
  ids: string[],
): Promise<APIResponse> {
  return api.post(workspaceUrl(workspaceId, `linked-${kind}`), {
    data: { [bodyKey[kind]]: ids },
  });
}

export function requestUnlinkItem(
  api: APIRequestContext,
  kind: LinkKind,
  workspaceId: string,
  id: string,
): Promise<APIResponse> {
  return api.delete(workspaceUrl(workspaceId, `linked-${kind}/${id}`));
}

export function requestLinkedWorkspaces(
  api: APIRequestContext,
  kind: LinkKind,
  id: string,
): Promise<APIResponse> {
  return api.get(`${config.apiURL}/api/${kind}/${id}/linked-workspaces`);
}
