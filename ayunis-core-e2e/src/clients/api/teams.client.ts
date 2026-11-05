import type { APIRequestContext } from "@playwright/test";
import type {
  MyTeamResponseDto,
  PaginatedTeamMembersResponseDto,
  PermittedImageGenerationModelResponseDto,
  PermittedLanguageModelResponseDto,
  TeamResponseDto,
  UpdateTeamMemberRoleDtoRole,
} from "../generated/ayunisCoreAPI.schemas";
import { config } from "../../config";
import { generatedApi } from "./generated-api";

export function createTeam(
  api: APIRequestContext,
  name: string,
): Promise<TeamResponseDto> {
  return generatedApi.teamsControllerCreateTeam({ name }, { api });
}

export async function addTeamMember(
  api: APIRequestContext,
  teamId: string,
  userId: string,
): Promise<void> {
  await generatedApi.teamMembersControllerAddTeamMember(teamId, { userId }, { api });
}

export function bulkAddTeamMembers(
  api: APIRequestContext,
  teamId: string,
  userIds: string[],
) {
  return generatedApi.teamMembersControllerBulkAddTeamMembers(teamId, { userIds }, { api });
}

export function listTeamMembers(
  api: APIRequestContext,
  teamId: string,
): Promise<PaginatedTeamMembersResponseDto> {
  return generatedApi.teamMembersControllerListTeamMembers(
    teamId,
    { limit: 100, offset: 0 },
    { api },
  );
}

export function listMyTeams(
  api: APIRequestContext,
): Promise<MyTeamResponseDto[]> {
  return generatedApi.teamsControllerListMyTeams({ api });
}

export function listTeams(api: APIRequestContext): Promise<TeamResponseDto[]> {
  return generatedApi.teamsControllerListTeams({ api });
}

export async function setTeamMemberRole(
  api: APIRequestContext,
  teamId: string,
  userId: string,
  role: UpdateTeamMemberRoleDtoRole,
): Promise<void> {
  await generatedApi.teamMembersControllerUpdateTeamMemberRole(
    teamId,
    userId,
    { role },
    { api },
  );
}

// Raw requests for asserting the status of calls that may be denied.
export function requestTeam(api: APIRequestContext, teamId: string) {
  return api.get(`${config.apiURL}/api/teams/${teamId}`);
}

export function requestTeamRolePermissions(
  api: APIRequestContext,
  teamId: string,
) {
  return api.get(`${config.apiURL}/api/teams/${teamId}/role-permissions`);
}

export function requestAddTeamMember(
  api: APIRequestContext,
  teamId: string,
  userId: string,
) {
  return api.post(`${config.apiURL}/api/teams/${teamId}/members`, {
    data: { userId },
  });
}

export function requestTeamMemberRoleChange(
  api: APIRequestContext,
  teamId: string,
  userId: string,
  role: UpdateTeamMemberRoleDtoRole,
) {
  return api.patch(`${config.apiURL}/api/teams/${teamId}/members/${userId}`, {
    data: { role },
  });
}

export function requestTeamMemberRemoval(
  api: APIRequestContext,
  teamId: string,
  userId: string,
) {
  return api.delete(`${config.apiURL}/api/teams/${teamId}/members/${userId}`);
}

export async function setTeamModelOverride(
  api: APIRequestContext,
  team: TeamResponseDto,
  enabled: boolean,
): Promise<void> {
  await generatedApi.teamsControllerUpdateTeam(
    team.id,
    { name: team.name, modelOverrideEnabled: enabled },
    { api },
  );
}

export function grantTeamModel(
  api: APIRequestContext,
  teamId: string,
  modelId: string,
): Promise<
  PermittedLanguageModelResponseDto | PermittedImageGenerationModelResponseDto
> {
  return generatedApi.teamPermittedModelsControllerCreateTeamPermittedModel(
    teamId,
    { modelId },
    { api },
  );
}

export async function removeTeamModelGrant(
  api: APIRequestContext,
  teamId: string,
  grantId: string,
): Promise<void> {
  await generatedApi.teamPermittedModelsControllerDeleteTeamPermittedModel(
    teamId,
    grantId,
    { api },
  );
}

export async function deleteTeam(
  api: APIRequestContext,
  teamId: string,
): Promise<void> {
  await generatedApi.teamsControllerDeleteTeam(teamId, { api });
}

export async function setTeamDefaultModel(
  api: APIRequestContext,
  teamId: string,
  permittedModelId: string,
): Promise<void> {
  await generatedApi.teamPermittedModelsControllerSetTeamDefaultModel(
    teamId,
    { permittedModelId },
    { api },
  );
}
