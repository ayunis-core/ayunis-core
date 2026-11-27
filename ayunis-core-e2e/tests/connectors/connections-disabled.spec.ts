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
  listSyncedLocations,
  requestSyncedLocations,
} from '../../src/clients/api/synced-locations.client';
import { sharePointLibraryUrl } from '../../src/clients/graph-mock.client';
import { connectMicrosoft365 } from '../../src/factories/microsoft-365.factory';
import { createOrg } from '../../src/factories/org.factory';
import { expect, test } from '../../src/fixtures/test';
import {
  htmlPage,
  startWebsiteServer,
} from '../../src/servers/website.server';

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

test('with connectors disabled the synced locations list no SharePoint location, and the documents synced before stay in the knowledge base', async ({
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

    const listed = await requestSyncedLocations.list(
      api,
      knowledgeBase.id,
      disabledApiUrl,
    );
    expect(listed.status()).toBe(200);
    expect(await listed.json()).toEqual({ data: [], availableProducts: [] });
    for (const response of [
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

test('with connectors disabled a website is added, shown, synced and removed, and the SharePoint entries stay hidden', async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const key = randomUUID().slice(0, 8);
  const site = await startWebsiteServer({
    '/abfall': htmlPage(
      'Abfallkalender',
      '<p>Die Biotonne wird dienstags geleert.</p>',
    ),
  });
  const { storageState } = await createOrg(
    `website-off-${key}`,
    testInfo.outputPath('org.json'),
  );
  const api = await request.newContext({ baseURL: config.apiURL, storageState });
  const context = await browser.newContext({ storageState });
  try {
    await permitEmbeddingModel(api);
    await connectMicrosoft365(api);
    const knowledgeBase = await generatedApi.knowledgeBasesControllerCreate(
      { ownerType: 'personal', name: `Abfall ${key}` },
      { api },
    );
    const sharePoint = await addSharePointLocation(
      api,
      knowledgeBase.id,
      sharePointLibraryUrl(`abfall-${key}`),
    );

    const page = await context.newPage();
    await page.goto(`${disabledBaseUrl}/knowledge-bases/${knowledgeBase.id}`);
    await page.getByTestId('knowledge-base-documents-add').click();
    await expect(
      page.getByTestId('knowledge-base-synced-locations-add-sharepoint'),
    ).toHaveCount(0);
    await page.getByTestId('knowledge-base-documents-add-url').click();
    await page.getByTestId('website-url').fill(site.url('/abfall'));
    await page.getByTestId('website-add').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const listed = await requestSyncedLocations.list(
      api,
      knowledgeBase.id,
      disabledApiUrl,
    );
    const { data } = (await listed.json()) as Awaited<
      ReturnType<typeof listSyncedLocations>
    >;
    expect(data.map(({ provider }) => provider)).toEqual(['web']);
    const website = data[0];
    const row = page.getByTestId(`synced-location-${website.id}`);
    await expect(row).toHaveAttribute('data-sync-state', 'synced', {
      timeout: 60_000,
    });
    await expect(page.getByTestId(`synced-location-${sharePoint.id}`)).toHaveCount(
      0,
    );
    await expect
      .poll(
        async () =>
          (
            await generatedApi.knowledgeBasesControllerListDocuments(
              knowledgeBase.id,
              { api },
            )
          ).data
            .filter(({ syncedLocationId }) => syncedLocationId === website.id)
            .map(({ name, status }) => `${name}:${status}`),
        { timeout: 60_000 },
      )
      .toEqual(['Abfallkalender:ready']);

    site.setPage(
      '/abfall',
      htmlPage(
        'Abfallkalender 2027',
        '<p>Die Biotonne wird ab Januar mittwochs geleert.</p>',
      ),
    );
    await row.getByTestId('synced-location-sync-now').click();
    await expect
      .poll(
        async () =>
          (
            await generatedApi.knowledgeBasesControllerListDocuments(
              knowledgeBase.id,
              { api },
            )
          ).data
            .filter(({ syncedLocationId }) => syncedLocationId === website.id)
            .map(({ name }) => name),
        { timeout: 60_000 },
      )
      .toEqual(['Abfallkalender 2027']);

    await row.getByTestId('synced-location-remove').click();
    await page.getByTestId('confirmation-confirm').click();
    await expect(row).toHaveCount(0);
    expect(
      (await listSyncedLocations(api, knowledgeBase.id)).data.map(
        ({ id }) => id,
      ),
    ).toEqual([sharePoint.id]);
    expect(
      (
        await generatedApi.knowledgeBasesControllerListDocuments(
          knowledgeBase.id,
          { api },
        )
      ).data.filter(({ syncedLocationId }) => syncedLocationId === website.id),
    ).toEqual([]);
  } finally {
    await context.close();
    await api.dispose();
    await site.close();
  }
});
