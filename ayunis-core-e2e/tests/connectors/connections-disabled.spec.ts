import {
  requestConnectors,
  requestMicrosoft365Connector,
} from '../../src/clients/api/connectors.client';
import { requestFeatureToggles } from '../../src/clients/api/routines.client';
import { expect, test } from '../../src/fixtures/test';

// Same database and frontend build, served by a second backend started with
// FEATURE_CONNECTORS_ENABLED=false (see .github/workflows/e2e-tests.yml).
const disabledBaseUrl =
  process.env.E2E_CONNECTORS_DISABLED_BASE_URL ?? 'http://localhost:3003';
// Locally the dev frontend and backend listen on different ports.
const disabledApiUrl =
  process.env.E2E_CONNECTORS_DISABLED_API_URL ?? disabledBaseUrl;

test('with connectors disabled there is no Connections section and the other admin settings still work', async ({
  api,
  page,
}) => {
  const toggles = await requestFeatureToggles(api, disabledApiUrl);
  expect(await toggles.json()).toMatchObject({ connectorsEnabled: false });
  expect((await requestConnectors(api, disabledApiUrl)).status()).toBe(404);
  expect(
    (await requestMicrosoft365Connector.get(api, disabledApiUrl)).status(),
  ).toBe(404);
  expect(
    (await requestMicrosoft365Connector.remove(api, disabledApiUrl)).status(),
  ).toBe(404);
  expect(
    (await requestMicrosoft365Connector.test(api, disabledApiUrl)).status(),
  ).toBe(404);

  await page.goto(`${disabledBaseUrl}/admin-settings/connections/microsoft-365`);
  await expect(page).toHaveURL(/\/admin-settings\/users$/);
  await page.goto(`${disabledBaseUrl}/admin-settings/connections`);
  await expect(page).toHaveURL(/\/admin-settings\/users$/);
  await expect(page.getByTestId('admin-users-sort-name')).toBeVisible();
  await expect(page.getByTestId('settings-sidebar')).toBeVisible();
  await expect(page.getByTestId('admin-settings-nav-connections')).toHaveCount(
    0,
  );
});
