import type { APIRequestContext, APIResponse } from "@playwright/test";
import { config } from "../../config";

export type OwnerBody =
  | { ownerType: "personal" }
  | { ownerType: "team"; teamId: string }
  | { ownerType: "org" };

export function requestCreateSkill(
  api: APIRequestContext,
  owner: OwnerBody,
  name: string,
): Promise<APIResponse> {
  return api.post(`${config.apiURL}/api/skills`, {
    data: {
      ...owner,
      name,
      shortDescription: `${name} prüfen`,
      instructions: "Prüfe die Unterlagen und fasse sie zusammen.",
    },
  });
}

export function requestGetSkill(
  api: APIRequestContext,
  skillId: string,
): Promise<APIResponse> {
  return api.get(`${config.apiURL}/api/skills/${skillId}`);
}

export function requestListPersonalSkills(
  api: APIRequestContext,
): Promise<APIResponse> {
  return api.get(`${config.apiURL}/api/skills?ownerType=personal`);
}

export function requestUpdateSkill(
  api: APIRequestContext,
  skillId: string,
  name: string,
): Promise<APIResponse> {
  return api.put(`${config.apiURL}/api/skills/${skillId}`, {
    data: {
      name,
      shortDescription: `${name} prüfen`,
      instructions: "Prüfe die Unterlagen.",
    },
  });
}

export function requestDeleteSkill(
  api: APIRequestContext,
  skillId: string,
): Promise<APIResponse> {
  return api.delete(`${config.apiURL}/api/skills/${skillId}`);
}

export function requestSetSkillActivation(
  api: APIRequestContext,
  skillId: string,
  isActive: boolean,
): Promise<APIResponse> {
  return api.patch(`${config.apiURL}/api/skills/${skillId}/activation`, {
    data: { isActive },
  });
}

export function requestSkillOwnerOptions(
  api: APIRequestContext,
): Promise<APIResponse> {
  return api.get(`${config.apiURL}/api/skills/owner-options`);
}

export function requestCreateKnowledgeBase(
  api: APIRequestContext,
  owner: OwnerBody,
  name: string,
): Promise<APIResponse> {
  return api.post(`${config.apiURL}/api/knowledge-bases`, {
    data: { ...owner, name, description: "" },
  });
}

export function requestGetKnowledgeBase(
  api: APIRequestContext,
  knowledgeBaseId: string,
): Promise<APIResponse> {
  return api.get(`${config.apiURL}/api/knowledge-bases/${knowledgeBaseId}`);
}

export function requestDeleteKnowledgeBase(
  api: APIRequestContext,
  knowledgeBaseId: string,
): Promise<APIResponse> {
  return api.delete(`${config.apiURL}/api/knowledge-bases/${knowledgeBaseId}`);
}
