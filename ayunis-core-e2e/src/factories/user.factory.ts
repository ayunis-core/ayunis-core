import type { APIRequestContext } from '@playwright/test';
import { login } from '../clients/api/auth.client';
import { skipChatPersonalization } from '../clients/api/chat-settings.client';
import { acceptInvite, inviteUser } from '../clients/api/invites.client';
import { dismissWelcomeVideo } from '../clients/api/onboarding.client';
import { findUserByEmail } from '../clients/api/users.client';
import type { MailcatcherClient } from '../clients/mailcatcher.client';
import { createApiContext } from './api-context.factory';

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

/**
 * A new member of the admin's organization, logged in through its own API
 * context with onboarding dismissed. The caller disposes `api`.
 */
export async function createMemberSession(
  adminApi: APIRequestContext,
  mail: MailcatcherClient,
  uniqueKey: string,
): Promise<{ member: UserContext; api: APIRequestContext }> {
  const member = await createUser(adminApi, mail, uniqueKey);
  const api = await createApiContext({ cookies: [], origins: [] });
  await login(api, member.email, member.password);
  await dismissWelcomeVideo(api);
  await skipChatPersonalization(api);
  return { member, api };
}
