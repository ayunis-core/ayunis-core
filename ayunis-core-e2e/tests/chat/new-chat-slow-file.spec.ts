import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from '../../src/fixtures/test';
import { generatedApi } from '../../src/clients/api/generated-api';
import { getThread } from '../../src/clients/api/threads.client';
import type { GetThreadResponseDto } from '../../src/clients/generated/ayunisCoreAPI.schemas';
import { createOcrRejectedPdf } from '../../src/factories/pdf.factory';
import { sendMessage, startThread } from '../../src/flows/chat.flow';

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
  const source = page.getByTestId('chat-source');
  await expect(source).toHaveAttribute('data-source-status', 'processing');
  await expect(page.getByTestId('user-message')).toHaveCount(1);

  await page.clock.fastForward('04:00');

  await expect(source).toHaveAttribute('data-source-status', 'processing');
  await expect(page.getByTestId('user-message')).toHaveCount(1);
  await expect(page.getByTestId('assistant-message')).toHaveCount(0);
  expect(runRequests).toBe(0);

  holdProcessing = false;

  await expect(source).toHaveAttribute('data-source-status', 'ready', {
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

test('sends in an ongoing chat while its file is still processing and shows the progress until the file is ready', async ({
  api,
  page,
}) => {
  test.setTimeout(120_000);
  await permitEmbeddingModel(api);
  const threadId = await startThread(page, 'Prepare to review a budget.');
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
  await attachPdf(page, 'haushalt-2026.pdf');
  const source = page.getByTestId('chat-source');
  await expect(source).toHaveAttribute('data-source-status', 'processing');

  await expect(page.getByTestId('send')).toBeDisabled();
  await page.getByTestId('input').fill('Review this budget.');
  await expect(page.getByTestId('send')).toBeEnabled();
  await page.getByTestId('send').click();

  await expect(page.getByTestId('pending-user-message')).toContainText(
    'Review this budget.',
  );
  await expect(page.getByTestId('attachment-progress')).toContainText(
    'haushalt-2026.pdf',
  );
  const waiting = await getThread(api, threadId);
  expect(
    waiting.messages.filter((message) => message.role === 'user'),
  ).toHaveLength(1);

  holdProcessing = false;

  await expect(page.getByTestId('attachment-progress')).toHaveCount(0, {
    timeout: 30_000,
  });
  await expect(page.getByTestId('pending-user-message')).toBeHidden();
  await expect(page.getByTestId('user-message')).toHaveCount(2);
  await expect(page.getByTestId('assistant-message')).toHaveCount(2, {
    timeout: 60_000,
  });
});

test('returns a waiting message to the input after a reload, without sending it', async ({
  api,
  page,
}) => {
  test.setTimeout(120_000);
  await permitEmbeddingModel(api);
  const threadId = await startThread(page, 'Prepare to review a budget.');
  await page.route(
    (url) => THREAD_PATH.test(url.pathname),
    async (route) => {
      if (route.request().method() !== 'GET') {
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
  await attachPdf(page, 'haushalt-2026.pdf');
  await expect(page.getByTestId('chat-source')).toHaveAttribute(
    'data-source-status',
    'processing',
  );
  await page.getByTestId('input').fill('Review the budget after the reload.');
  await page.getByTestId('send').click();
  await expect(page.getByTestId('pending-user-message')).toBeVisible();

  await page.reload();

  await expect(page.getByTestId('input')).toHaveValue(
    'Review the budget after the reload.',
  );
  await expect(page.getByTestId('pending-user-message')).toBeHidden();
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
