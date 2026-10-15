import type { APIRequestContext, APIResponse } from "@playwright/test";
import { config } from "../../config";
import type {
  PaginatedTeamMembersResponseDto,
  PermittedImageGenerationModelResponseDto,
  PermittedLanguageModelResponseDto,
  TeamResponseDto,
} from "../generated/ayunisCoreAPI.schemas";
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
): Promise<TeamResponseDto[]> {
  return generatedApi.teamsControllerListMyTeams({ api });
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

export function requestListTeams(api: APIRequestContext): Promise<APIResponse> {
  return api.get(`${config.apiURL}/api/teams`);
}

export function requestGetTeam(
  api: APIRequestContext,
  teamId: string,
): Promise<APIResponse> {
  return api.get(`${config.apiURL}/api/teams/${teamId}`);
}

export function requestSetTeamAdmin(
  api: APIRequestContext,
  teamId: string,
  userId: string,
  isTeamAdmin: boolean,
): Promise<APIResponse> {
  return api.patch(`${config.apiURL}/api/teams/${teamId}/members/${userId}`, {
    data: { isTeamAdmin },
  });
}
