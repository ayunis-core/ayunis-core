import { requestOparlSystemRoutes } from '../../src/clients/api/oparl.client';
import { loginAsSeededSuperAdmin } from '../../src/flows/super-admin.flow';
import { expect, test } from '../../src/fixtures/test';

test('an org admin without the super admin role is refused on every OParl route', async ({
  api,
}) => {
  for (const response of await requestOparlSystemRoutes(api))
    expect(response.status()).toBe(403);
});

test.describe('super admin', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('cannot add an OParl system on a private address', async ({ page }) => {
    await loginAsSeededSuperAdmin(page, '/super-admin-settings/oparl');
    const added = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/api/super-admin/oparl/systems',
    );

    // Rejected before any request leaves the backend, so no RIS is needed.
    await page
      .getByTestId('oparl-add-url')
      .fill('http://10.0.0.1/oparl/v1.1/system');
    await page.getByTestId('oparl-add-submit').click();

    const response = await added;
    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'OPARL_HOST_BLOCKED' });
    await expect(page.getByTestId('oparl-add-url')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
});
