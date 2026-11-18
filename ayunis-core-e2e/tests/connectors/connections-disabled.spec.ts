import { requestConnectors } from '../../src/clients/api/connectors.client';
import { createCustomIntegration } from '../../src/clients/api/integrations.client';
import { requestFeatureToggles } from '../../src/clients/api/routines.client';
import { config } from '../../src/config';
import { expect, test } from '../../src/fixtures/test';

// Same database and frontend build, served by a second backend started with
// FEATURE_CONNECTORS_ENABLED=false (see .github/workflows/e2e-tests.yml).
const disabledBaseUrl =
  process.env.E2E_CONNECTORS_DISABLED_BASE_URL ?? 'http://localhost:3003';
// Locally the dev frontend and backend listen on different ports.
const disabledApiUrl =
  process.env.E2E_CONNECTORS_DISABLED_API_URL ?? disabledBaseUrl;

test('with connectors disabled the integrations have no Connections section and the MCP integrations still work', async ({
  api,
  page,
}) => {
  const toggles = await requestFeatureToggles(api, disabledApiUrl);
  expect(await toggles.json()).toMatchObject({ connectorsEnabled: false });
  expect((await requestConnectors(api, disabledApiUrl)).status()).toBe(404);
  const integration = await createCustomIntegration(api, {
    name: `Connectors off ${Date.now()}`,
    serverUrl: `${config.apiURL}/health`,
    configSchema: { authType: 'CUSTOM', orgFields: [], userFields: [] },
    orgConfigValues: {},
  });

  await page.goto(
    `${disabledBaseUrl}/admin-settings/integrations?integration=${integration.id}`,
  );
  await expect(
    page.getByTestId(`integration-card-${integration.id}`),
  ).toBeVisible();
  await expect(page.getByTestId('connections-section')).toHaveCount(0);
});
