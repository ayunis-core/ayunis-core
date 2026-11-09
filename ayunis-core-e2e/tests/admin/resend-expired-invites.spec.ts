import { listPendingInvites } from '../../src/clients/api/invite-teams.client';
import { inviteUser } from '../../src/clients/api/invites.client';
import { expireInvites } from '../../src/clients/database.client';
import type { MailcatcherClient } from '../../src/clients/mailcatcher.client';
import { test, expect } from '../../src/fixtures/test';

async function mailCount(
  mail: MailcatcherClient,
  recipient: string,
): Promise<number> {
  return (await mail.messages()).filter((message) =>
    message.recipients.some((r) => r.includes(recipient)),
  ).length;
}

test('an admin resends every expired invite at once', async ({
  page,
  api,
  mail,
}) => {
  const key = Date.now();
  const expiredEmail = `e2e-resend-expired-${key}@e2e.local`;
  const validEmail = `e2e-resend-valid-${key}@e2e.local`;
  await inviteUser(api, expiredEmail);
  await inviteUser(api, validEmail);
  await mail.waitForMessage(expiredEmail);
  await mail.waitForMessage(validEmail);
  await expireInvites([expiredEmail]);
  const [expired] = (await listPendingInvites(api, expiredEmail)).data;
  const [valid] = (await listPendingInvites(api, validEmail)).data;
  expect(expired.status).toBe('expired');

  await page.goto('/admin-settings/users');
  await page.getByTestId('admin-invites-resend-expired').click();
  await page.getByTestId('confirmation-confirm').click();

  await expect
    .poll(async () => (await listPendingInvites(api, expiredEmail)).data)
    .toEqual([
      expect.objectContaining({
        id: expect.not.stringMatching(expired.id),
        status: 'pending',
      }),
    ]);
  await expect.poll(() => mailCount(mail, expiredEmail)).toBe(2);
  expect((await listPendingInvites(api, validEmail)).data).toEqual([
    expect.objectContaining({ id: valid.id, status: 'pending' }),
  ]);
  expect(await mailCount(mail, validEmail)).toBe(1);
});
