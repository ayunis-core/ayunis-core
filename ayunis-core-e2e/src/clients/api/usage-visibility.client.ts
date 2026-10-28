import type { APIRequestContext } from "@playwright/test";
import { config } from "../../config";
import { generatedApi } from "./generated-api";

export function requestIndividualUsage(
  api: APIRequestContext,
  params: Record<string, string> = {},
) {
  return api.get(`${config.apiURL}/api/usage/users`, { params });
}
export function requestUsageVisibilityChange(
  api: APIRequestContext,
  orgId: string,
  data: unknown,
) {
  return api.patch(
    `${config.apiURL}/api/super-admin/orgs/${orgId}/usage-visibility`,
    { data },
  );
}
export function readUsageConfig(api: APIRequestContext) {
  return generatedApi.usageControllerGetUsageConfig({ api });
}
export function readUsageStats(api: APIRequestContext) {
  return generatedApi.usageControllerGetUsageStats(undefined, { api });
}
export function readIndividualLimits(api: APIRequestContext) {
  return generatedApi.creditLimitsControllerGetUserLimits({ api });
}
export function setIndividualLimit(
  api: APIRequestContext,
  userId: string,
  monthlyCredits: number,
) {
  return generatedApi.creditLimitsControllerSetUserLimit(
    userId,
    { monthlyCredits },
    { api },
  );
}
export function readSuperAdminIndividualUsage(
  api: APIRequestContext,
  orgId: string,
) {
  return generatedApi.superAdminUsageDataControllerGetUserUsage(
    orgId,
    undefined,
    { api },
  );
}

export function readTeamLimits(api: APIRequestContext) {
  return generatedApi.creditLimitsControllerGetTeamLimits({ api });
}
export function setTeamLimit(
  api: APIRequestContext,
  teamId: string,
  monthlyCredits: number,
) {
  return generatedApi.creditLimitsControllerSetTeamLimit(
    teamId,
    { monthlyCredits },
    { api },
  );
}
export function removeTeamLimit(api: APIRequestContext, teamId: string) {
  return generatedApi.creditLimitsControllerRemoveTeamLimit(teamId, { api });
}
export function removeTeamMember(
  api: APIRequestContext,
  teamId: string,
  userId: string,
) {
  return generatedApi.teamsControllerRemoveTeamMember(teamId, userId, { api });
}

export function readSuperAdminUsageConfig(
  api: APIRequestContext,
  orgId: string,
) {
  return generatedApi.superAdminUsageControllerGetUsageConfig(orgId, { api });
}

export function addSuperAdminTeamMember(
  api: APIRequestContext,
  orgId: string,
  teamId: string,
  userId: string,
) {
  return generatedApi.superAdminTeamsControllerCreateMember(
    orgId,
    teamId,
    { userId },
    { api },
  );
}
export function removeSuperAdminTeamMember(
  api: APIRequestContext,
  orgId: string,
  teamId: string,
  userId: string,
) {
  return generatedApi.superAdminTeamsControllerDeleteMember(
    orgId,
    teamId,
    userId,
    { api },
  );
}
export function setSuperAdminTeamLimit(
  api: APIRequestContext,
  orgId: string,
  teamId: string,
  monthlyCredits: number,
) {
  return generatedApi.superAdminTeamCreditLimitsControllerSetTeamLimit(
    orgId,
    teamId,
    { monthlyCredits },
    { api },
  );
}
export function removeSuperAdminTeamLimit(
  api: APIRequestContext,
  orgId: string,
  teamId: string,
) {
  return generatedApi.superAdminTeamCreditLimitsControllerRemoveTeamLimit(
    orgId,
    teamId,
    { api },
  );
}
