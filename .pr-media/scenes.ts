import { request, type Page } from '@playwright/test';
import type { PrMediaScene } from './types';
import { generatedApi } from '../src/clients/api/generated-api';
import { addReadyWebSource } from '../src/clients/api/knowledge-bases.client';
import { permitFirstEmbeddingModel } from '../src/clients/api/models.client';
import { startWebPageServer } from '../src/servers/web-page.server';
import { config } from '../src/config';

/**
 * Creates a knowledge base with two crawled web pages (one scheduled) and
 * opens it. Only the 15-minute cron starts a re-index run, so the failed-run
 * fields of the scheduled page are injected into the documents response.
 */
async function openKnowledgeBaseWithFailedReindex(page: Page) {
  const api = await request.newContext({
    baseURL: config.apiURL,
    storageState: await page.context().storageState(),
  });
  await permitFirstEmbeddingModel(api);
  const site = await startWebPageServer(
    'Abfallkalender',
    'Die Restmülltonne wird alle zwei Wochen geleert.',
  );
  const knowledgeBase = await generatedApi.knowledgeBasesControllerCreate(
    { ownerType: 'personal', name: `Stadtverwaltung ${Date.now()}` },
    { api },
  );
  const scheduled = await addReadyWebSource(api, knowledgeBase.id, site.url, {
    value: 2,
    unit: 'weeks',
  });
  await addReadyWebSource(api, knowledgeBase.id, `${site.url}satzung`);
  await site.close();
  await api.dispose();
  await page.route(
    `**/api/knowledge-bases/${knowledgeBase.id}/documents`,
    async (route) => {
      const response = await route.fetch();
      const body = (await response.json()) as {
        data: { id: string; lastIndexedAt: string | null }[];
      };
      for (const document of body.data) {
        if (document.id === scheduled.id && document.lastIndexedAt) {
          Object.assign(document, {
            lastRunFailedAt: new Date(
              new Date(document.lastIndexedAt).getTime() + 5 * 86_400_000,
            ).toISOString(),
            lastRunErrorCode: 'CONTENT_DEGRADED',
          });
        }
      }
      await route.fulfill({ response, json: body });
    },
  );
  await page.goto(`/knowledge-bases/${knowledgeBase.id}`);
  return { scheduledId: scheduled.id };
}

let scheduledId = '';

export default [
  {
    name: 'kb-reindex-schedule',
    path: '/knowledge-bases',
    viewports: ['desktop'],
    waitFor: async ({ page }) => {
      ({ scheduledId } = await openKnowledgeBaseWithFailedReindex(page));
      const warning = page.getByTestId(
        'knowledge-base-document-reindex-warning',
      );
      await warning.scrollIntoViewIfNeeded();
      return warning;
    },
    demos: [
      {
        name: 'edit-schedule',
        action: async ({ page, expect }) => {
          await page
            .getByTestId(`knowledge-base-document-${scheduledId}`)
            .getByTestId('knowledge-base-document-reindex-schedule')
            .click();
          const dialog = page.getByTestId('reindex-schedule-dialog');
          await expect(
            dialog.getByTestId('reindex-schedule-next-run'),
          ).toBeVisible();
          await dialog.getByTestId('reindex-interval-value').fill('3');
          await dialog.getByTestId('reindex-interval-unit').click();
          await page.getByTestId('reindex-interval-unit-months').click();
          await dialog.getByTestId('reindex-schedule-save').click();
          await expect(dialog).toBeHidden();
          await expect(
            page
              .getByTestId(`knowledge-base-document-${scheduledId}`)
              .getByTestId('knowledge-base-document-reindex-summary'),
          ).toContainText('3');
        },
      },
      {
        name: 'add-url-with-interval',
        action: async ({ page, expect }) => {
          await page.getByTestId('knowledge-base-add-url').click();
          const dialog = page.getByTestId('add-url-dialog');
          await dialog
            .getByTestId('add-url-input')
            .fill('https://www.stadt.example/abfall');
          await dialog.getByTestId('reindex-interval-enabled').click();
          await dialog.getByTestId('reindex-interval-value').fill('13');
          await dialog.getByTestId('add-url-submit').click();
          await expect(
            dialog.getByTestId('reindex-interval-error'),
          ).toBeVisible();
          await dialog.getByTestId('reindex-interval-value').fill('6');
          await expect(dialog.getByTestId('reindex-interval-error')).toBeHidden();
        },
      },
    ],
  },
] satisfies PrMediaScene[];
