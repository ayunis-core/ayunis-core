import type { APIRequestContext, Page } from '@playwright/test';
import { stubOfficeHost } from '../../src/clients/office-host-stub';
import { generatedApi } from '../../src/clients/api/generated-api';
import type { GetThreadResponseDto } from '../../src/clients/generated/ayunisCoreAPI.schemas';
import { createOcrRejectedPdf } from '../../src/factories/pdf.factory';
import { createMemberSession } from '../../src/factories/user.factory';
import { expect, test } from '../../src/fixtures/outlook';
import { sendMessage } from '../../src/flows/chat.flow';
import { openSignedInPane } from '../../src/flows/outlook.flow';

// The pane renders the package conversation, which owns citations and the
// wait for a chat's files (AYC-2167).
const BUDGET = 'Haushalt 2026: Gesamtvolumen EUR 4.200.000';
const THREAD_PATH = /\/threads\/[0-9a-f-]{36}$/;

test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async ({ page }) => {
  await stubOfficeHost(page, {
    readItem: {
      itemId: 'conversation-email',
      internetMessageId: '<conversation-email@e2e.local>',
      subject: 'E2E conversation budget',
      body: 'The budget is attached.',
      from: { displayName: 'Alice', emailAddress: 'alice@e2e.local' },
    },
  });
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

/** Lists every source of the chat as processing until released. */
async function holdFileProcessing(page: Page): Promise<() => void> {
  let holding = true;
  await page.route(
    (url) => THREAD_PATH.test(url.pathname),
    async (route) => {
      if (!holding || route.request().method() !== 'GET') {
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
  return () => {
    holding = false;
  };
}

test('sends in an Outlook chat while its file processes and opens the cited source', async ({
  page,
  api,
  mail,
}) => {
  test.setTimeout(120_000);
  await permitEmbeddingModel(api);
  // A member of their own, so this chat stays out of other pane tests' history.
  const member = await createMemberSession(
    api,
    mail,
    `pane-conversation-${Date.now()}`,
  );
  try {
    await openSignedInPane(page, member.api);
  } finally {
    await member.api.dispose();
  }
  await sendMessage(page, 'Prepare to review a budget.');
  await expect(page.getByTestId('assistant-message').last()).toBeVisible();
  const release = await holdFileProcessing(page);
  let runRequests = 0;
  page.on('request', (request) => {
    if (request.url().endsWith('/runs/send-message')) runRequests += 1;
  });

  await page.getByTestId('chat-file-upload-input').setInputFiles({
    name: 'haushalt-2026.pdf',
    mimeType: 'application/pdf',
    buffer: createOcrRejectedPdf(BUDGET),
  });
  const source = page.getByTestId('chat-source');
  await expect(source).toHaveAttribute('data-source-status', 'processing');
  await page.getByTestId('input').fill('E2E cite first source');
  await expect(page.getByTestId('send')).toBeEnabled();
  await page.getByTestId('send').click();

  await expect(page.getByTestId('input')).toHaveValue('');
  await expect(page.getByTestId('pending-user-message')).toContainText(
    'E2E cite first source',
  );
  await expect(page.getByTestId('attachment-progress')).toContainText(
    'haushalt-2026.pdf',
  );
  expect(runRequests).toBe(0);

  release();

  const citation = page.getByTestId('source-citation').last();
  await expect(citation).toBeVisible({ timeout: 60_000 });
  expect(runRequests).toBe(1);
  await citation.click();
  await expect(page.getByTestId('source-citation-excerpt')).toContainText(
    BUDGET,
  );
  // The pane has no recordings page to open.
  await expect(page.getByTestId('source-citation-open-recording')).toHaveCount(
    0,
  );
});
