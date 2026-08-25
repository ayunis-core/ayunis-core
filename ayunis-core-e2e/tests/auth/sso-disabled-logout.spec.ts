import { test, expect } from '../../src/fixtures/test';

test('keeps logout lifecycle available when SSO login is disabled', async ({
  org,
  page,
  publicApi,
}) => {
  const discovery = await publicApi.post('/api/auth/sso/discover', {
    data: { email: org.admin.email },
  });
  expect(discovery.status()).toBe(404);

  const backchannelLogout = await publicApi.post(
    '/api/auth/sso/oidc/backchannel-logout',
    { form: { logout_token: '' } },
  );
  expect(backchannelLogout.status()).toBe(400);

  await page.goto('/chat');
  await expect(page.getByTestId('sidebar')).toBeVisible();

  await page.getByTestId('menu').click();
  await page.getByRole('menuitem', { name: 'Abmelden' }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto('/settings/account');
  await expect(page).toHaveURL(/\/login/);
});
