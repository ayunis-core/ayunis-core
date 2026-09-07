import { request } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { config } from '../config';
import { login } from '../clients/api/auth.client';
import { skipChatPersonalization } from '../clients/api/chat-settings.client';
import {
  deleteCreditLimitMember,
  ensureUsageSubscription,
  getAuthenticatedCreditPrincipal,
} from '../clients/api/credit-limits.client';
import { getEffectiveLanguageModels } from '../clients/api/models.client';
import { dismissWelcomeVideo } from '../clients/api/onboarding.client';
import {
  addTeamMember,
  createTeam,
  deleteTeam,
} from '../clients/api/teams.client';
import type { MailcatcherClient } from '../clients/mailcatcher.client';
import { createUser } from './user.factory';

export async function createCreditLimitsFixture(
  adminApi: APIRequestContext,
  superAdminApi: APIRequestContext,
  mail: MailcatcherClient,
  suffix: string,
) {
  await ensureUsageSubscription(adminApi, superAdminApi);
  const user = await createUser(adminApi, mail, suffix);
  const memberApi = await request.newContext({ baseURL: config.apiURL });
  await login(memberApi, user.email, user.password);
  await dismissWelcomeVideo(memberApi);
  await skipChatPersonalization(memberApi);
  const principal = await getAuthenticatedCreditPrincipal(memberApi);
  if (principal.id !== user.id || principal.role !== 'user') {
    throw new Error(
      'Credit-limit recipient must independently authenticate as an ordinary user',
    );
  }
  const team = await createTeam(adminApi, `Credit Limits ${suffix}`);
  await addTeamMember(adminApi, team.id, user.id);
  const model = (await getEffectiveLanguageModels(memberApi))[0];
  if (!model)
    throw new Error('Credit-limit member needs a permitted language model');

  return {
    team,
    model,
    member: {
      ...user,
      api: memberApi,
      storageState: await memberApi.storageState(),
    },
    cleanup: async (): Promise<void> => {
      try {
        await deleteTeam(adminApi, team.id);
        await deleteCreditLimitMember(adminApi, user.id);
      } finally {
        await memberApi.dispose();
      }
    },
  };
}
