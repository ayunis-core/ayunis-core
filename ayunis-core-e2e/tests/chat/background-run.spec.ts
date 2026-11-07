import { randomUUID } from 'node:crypto';
import { login } from '../../src/clients/api/auth.client';
import { skipChatPersonalization } from '../../src/clients/api/chat-settings.client';
import { getEffectiveDefaultModel } from '../../src/clients/api/models.client';
import { dismissWelcomeVideo } from '../../src/clients/api/onboarding.client';
import {
  SLOW_TOOL_PREPARATION_PROMPT,
  listActiveRuns,
  requestRunAttach,
  requestRunCancel,
  sendMessageAndLeave,
} from '../../src/clients/api/runs.client';
import { createEmptyThread } from '../../src/clients/api/threads.client';
import { createApiContext } from '../../src/factories/api-context.factory';
import { createUser } from '../../src/factories/user.factory';
import { expect, test } from '../../src/fixtures/test';
import { sendMessage, sidebarThreadItem } from '../../src/flows/chat.flow';

test('a chat keeps working after a reload and shows it in the sidebar', async ({
  page,
}) => {
  await page.goto('/chat');
  await sendMessage(page, SLOW_TOOL_PREPARATION_PROMPT);
  await expect(page).toHaveURL(/\/chats\/[0-9a-f-]+/);
  const threadId = /\/chats\/([0-9a-f-]+)/.exec(page.url())?.[1] ?? '';
  const step = page.getByTestId('agent-run-tool-step');
  await expect(step).toHaveAttribute('data-status', 'in_progress');
  const sidebarItem = sidebarThreadItem(page, threadId);
  await expect(
    sidebarItem.getByTestId('chat-running-indicator'),
  ).toBeVisible();

  await page.reload();

  await expect(step).toHaveAttribute('data-tool-name', 'create_document');
  await expect(step).toHaveAttribute('data-status', 'in_progress');
  await expect(
    sidebarItem.getByTestId('chat-running-indicator'),
  ).toBeVisible();

  await page.getByTestId('cancel').click();
  await expect(step).toHaveCount(0);
  await expect(sidebarItem.getByTestId('chat-running-indicator')).toHaveCount(
    0,
  );
});

test('another member of the organization can neither see, follow nor stop a user’s run', async ({
  api,
  mail,
}) => {
  const defaultModel = await getEffectiveDefaultModel(api);
  const thread = await createEmptyThread(api, defaultModel?.id ?? '');
  const member = await createUser(api, mail, `run-scope-${randomUUID()}`);
  const memberApi = await createApiContext({ cookies: [], origins: [] });
  await login(memberApi, member.email, member.password);
  await dismissWelcomeVideo(memberApi);
  await skipChatPersonalization(memberApi);

  await sendMessageAndLeave(api, thread.id);
  await expect
    .poll(async () => (await listActiveRuns(api)).map((run) => run.threadId))
    .toContain(thread.id);

  expect(
    (await listActiveRuns(memberApi)).map((run) => run.threadId),
  ).not.toContain(thread.id);
  expect((await requestRunAttach(memberApi, thread.id)).status()).toBe(204);
  expect((await requestRunCancel(memberApi, thread.id)).status()).toBe(204);
  expect(await listActiveRuns(api)).toContainEqual({
    threadId: thread.id,
    cancellable: true,
  });

  expect((await requestRunCancel(api, thread.id)).status()).toBe(204);
  await expect
    .poll(async () => (await listActiveRuns(api)).map((run) => run.threadId))
    .not.toContain(thread.id);
  await memberApi.dispose();
});
