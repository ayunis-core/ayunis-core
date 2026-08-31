import type { APIRequestContext } from '@playwright/test';
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
