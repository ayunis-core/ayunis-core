import { randomUUID } from 'node:crypto';
import { request } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';
import { config } from '../../src/config';
import {
  grantCrawlDomain,
  revokeCrawlDomain,
} from '../../src/clients/api/crawl-domains.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import { permitEmbeddingModel } from '../../src/clients/api/models.client';
import { createOrg } from '../../src/factories/org.factory';
import { createPdf } from '../../src/factories/pdf.factory';
import { sendMessage, startThread } from '../../src/flows/chat.flow';
import { expect, test } from '../../src/fixtures/test';
import {
  htmlPage,
  startWebsiteServer,
  type WebsiteServer,
} from '../../src/servers/website.server';

let site: WebsiteServer;

test.beforeAll(async () => {
  site = await startWebsiteServer({
    '/rathaus': htmlPage(
      'Rathaus Musterstadt',
      '<p>Das Bürgerbüro im Rathaus ist montags bis freitags von 8 bis 12 Uhr geöffnet.</p>',
    ),
  });
});

test.afterAll(async () => {
  await site.close();
});

test('a website added to a knowledge base is synced with its pages and PDFs, cited by their URLs, synced again on demand and removed with its documents', async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const key = randomUUID().slice(0, 8);
  const { orgId, storageState } = await createOrg(
    `website-${key}`,
    testInfo.outputPath('org.json'),
  );
  const api = await request.newContext({ baseURL: config.apiURL, storageState });
  const context = await browser.newContext({ storageState });
  const pdfUrl = site.url('/hauptsatzung.pdf', 'localhost');
  const grant = await grantCrawlDomain(orgId, 'localhost');
  try {
    await permitEmbeddingModel(api);
    const knowledgeBase = await generatedApi.knowledgeBasesControllerCreate(
      { ownerType: 'personal', name: `Rathaus ${key}` },
      { api },
    );
    const page = await context.newPage();
    await page.goto(`/knowledge-bases/${knowledgeBase.id}`);
    await addWebsiteInDialog(page, site.url('/rathaus'));
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // No reload: the page picks up what the sync adds in the background.
    const location = page.getByTestId(/^synced-location-[0-9a-f]{8}-/);
    await expect(location).toHaveAttribute('data-provider', 'web');
    await expect(location).toContainText(site.url('/rathaus'));
    await expect(location).toHaveAttribute('data-sync-state', 'synced', {
      timeout: 60_000,
    });
    await waitForReadyDocuments(api, knowledgeBase.id, ['Rathaus Musterstadt']);
    const documentRows = page
      .getByTestId('knowledge-base-documents-card')
      .getByTestId(/^knowledge-base-document-[0-9a-f]{8}-/);
    const syncedRows = page
      .getByTestId(/^synced-location-files-/)
      .getByTestId(/^knowledge-base-document-[0-9a-f]{8}-/);
    await location.getByTestId('synced-location-files-toggle').click();
    await expect(syncedRows).toHaveCount(1);
    await expect(documentRows).toHaveCount(1);

    await citeFirstSource(page, site.url('/rathaus'));

    site.setPage(
      '/rathaus',
      htmlPage(
        'Rathaus Musterstadt',
        `<p>Das Bürgerbüro ist jetzt auch donnerstags bis 18 Uhr geöffnet.</p><a href="${pdfUrl}">Hauptsatzung</a>`,
      ),
    );
    site.setPage('/hauptsatzung.pdf', {
      contentType: 'application/pdf',
      body: createPdf('Hauptsatzung der Stadt Musterstadt', `AYC-2037-${key}`),
    });
    await page.goto(`/knowledge-bases/${knowledgeBase.id}`);
    await location.getByTestId('synced-location-sync-now').click();
    await waitForReadyDocuments(api, knowledgeBase.id, [
      'Hauptsatzung',
      'Rathaus Musterstadt',
    ]);
    await location.getByTestId('synced-location-files-toggle').click();
    await expect(syncedRows).toHaveCount(2, { timeout: 30_000 });
    await expect(documentRows).toHaveCount(2);
    const pdf = (
      await generatedApi.knowledgeBasesControllerListDocuments(
        knowledgeBase.id,
        { api },
      )
    ).data.find(({ name }) => name === 'Hauptsatzung');
    expect(pdf?.url).toBe(pdfUrl);

    await addWebsiteInDialog(page, site.url('/rathaus'));
    await expect(page.getByTestId('website-url-error')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

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
    await revokeCrawlDomain(orgId, grant.id);
    await context.close();
    await api.dispose();
  }
});

async function addWebsiteInDialog(page: Page, url: string): Promise<void> {
  await page.getByTestId('knowledge-base-documents-add').click();
  await page.getByTestId('knowledge-base-documents-add-url').click();
  await page.getByTestId('website-url').fill(url);
  await page.getByTestId('website-add').click();
}

async function citeFirstSource(page: Page, url: string): Promise<void> {
  await startThread(page, 'Wann ist das Bürgerbüro geöffnet?');
  await sendMessage(page, 'E2E cite first source');
  const citation = page.getByTestId('source-citation').last();
  await expect(citation).toBeVisible();
  await citation.click();
  await expect(
    page
      .getByTestId('source-citation-dialog')
      .getByRole('link', { name: url, exact: true }),
  ).toHaveAttribute('href', url);
  await page.keyboard.press('Escape');
}

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
