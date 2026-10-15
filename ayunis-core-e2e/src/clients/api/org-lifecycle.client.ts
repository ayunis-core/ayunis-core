import type { APIRequestContext } from "@playwright/test";
import { config } from "../../config";
import type { OrgLifecycleFilter } from "../generated/ayunisCoreAPI.schemas";
import { generatedApi } from "./generated-api";

export function requestOrgArchive(
  api: APIRequestContext,
  orgId: string,
  archived: boolean,
) {
  return api.patch(`${config.apiURL}/api/super-admin/orgs/${orgId}/archive`, {
    data: { archived },
  });
}
export function requestOrgDeletion(
  api: APIRequestContext,
  orgId: string,
  confirmationName: string,
) {
  return api.delete(`${config.apiURL}/api/super-admin/orgs/${orgId}`, {
    data: { confirmationName },
  });
}
export function requestCurrentUser(api: APIRequestContext) {
  return api.get(`${config.apiURL}/api/auth/me`);
}
export function requestRefresh(api: APIRequestContext) {
  return api.post(`${config.apiURL}/api/auth/refresh`);
}
export function listOrgs(
  api: APIRequestContext,
  search: string,
  lifecycle: OrgLifecycleFilter = "all",
) {
  return generatedApi.superAdminOrgsControllerGetAllOrgs(
    { search, lifecycle },
    { api },
  );
}
