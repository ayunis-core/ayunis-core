import type { APIRequestContext, Page } from '@playwright/test';
import {
  stubOfficeHost,
  type OfficeStubReadItem,
} from '../../src/clients/office-host-stub';
import { generatedApi } from '../../src/clients/api/generated-api';
import type { GetThreadResponseDto } from '../../src/clients/generated/ayunisCoreAPI.schemas';
import { createMemberSession } from '../../src/factories/user.factory';
import { expect, test } from '../../src/fixtures/outlook';
import { sendMessage } from '../../src/flows/chat.flow';
import {
  openSignedInPane,
  selectOutlookItem,
} from '../../src/flows/outlook.flow';

// The pane's new chat starts like Web's (AYC-2168): with a file, the chat
// opens once the file is uploaded and its first message waits there while the
// file processes.
const THREAD_PATH = /\/threads\/[0-9a-f-]{36}$/;

test.use({ storageState: { cookies: [], origins: [] } });

function mail(key: string, name: string): OfficeStubReadItem {
  return {
    itemId: `e2e-new-chat-${name}-${key}`,
    internetMessageId: `<e2e-new-chat-${name}-${key}@e2e.local>`,
    subject: `E2E new chat mail ${name} ${key}`,
    body: `Body of mail ${name}`,
    from: { displayName: 'Alice', emailAddress: 'alice@e2e.local' },
  };
}

async function permitEmbeddingModel(api: APIRequestContext): Promise<void> {
  const [embedding] =
    await generatedApi.modelsControllerGetAvailableEmbeddingModels({ api });
  if (!embedding) throw new Error('No embedding model available');
  if (embedding.permittedModelId) return;
  await generatedApi.modelsControllerCreatePermittedModel(
    { modelId: embedding.modelId },
    { api },
  );
}

/** Lists every source of a chat as processing until released. */
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
      if (!response.ok()) {
        await route.fulfill({ response });
        return;
      }
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

async function attachNotes(page: Page): Promise<void> {
  const picker = page.getByTestId('chat-file-upload-input');
  await expect(picker).toBeEnabled();
  await picker.setInputFiles({
    name: 'budget-notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Budget notes for the review'),
  });
  await expect(page.getByTestId('chat-source')).toContainText(
    'budget-notes.txt',
  );
}

test('opens a new chat with a file right after the upload, keeps it with its email and answers once the file is ready', async ({
  page,
  api,
  mail: mailbox,
}) => {
  test.setTimeout(120_000);
  await permitEmbeddingModel(api);
  const key = `${Date.now()}`;
  const a = mail(key, 'A');
  const b = mail(key, 'B');
  await stubOfficeHost(page, { readItem: a });
  // A member of their own, so this chat stays out of other pane tests' history.
  const member = await createMemberSession(api, mailbox, `pane-new-chat-${key}`);
  try {
    await openSignedInPane(page, member.api);
  } finally {
    await member.api.dispose();
  }
  const release = await holdFileProcessing(page);
  const runs: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/runs/send-message')) {
      runs.push(request.postData() ?? '');
    }
  });

  await attachNotes(page);
  await sendMessage(page, `E2E review the notes ${key}`);

  await expect(page.getByTestId('outlook-conversation')).toBeVisible();
  await expect(page.getByTestId('chat-source')).toHaveAttribute(
    'data-source-status',
    'processing',
  );
  await expect(page.getByTestId('user-message')).toHaveText([
    `E2E review the notes ${key}`,
  ]);
  expect(runs).toHaveLength(0);

  await selectOutlookItem(page, b);
  await expect(page.getByTestId('outlook-new-chat')).toBeVisible();
  await sendMessage(page, `E2E a separate chat on B ${key}`);
  await expect(page.getByTestId('assistant-message').last()).toBeVisible();
  expect(runs).toHaveLength(1);

  await selectOutlookItem(page, a);
  await expect(page.getByTestId('user-message')).toHaveText([
    `E2E review the notes ${key}`,
  ]);
  expect(runs).toHaveLength(1);

  release();

  await expect(page.getByTestId('assistant-message')).toHaveCount(1, {
    timeout: 60_000,
  });
  expect(runs).toHaveLength(2);
  expect(runs[1]).toContain(`E2E review the notes ${key}`);

  await selectOutlookItem(page, b);
  await expect(page.getByTestId('user-message')).toHaveText([
    `E2E a separate chat on B ${key}`,
  ]);
});
