import { request } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { login } from '../../src/clients/api/auth.client';
import { listPendingInvites } from '../../src/clients/api/invite-teams.client';
import {
  inviteUser,
  requestDeleteInvite,
  requestInvite,
  requestResendInvite,
} from '../../src/clients/api/invites.client';
import { config } from '../../src/config';
import { CreateInviteDtoRole } from '../../src/clients/generated/ayunisCoreAPI.schemas';
import { createApiContext } from '../../src/factories/api-context.factory';
import { createOrg } from '../../src/factories/org.factory';
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

async function pendingInviteId(
  api: APIRequestContext,
  email: string,
): Promise<string> {
  const { data } = await listPendingInvites(api, email);
  expect(data).toHaveLength(1);
  return data[0].id;
}

test('only a tenant admin can delete a pending invite', async ({
  api,
  mail,
}) => {
  const member = await createUser(api, mail, `invite-delete-${Date.now()}`);
  const memberApi = await request.newContext({ baseURL: config.apiURL });

  try {
    await login(memberApi, member.email, member.password);
    const inviteeEmail = `e2e-delete-invite-${Date.now()}@e2e.local`;
    await inviteUser(api, inviteeEmail);
    const inviteId = await pendingInviteId(api, inviteeEmail);

    expect((await requestDeleteInvite(memberApi, inviteId)).status()).toBe(
      403,
    );
    expect(await pendingInviteId(api, inviteeEmail)).toBe(inviteId);

    expect((await requestDeleteInvite(api, inviteId)).status()).toBe(204);
    expect((await listPendingInvites(api, inviteeEmail)).data).toEqual([]);
  } finally {
    await memberApi.dispose();
  }
});

test('a tenant admin cannot delete an invite of another organization', async ({
  api,
}) => {
  const key = Date.now();
  const foreignOrg = await createOrg(
    `foreign-invite-delete-${key}`,
    test.info().outputPath('foreign-org.json'),
  );
  const foreignApi = await createApiContext({ cookies: [], origins: [] });

  try {
    await login(foreignApi, foreignOrg.admin.email, foreignOrg.admin.password);
    const inviteeEmail = `e2e-foreign-invite-${key}@e2e.local`;
    await inviteUser(foreignApi, inviteeEmail);
    const inviteId = await pendingInviteId(foreignApi, inviteeEmail);

    expect((await requestDeleteInvite(api, inviteId)).status()).toBe(404);
    expect(await pendingInviteId(foreignApi, inviteeEmail)).toBe(inviteId);
  } finally {
    await foreignApi.dispose();
  }
});

// The organization check runs before the not-expired check, so a foreign
// pending invite must yield 404 rather than 400.
test('a tenant admin cannot resend an invite of another organization', async ({
  api,
}) => {
  const key = Date.now();
  const foreignOrg = await createOrg(
    `foreign-invite-resend-${key}`,
    test.info().outputPath('foreign-org.json'),
  );
  const foreignApi = await createApiContext({ cookies: [], origins: [] });

  try {
    await login(foreignApi, foreignOrg.admin.email, foreignOrg.admin.password);
    const inviteeEmail = `e2e-foreign-resend-${key}@e2e.local`;
    await inviteUser(foreignApi, inviteeEmail);
    const inviteId = await pendingInviteId(foreignApi, inviteeEmail);

    expect((await requestResendInvite(api, inviteId)).status()).toBe(404);
    expect(await pendingInviteId(foreignApi, inviteeEmail)).toBe(inviteId);
  } finally {
    await foreignApi.dispose();
  }
});
