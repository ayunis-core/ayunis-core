import { requestOparlSuperAdminRoutes } from '../../src/clients/api/oparl.client';
import { requestFeatureToggles } from '../../src/clients/api/routines.client';
import { loginAsSeededSuperAdmin } from '../../src/flows/super-admin.flow';
import { expect, test } from '../../src/fixtures/test';

// Same database and frontend build, served by a second backend started with
// FEATURE_OPARL_ENABLED=false (see .github/workflows/e2e-tests.yml).
const disabledBaseUrl =
  process.env.E2E_OPARL_DISABLED_BASE_URL ?? 'http://localhost:3003';
// Locally the dev frontend and backend listen on different ports.
const disabledApiUrl =
  process.env.E2E_OPARL_DISABLED_API_URL ?? disabledBaseUrl;

test.use({ storageState: { cookies: [], origins: [] } });

test('with OParl disabled a super admin finds neither its routes nor its page', async ({
  page,
}) => {
  // The session cookie is per host, so it also signs in to the second backend.
  await loginAsSeededSuperAdmin(page, '/super-admin-settings/orgs');

  const toggles = await requestFeatureToggles(page.request, disabledApiUrl);
  expect(await toggles.json()).toMatchObject({ oparlEnabled: false });
  for (const response of await requestOparlSuperAdminRoutes(
    page.request,
    disabledApiUrl,
  ))
    expect(response.status()).toBe(404);

  await page.goto(`${disabledBaseUrl}/super-admin-settings/oparl`);
  await expect(page).toHaveURL(/\/super-admin-settings\/orgs/);
  await expect(page.getByTestId('super-admin-nav-oparl')).toHaveCount(0);
});
