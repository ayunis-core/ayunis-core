import { request } from '@playwright/test';
import { login } from '../../src/clients/api/auth.client';
import { requestInvite } from '../../src/clients/api/invites.client';
import { config } from '../../src/config';
import { CreateInviteDtoRole } from '../../src/clients/generated/ayunisCoreAPI.schemas';
import { createUser } from '../../src/factories/user.factory';
import { test, expect } from '../../src/fixtures/test';

test.setTimeout(90_000);

test('only a tenant admin can invite another tenant admin', async ({
  api,
  mail,
}) => {
  const member = await createUser(api, mail, `invite-auth-${Date.now()}`);
  const memberApi = await request.newContext({ baseURL: config.apiURL });

  try {
    await login(memberApi, member.email, member.password);
    const inviteeEmail = `e2e-admin-invite-${Date.now()}@e2e.local`;

    const deniedResponse = await requestInvite(
      memberApi,
      inviteeEmail,
      CreateInviteDtoRole.admin,
    );
    expect(deniedResponse.status()).toBe(403);

    const allowedResponse = await requestInvite(
      api,
      inviteeEmail,
      CreateInviteDtoRole.admin,
    );
    expect(allowedResponse.status()).toBe(201);
    await mail.waitForMessage(inviteeEmail);
  } finally {
    await memberApi.dispose();
  }
});
