import { inviteUser } from '../../src/clients/api/invites.client';
import { test, expect } from '../../src/fixtures/test';

// Invite journey: the worker org's admin invites a member via the API, the
// invitee follows the emailed link, sets up the account, and signs in.
// The page starts unauthenticated (it belongs to the invitee); the `api`
// fixture stays authenticated as the org admin.
test.use({ storageState: { cookies: [], origins: [] } });

test('invited member joins the org and signs in', async ({
  page,
  api,
  mail,
}) => {
  const email = `e2e-invitee-${Date.now()}@e2e.local`;
  const password = 'E2e-Password-1';

  await inviteUser(api, email);

  const token = await mail.extractLinkToken(email, '/accept-invite');
  await page.goto(`/accept-invite?token=${token}`);
  await page.getByTestId('invite-accept-name').fill('E2E Invitee');
  await page.getByTestId('invite-accept-password').fill(password);
  await page.getByTestId('invite-accept-submit').click();

  await expect(page).toHaveURL(/\/login/);

  await page.getByTestId('email').fill(email);
  await page.getByTestId('login-continue').click();
  await page.getByTestId('password').fill(password);
  await page.getByTestId('submit').click();
  await expect(page).not.toHaveURL(/\/login/);
});
