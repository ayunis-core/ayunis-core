import type { Route } from '@playwright/test';
import { getThread } from '../../src/clients/api/threads.client';
import { test, expect } from '../../src/fixtures/test';
import { sendMessage, sidebarThreadItem } from '../../src/flows/chat.flow';

const THREAD_PATH = /\/threads\/[0-9a-f-]{36}$/;

// A new chat's first message used to wait for the settle animation and the
// chat page before it was sent (AYC-1611).
test('sends the first message of a new chat before its chat page opens', async ({
  page,
  api,
  org,
}) => {
  // Holding the chat route's thread fetch keeps the chat page from mounting,
  // so a send that only starts on that page never happens.
  const heldThreadFetches: Route[] = [];
  let releaseThreadFetches = false;
  await page.route(
    (url) => THREAD_PATH.test(url.pathname),
    async (route) => {
      if (releaseThreadFetches || route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      heldThreadFetches.push(route);
    },
  );
  await page.goto('/chat');
  const firstSend = page.waitForRequest(
    (request) =>
      request.method() === 'POST' &&
      request.url().endsWith('/runs/send-message'),
  );

  await sendMessage(page, 'Erste Nachricht im neuen Chat');
  await firstSend;
  releaseThreadFetches = true;
  await Promise.all(heldThreadFetches.map((route) => route.continue()));

  await expect(page).toHaveURL(/\/chats\/[0-9a-f-]+/);
  const modelReply = `${org.defaultModel.provider}::${org.defaultModel.name}`;
  await expect(page.getByTestId('assistant-message')).toHaveCount(1);
  await expect(page.getByTestId('assistant-message')).toContainText(
    modelReply,
  );
  await expect(page.getByTestId('user-message')).toHaveCount(1);
  const threadId = /\/chats\/([0-9a-f-]+)/.exec(page.url())?.[1] ?? '';
  // The mock model answers the title prompt with its own name.
  await expect(sidebarThreadItem(page, threadId)).toContainText(
    `${org.defaultModel.provider}::`,
  );
  const { messages } = await getThread(api, threadId);
  expect(messages.map((message) => message.role)).toEqual([
    'user',
    'assistant',
  ]);
});
