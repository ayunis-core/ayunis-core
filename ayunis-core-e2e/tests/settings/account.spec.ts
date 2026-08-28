import { expect, test } from '../../src/fixtures/test';

test('does not expose self-service organization SSO linking', async ({
  page,
}) => {
  const discoveryRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('/auth/sso/discover')) {
      discoveryRequests.push(request.url());
    }
  });

  await page.goto('/settings/account');

  await expect(page.getByTestId('account-settings-page')).toBeVisible();
  expect(discoveryRequests).toEqual([]);
});
