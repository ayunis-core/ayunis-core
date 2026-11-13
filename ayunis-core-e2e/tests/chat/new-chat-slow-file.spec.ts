import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from '../../src/fixtures/test';
import { generatedApi } from '../../src/clients/api/generated-api';
import { getThread } from '../../src/clients/api/threads.client';
import type { GetThreadResponseDto } from '../../src/clients/generated/ayunisCoreAPI.schemas';
import { createOcrRejectedPdf } from '../../src/factories/pdf.factory';
import { sendMessage } from '../../src/flows/chat.flow';

const BUDGET = 'Haushalt 2026: Gesamtvolumen EUR 4.200.000';
const THREAD_PATH = /\/threads\/[0-9a-f-]{36}$/;

// The new-chat page used to wait for the file to be processed and gave up
// after three minutes, leaving the thread behind (AYC-1801).
test('opens a new chat while its file is still processing and answers once the file is ready', async ({
  api,
  page,
}) => {
  test.setTimeout(90_000);
  await permitEmbeddingModel(api);
  let holdProcessing = true;
  await page.route(
    (url) => THREAD_PATH.test(url.pathname),
    async (route) => {
      if (!holdProcessing || route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      const response = await route.fetch();
      const thread = (await response.json()) as GetThreadResponseDto;
      await route.fulfill({
        response,
        json: {
          ...thread,
          sources: thread.sources.map((source) => ({
            ...source,
            status: 'processing',
          })),
        },
      });
    },
  );
  let runRequests = 0;
  page.on('request', (request) => {
    if (request.url().endsWith('/runs/send-message')) runRequests += 1;
  });
  await page.clock.install();
  await page.goto('/chat');
  await attachPdf(page, 'haushalt-2026.pdf');

  await sendMessage(page, 'E2E cite first source');

  await expect(page).toHaveURL(/\/chats\/[0-9a-f-]+/);
  const source = page.getByTestId('attachment-progress');
  await expect(source).toBeVisible();
  await expect(page.getByTestId('user-message')).toHaveCount(1);

  await page.clock.fastForward('04:00');

  await expect(source).toBeVisible();
  await expect(page.getByTestId('user-message')).toHaveCount(1);
  await expect(page.getByTestId('assistant-message')).toHaveCount(0);
  expect(runRequests).toBe(0);

  holdProcessing = false;

  await expect(page.getByTestId('chat-attachment')).toHaveAttribute('data-stage', 'ready', {
    timeout: 30_000,
  });
  const citation = page.getByTestId('source-citation').last();
  await expect(citation).toBeVisible();
  await citation.click();
  await expect(page.getByTestId('source-citation-excerpt')).toContainText(
    BUDGET,
  );
  await expect(page.getByTestId('user-message')).toHaveCount(1);
  expect(runRequests).toBe(1);
  const threadId = /\/chats\/([0-9a-f-]+)/.exec(page.url())?.[1] ?? '';
  const { messages } = await getThread(api, threadId);
  expect(messages.filter((message) => message.role === 'user')).toHaveLength(
    1,
  );
});

async function permitEmbeddingModel(api: APIRequestContext): Promise<void> {
  const models = await generatedApi.modelsControllerGetAvailableEmbeddingModels(
    { api },
  );
  const model = models[0];
  if (!model) throw new Error('No embedding model available');
  if (model.permittedModelId) return;
  await generatedApi.modelsControllerCreatePermittedModel(
    { modelId: model.modelId },
    { api },
  );
}

async function attachPdf(page: Page, name: string): Promise<void> {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
  await page.getByRole('menuitem').first().click();
  await (
    await chooser
  ).setFiles({
    name,
    mimeType: 'application/pdf',
    buffer: createOcrRejectedPdf(BUDGET),
  });
  await expect(page.getByRole('menu')).toBeHidden();
}
