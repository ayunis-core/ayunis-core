import { generatedApi } from '../../src/clients/api/generated-api';
import { getThread } from '../../src/clients/api/threads.client';
import { createMemberSession } from '../../src/factories/user.factory';
import { expect, test } from '../../src/fixtures/test';

test('asking how knowledge bases work on the empty page starts a chat that the model guides through the feature', async ({
  api,
  mail,
  browser,
}) => {
  const { member, api: memberApi } = await createMemberSession(
    api,
    mail,
    `kb-guide-${Date.now()}`,
  );
  const context = await browser.newContext({
    storageState: await memberApi.storageState(),
  });
  const page = await context.newPage();
  try {
    await page.goto('/knowledge-bases');
    const emptyState = page.getByTestId('knowledge-bases-empty-state');
    await expect(emptyState).toBeVisible();

    await emptyState.getByTestId('input').fill('How does this work?');
    await emptyState.getByTestId('send').click();

    await expect(page).toHaveURL(/\/chats\/[0-9a-f-]+/);
    await expect(page.getByTestId('assistant-message').first()).toBeVisible();
    const [, threadId] = /\/chats\/([0-9a-f-]+)/.exec(page.url()) ?? [];
    expect(threadId).toBeDefined();
    expect(await getThread(memberApi, threadId)).toMatchObject({
      origin: { kind: 'feature_guide', feature: 'knowledge_bases' },
    });
  } finally {
    await context.close();
    await generatedApi.userControllerDeleteUser(member.id, { api });
    await memberApi.dispose();
  }
});
