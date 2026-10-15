import { request } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { config } from '../config';
import { getAuthenticatedPrincipalId, login } from '../clients/api/auth.client';
import { skipChatPersonalization } from '../clients/api/chat-settings.client';
import { dismissWelcomeVideo } from '../clients/api/onboarding.client';
import { acceptInvite, inviteUser } from '../clients/api/invites.client';
import { findUserByEmail } from '../clients/api/users.client';
import type { MailcatcherClient } from '../clients/mailcatcher.client';

export interface UserContext {
  id: string;
  email: string;
  password: string;
  name: string;
}

export async function createUser(
  api: APIRequestContext,
  mail: MailcatcherClient,
  uniqueKey: string,
): Promise<UserContext> {
  const user = {
    email: `e2e-lockout-${uniqueKey}@e2e.local`,
    password: 'E2e-Password-1',
    name: `E2E Lockout ${uniqueKey}`,
  };
  await inviteUser(api, user.email);
  const inviteToken = await mail.extractLinkToken(user.email, '/accept-invite');
  await acceptInvite(api, {
    inviteToken,
    userName: user.name,
    password: user.password,
    hasAcceptedMarketing: false,
  });
  const createdUser = await findUserByEmail(api, user.email);
  if (!createdUser) throw new Error(`Created user ${user.email} was not found`);
  return { ...user, id: createdUser.id };
}

type StorageState = Awaited<ReturnType<APIRequestContext['storageState']>>;

export interface SignedInMember {
  id: string;
  api: APIRequestContext;
  storageState: StorageState;
}

export async function createSignedInMember(
  adminApi: APIRequestContext,
  mail: MailcatcherClient,
  suffix: string,
): Promise<SignedInMember> {
  const user = await createUser(adminApi, mail, suffix);
  const api = await request.newContext({ baseURL: config.apiURL });
  await login(api, user.email, user.password);
  await dismissWelcomeVideo(api);
  await skipChatPersonalization(api);
  const id = await getAuthenticatedPrincipalId(api);
  return { id, api, storageState: await api.storageState() };
}
