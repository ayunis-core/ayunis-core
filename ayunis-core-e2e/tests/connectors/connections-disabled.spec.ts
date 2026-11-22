import { randomUUID } from 'node:crypto';
import { request } from '@playwright/test';
import { config } from '../../src/config';
import {
  requestConnectors,
  requestMicrosoft365Connector,
} from '../../src/clients/api/connectors.client';
import { createCustomIntegration } from '../../src/clients/api/integrations.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import { permitEmbeddingModel } from '../../src/clients/api/models.client';
import { requestFeatureToggles } from '../../src/clients/api/routines.client';
import {
  addSharePointLocation,
  requestSyncedLocations,
} from '../../src/clients/api/synced-locations.client';
import { sharePointLibraryUrl } from '../../src/clients/graph-mock.client';
import { connectMicrosoft365 } from '../../src/factories/microsoft-365.factory';
import { createOrg } from '../../src/factories/org.factory';
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
  expect(
    (await requestMicrosoft365Connector.get(api, disabledApiUrl)).status(),
  ).toBe(404);
  expect(
    (await requestMicrosoft365Connector.remove(api, disabledApiUrl)).status(),
  ).toBe(404);
  expect(
    (await requestMicrosoft365Connector.test(api, disabledApiUrl)).status(),
  ).toBe(404);
  const integration = await createCustomIntegration(api, {
    name: `Connectors off ${Date.now()}`,
    serverUrl: `${config.apiURL}/health`,
    configSchema: { authType: 'CUSTOM', orgFields: [], userFields: [] },
    orgConfigValues: {},
  });

  await page.goto(
    `${disabledBaseUrl}/admin-settings/integrations/microsoft-365`,
  );
  await expect(page).toHaveURL(/\/admin-settings\/integrations(\?|$)/);
  await page.goto(
    `${disabledBaseUrl}/admin-settings/integrations?integration=${integration.id}`,
  );
  await expect(
    page.getByTestId(`integration-card-${integration.id}`),
  ).toBeVisible();
  await expect(page.getByTestId('connections-section')).toHaveCount(0);
});

test('with connectors disabled there are no synced locations, and the documents synced before stay in the knowledge base', async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const key = randomUUID().slice(0, 8);
  const { storageState } = await createOrg(
    `sharepoint-off-${key}`,
    testInfo.outputPath('org.json'),
  );
  const api = await request.newContext({ baseURL: config.apiURL, storageState });
  const context = await browser.newContext({ storageState });
  try {
    await permitEmbeddingModel(api);
    await connectMicrosoft365(api);
    const knowledgeBase = await generatedApi.knowledgeBasesControllerCreate(
      { ownerType: 'personal', name: `Satzungen ${key}` },
      { api },
    );
    const location = await addSharePointLocation(
      api,
      knowledgeBase.id,
      sharePointLibraryUrl(`bauamt-${key}`),
    );
    const readyDocumentIds = async () =>
      (
        await generatedApi.knowledgeBasesControllerListDocuments(
          knowledgeBase.id,
          { api },
        )
      ).data
        .filter(({ status }) => status === 'ready')
        .map(({ id }) => id);
    await expect
      .poll(async () => (await readyDocumentIds()).length, { timeout: 60_000 })
      .toBe(2);
    const documentIds = await readyDocumentIds();

    for (const response of [
      await requestSyncedLocations.list(api, knowledgeBase.id, disabledApiUrl),
      await requestSyncedLocations.add(
        api,
        knowledgeBase.id,
        sharePointLibraryUrl(`planung-${key}`),
        disabledApiUrl,
      ),
      await requestSyncedLocations.syncNow(
        api,
        knowledgeBase.id,
        location.id,
        disabledApiUrl,
      ),
      await requestSyncedLocations.remove(
        api,
        knowledgeBase.id,
        location.id,
        disabledApiUrl,
      ),
      await requestSyncedLocations.resolve(
        api,
        sharePointLibraryUrl(`bauamt-${key}`),
        disabledApiUrl,
      ),
    ])
      expect(response.status()).toBe(404);

    const page = await context.newPage();
    await page.goto(`${disabledBaseUrl}/knowledge-bases/${knowledgeBase.id}`);
    const documentsCard = page.getByTestId('knowledge-base-documents-card');
    for (const id of documentIds)
      await expect(
        documentsCard.getByTestId(`knowledge-base-document-${id}`),
      ).toHaveAttribute('data-document-status', 'ready');
    await expect(
      documentsCard.getByTestId('knowledge-base-document-upload-input'),
    ).toBeAttached();
    await expect(page.getByTestId(/^synced-location-/)).toHaveCount(0);
  } finally {
    await context.close();
    await api.dispose();
  }
});
