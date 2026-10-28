import type { APIRequestContext, APIResponse } from "@playwright/test";
import { generatedApi } from "./generated-api";

export function listSuperAdminInvites(api: APIRequestContext, orgId: string) {
  return generatedApi.superAdminInvitesControllerGetInvites(
    orgId,
    { limit: 100 },
    { api },
  );
}

export function requestSuperAdminInviteDeletion(
  api: APIRequestContext,
  orgId: string,
  inviteId: string,
): Promise<APIResponse> {
  return api.delete(`/api/super-admin/orgs/${orgId}/invites/${inviteId}`);
}

export function deleteAllSuperAdminInvites(
  api: APIRequestContext,
  orgId: string,
) {
  return generatedApi.superAdminInvitesControllerDeleteAllPending(orgId, {
    api,
  });
}

export function createSuperAdminInvites(
  api: APIRequestContext,
  orgId: string,
  emails: string[],
) {
  return generatedApi.superAdminInvitesControllerCreateBulk(
    orgId,
    {
      invites: emails.map((email) => ({
        email,
        role: "user" as const,
        teamNames: [],
      })),
    },
    { api },
  );
}
