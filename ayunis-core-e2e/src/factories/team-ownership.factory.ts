import { request } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { config } from '../config';
import { getAuthenticatedPrincipalId, login } from '../clients/api/auth.client';
import { skipChatPersonalization } from '../clients/api/chat-settings.client';
import { generatedApi } from '../clients/api/generated-api';
import { dismissWelcomeVideo } from '../clients/api/onboarding.client';
import { addTeamMember, createTeam, deleteTeam } from '../clients/api/teams.client';
import type { MailcatcherClient } from '../clients/mailcatcher.client';
import type { TeamResponseDto } from '../clients/generated/ayunisCoreAPI.schemas';
import { createUser } from './user.factory';

type StorageState = Awaited<ReturnType<APIRequestContext['storageState']>>;

export interface Principal {
  id: string;
  api: APIRequestContext;
  storageState: StorageState;
}

export interface TeamOwnershipFixture {
  team: TeamResponseDto;
  /** Member of the team (regular user role). */
  member: Principal;
  /** Organization member outside the team. */
  outsider: Principal;
  addToTeam: (principal: Principal) => Promise<void>;
  removeFromTeam: (principal: Principal) => Promise<void>;
  cleanup: () => Promise<void>;
}

async function createPrincipal(
  adminApi: APIRequestContext,
  mail: MailcatcherClient,
  suffix: string,
): Promise<Principal> {
  const user = await createUser(adminApi, mail, suffix);
  const api = await request.newContext({ baseURL: config.apiURL });
  await login(api, user.email, user.password);
  await dismissWelcomeVideo(api);
  await skipChatPersonalization(api);
  const id = await getAuthenticatedPrincipalId(api);
  return { id, api, storageState: await api.storageState() };
}

/**
 * A team the worker admin belongs to (so the admin may create for it), one
 * member and one organization member outside it.
 */
export async function createTeamOwnershipFixture(
  adminApi: APIRequestContext,
  mail: MailcatcherClient,
  suffix: string,
): Promise<TeamOwnershipFixture> {
  const team = await createTeam(adminApi, `Ownership ${suffix}`);
  const member = await createPrincipal(adminApi, mail, `${suffix}-member`);
  const outsider = await createPrincipal(adminApi, mail, `${suffix}-outsider`);
  await addTeamMember(
    adminApi,
    team.id,
    await getAuthenticatedPrincipalId(adminApi),
  );
  await addTeamMember(adminApi, team.id, member.id);

  return {
    team,
    member,
    outsider,
    addToTeam: (principal) => addTeamMember(adminApi, team.id, principal.id),
    removeFromTeam: (principal) =>
      generatedApi.teamMembersControllerRemoveTeamMember(team.id, principal.id, {
        api: adminApi,
      }),
    cleanup: async () => {
      try {
        await deleteTeam(adminApi, team.id);
        for (const principal of [member, outsider]) {
          await generatedApi.userControllerDeleteUser(principal.id, {
            api: adminApi,
          });
        }
      } finally {
        await member.api.dispose();
        await outsider.api.dispose();
      }
    },
  };
}
