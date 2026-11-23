import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { request, test } from '@playwright/test';
import { config } from '../src/config';
import { generatedApi } from '../src/clients/api/generated-api';
import { permitEmbeddingModel } from '../src/clients/api/models.client';
import type { PrMediaContext, PrMediaScene } from './types';

const PAGES: Record<string, string> = {
  '/': page(
    'Stadt Musterstadt',
    '<p>Willkommen auf der Website der Stadt Musterstadt.</p><a href="/buergerbuero">Bürgerbüro</a> <a href="/abfall">Abfallkalender</a>',
  ),
  '/buergerbuero': page(
    'Bürgerbüro',
    '<p>Das Bürgerbüro ist montags bis freitags von 8 bis 12 Uhr geöffnet.</p>',
  ),
  '/abfall': page(
    'Abfallkalender',
    '<p>Die Biotonne wird dienstags geleert.</p>',
  ),
};

function page(title: string, body: string): string {
  return `<!doctype html><html><head><title>${title}</title></head><body>${body}</body></html>`;
}

let server: Promise<Server> | undefined;

async function siteUrl(): Promise<string> {
  server ??= new Promise<Server>((resolve, reject) => {
    const created = createServer((req, res) => {
      const body = PAGES[new URL(req.url ?? '/', 'http://site').pathname];
      res.writeHead(body ? 200 : 404, {
        'content-type': 'text/html; charset=utf-8',
      });
      res.end(body ?? 'Not found');
    });
    created.once('error', reject);
    created.listen(0, () => resolve(created));
  });
  const { port } = (await server).address() as AddressInfo;
  return `http://127.0.0.1:${port}/`;
}

/** A knowledge base with a synced website and one that cannot be reached. */
async function openKnowledgeBaseWithWebsites({ page, expect }: PrMediaContext) {
  test.info().setTimeout(120_000);
  const api = await request.newContext({
    baseURL: config.apiURL,
    storageState: await page.context().storageState(),
  });
  await permitEmbeddingModel(api);
  const knowledgeBase = await generatedApi.knowledgeBasesControllerCreate(
    { ownerType: 'personal', name: 'Stadt Musterstadt' },
    { api },
  );
  const url = await siteUrl();
  const website = await generatedApi.knowledgeBaseSyncedLocationsControllerAddWebsite(
    knowledgeBase.id,
    { url, maxDepth: 1 },
    { api },
  );
  const unreachable =
    await generatedApi.knowledgeBaseSyncedLocationsControllerAddWebsite(
      knowledgeBase.id,
      { url: 'http://127.0.0.1:9/satzungen', maxDepth: 0 },
      { api },
    );
  await expect
    .poll(
      async () =>
        (
          await generatedApi.knowledgeBasesControllerListDocuments(
            knowledgeBase.id,
            { api },
          )
        ).data.map(({ status }) => status),
      { timeout: 60_000 },
    )
    .toEqual(['ready', 'ready', 'ready']);
  await page.goto(`/knowledge-bases/${knowledgeBase.id}`);
  const row = page.getByTestId(`synced-location-${website.id}`);
  await expect(row).toHaveAttribute('data-sync-state', 'synced', {
    timeout: 30_000,
  });
  await expect(
    page.getByTestId(`synced-location-${unreachable.id}`),
  ).toHaveAttribute('data-sync-state', 'last_sync_failed', { timeout: 30_000 });
  await page.getByTestId('knowledge-base-documents-card').scrollIntoViewIfNeeded();
  await api.dispose();
  return { row, website };
}

export default [
  {
    name: 'knowledge-base-website-rows',
    path: '/chat',
    viewports: ['desktop'],
    waitFor: async (context) => (await openKnowledgeBaseWithWebsites(context)).row,
    demos: [
      {
        name: 'website-pages',
        action: async ({ page, expect }) => {
          const row = page.getByTestId(/^synced-location-[0-9a-f]{8}-/).first();
          await row.getByTestId('synced-location-files-toggle').click();
          await expect(
            page
              .getByTestId(/^synced-location-files-[0-9a-f]{8}-/)
              .first()
              .getByTestId(/^knowledge-base-document-/),
          ).toHaveCount(3);
        },
      },
      {
        name: 'add-website-dialog',
        action: async ({ page, expect }) => {
          const url = await siteUrl();
          await page.getByTestId('knowledge-base-documents-add').click();
          await page.getByTestId('knowledge-base-documents-add-url').click();
          await page.getByTestId('website-url').fill(url);
          await page.getByTestId('website-depth').click();
          await page.getByTestId('website-depth-1').click();
          await page.getByTestId('website-add').click();
          await expect(page.getByTestId('website-url-error')).toBeVisible();
        },
      },
    ],
  },
] satisfies PrMediaScene[];
