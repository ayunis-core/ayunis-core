import { requestConnectors } from '../../src/clients/api/connectors.client';
import { createMemberSession } from '../../src/factories/user.factory';
import { expect, test } from '../../src/fixtures/test';

test('an org admin finds Microsoft 365 under Connections, a member is denied', async ({
  api,
  page,
  browser,
  mail,
}) => {
  const admin = await requestConnectors(api);
  expect(admin.status()).toBe(200);
  // Exactly product and status: no setup values or credentials.
  expect(await admin.json()).toEqual([
    { product: 'microsoft_365', status: 'not_set_up' },
  ]);

  await page.goto('/admin-settings/users');
  await page.getByTestId('admin-settings-nav-connections').click();
  await expect(page).toHaveURL(/\/admin-settings\/connections$/);
  await expect(
    page.getByTestId('connections-connector-microsoft_365'),
  ).toHaveAttribute('data-status', 'not_set_up');

  const { api: memberApi } = await createMemberSession(
    api,
    mail,
    `connections-${Date.now()}`,
  );
  const memberContext = await browser.newContext({
    storageState: await memberApi.storageState(),
  });
  try {
    expect((await requestConnectors(memberApi)).status()).toBe(403);

    const memberPage = await memberContext.newPage();
    await memberPage.goto('/admin-settings/connections');
    await expect(memberPage).not.toHaveURL(/\/admin-settings/);
  } finally {
    await memberContext.close();
    await memberApi.dispose();
  }
});
