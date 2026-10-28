import type { APIRequestContext } from "@playwright/test";
import type { CreateInviteDto } from "../generated/ayunisCoreAPI.schemas";
import { config } from "../../config";
import { generatedApi } from "./generated-api";

export function inviteUserWithTeams(
  api: APIRequestContext,
  email: string,
  teamIds: string[],
) {
  return generatedApi.invitesControllerCreate(
    { email, role: "user", teamIds },
    { api },
  );
}
export function requestInviteWithTeams(
  api: APIRequestContext,
  data: CreateInviteDto,
) {
  return api.post(`${config.apiURL}/api/invites`, { data });
}
export function listPendingInvites(api: APIRequestContext, email: string) {
  return generatedApi.invitesControllerGetInvites({ search: email }, { api });
}
export function publicInviteDetails(api: APIRequestContext, token: string) {
  return generatedApi.invitesControllerGetInviteByToken(token, { api });
}

export function grantTeamAssignmentPermission(api: APIRequestContext) {
  return generatedApi.rolePermissionsControllerUpdate(
    "user",
    { permissions: ["assign_users_to_teams"] },
    { api },
  );
}
