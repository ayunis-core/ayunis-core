import type { APIRequestContext } from "@playwright/test";
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
  await generatedApi.teamsControllerAddTeamMember(teamId, { userId }, { api });
}

export function listTeamMembers(
  api: APIRequestContext,
  teamId: string,
): Promise<PaginatedTeamMembersResponseDto> {
  return generatedApi.teamsControllerListTeamMembers(
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
