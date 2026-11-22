import { randomUUID } from 'node:crypto';
import { request } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { config } from '../../src/config';
import { generatedApi } from '../../src/clients/api/generated-api';
import { permitEmbeddingModel } from '../../src/clients/api/models.client';
import {
  addSharePointFile,
  SHAREPOINT_HOST,
  sharePointLibraryUrl,
  sharePointSiteUrl,
} from '../../src/clients/graph-mock.client';
import { connectMicrosoft365 } from '../../src/factories/microsoft-365.factory';
import { createOrg } from '../../src/factories/org.factory';
import { expect, test } from '../../src/fixtures/test';

test('adds a SharePoint library to a knowledge base, shows its documents, syncs it now and removes it', async ({
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const key = randomUUID().slice(0, 8);
  const site = `bauamt-${key}`;
  const { storageState } = await createOrg(
    `sharepoint-${key}`,
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
    const page = await context.newPage();
    await page.goto(`/knowledge-bases/${knowledgeBase.id}`);

    await page.getByTestId('knowledge-base-documents-add').click();
    await page
      .getByTestId('knowledge-base-synced-locations-add-sharepoint')
      .click();
    const url = page.getByTestId('sharepoint-location-url');
    const resolution = page.getByTestId('sharepoint-location-resolution');
    await url.fill(sharePointSiteUrl(`not-granted-${key}`));
    await page.getByTestId('sharepoint-location-check').click();
    await expect(resolution).toHaveAttribute('data-outcome', 'not_granted');
    await expect(
      page.getByTestId('sharepoint-location-grant-command'),
    ).toContainText(`/sites/${SHAREPOINT_HOST}:/sites/not-granted-${key}:/permissions`);

    await url.fill(sharePointLibraryUrl(site));
    await page.getByTestId('sharepoint-location-check').click();
    await expect(resolution).toHaveAttribute('data-outcome', 'found');
    await page.getByTestId('sharepoint-location-add').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // No reload: the page picks up what the sync adds in the background.
    const location = page.getByTestId(/^synced-location-[0-9a-f]{8}-/);
    const documentRows = page
      .getByTestId('knowledge-base-documents-card')
      .getByTestId(/^knowledge-base-document-[0-9a-f]{8}-/);
    // Synced files are listed under their location only, never also on their own.
    const syncedRows = page
      .getByTestId(/^synced-location-files-/)
      .getByTestId(/^knowledge-base-document-[0-9a-f]{8}-/);
    const filesToggle = location.getByTestId('synced-location-files-toggle');
    await expect(filesToggle).toBeVisible({ timeout: 30_000 });
    await filesToggle.click();
    await expect(syncedRows).toHaveCount(2, { timeout: 30_000 });
    await expect(documentRows).toHaveCount(2);
    await expect(location).toHaveAttribute('data-sync-state', 'synced', {
      timeout: 30_000,
    });
    await expect(location.getByTestId('synced-location-skipped')).toBeVisible();
    await waitForReadyDocuments(api, knowledgeBase.id, [
      'Gebühren.txt',
      'Hundesteuer.txt',
    ]);

    await addSharePointFile(site, 'Satzungen/Zweitwohnungsteuer.txt', 'Neu');
    await location.getByTestId('synced-location-sync-now').click();
    await expect(syncedRows).toHaveCount(3, { timeout: 30_000 });
    await expect(documentRows).toHaveCount(3);
    await waitForReadyDocuments(api, knowledgeBase.id, [
      'Gebühren.txt',
      'Hundesteuer.txt',
      'Zweitwohnungsteuer.txt',
    ]);
    await expect(location).toHaveAttribute('data-sync-state', 'synced', {
      timeout: 30_000,
    });

    await location.getByTestId('synced-location-remove').click();
    await page.getByTestId('confirmation-confirm').click();
    await expect(location).toHaveCount(0);
    await expect(documentRows).toHaveCount(0);
    expect(
      (
        await generatedApi.knowledgeBasesControllerListDocuments(
          knowledgeBase.id,
          { api },
        )
      ).data,
    ).toEqual([]);
  } finally {
    await context.close();
    await api.dispose();
  }
});

async function waitForReadyDocuments(
  api: APIRequestContext,
  knowledgeBaseId: string,
  names: string[],
): Promise<void> {
  await expect
    .poll(
      async () =>
        (
          await generatedApi.knowledgeBasesControllerListDocuments(
            knowledgeBaseId,
            { api },
          )
        ).data
          .map(({ name, status }) => `${name}:${status}`)
          .sort(),
      { timeout: 60_000 },
    )
    .toEqual(names.map((name) => `${name}:ready`));
}
