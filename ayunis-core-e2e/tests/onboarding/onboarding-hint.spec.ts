import type { Page } from '@playwright/test';
import type {
  GetThreadResponseDto,
  TextMessageContentResponseDto,
} from '../../src/clients/generated/ayunisCoreAPI.schemas';
import { generatedApi } from '../../src/clients/api/generated-api';
import {
  REMEMBER_PROMPT,
  defaultModel,
  readPersonalMemory,
} from '../../src/clients/api/memory.client';
import { setMemoryAccess } from '../../src/clients/api/models.client';
import { getOnboardingStage } from '../../src/clients/api/onboarding.client';
import { createPersonalSkill } from '../../src/clients/api/skills.client';
import { getThread } from '../../src/clients/api/threads.client';
import { createMemberSession } from '../../src/factories/user.factory';
import { expect, test } from '../../src/fixtures/test';
import { sendMessage } from '../../src/flows/chat.flow';

const OPENING_MESSAGES = ['Lerne mich kennen', 'Get to know me'];

function firstText({ messages }: GetThreadResponseDto): string | undefined {
  const content = messages[0]?.content.find(
    (part): part is TextMessageContentResponseDto => part.type === 'text',
  );
  return content?.text;
}

/** Opens the new-chat page from the sidebar once its stage has loaded. */
async function openNewChat(page: Page): Promise<void> {
  const stageLoaded = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/onboarding/stage',
  );
  await page.getByTestId('sidebar-navigation-new-chat').click();
  await stageLoaded;
  await expect(page).toHaveURL(/\/chat$/);
}

async function openedThreadId(page: Page): Promise<string> {
  await expect(page).toHaveURL(/\/chats\/[0-9a-f-]+/);
  await expect(page.getByTestId('assistant-message').first()).toBeVisible();
  const threadId = /\/chats\/([0-9a-f-]+)/.exec(page.url())?.[1];
  if (!threadId) throw new Error(`No thread id in URL ${page.url()}`);
  return threadId;
}

test('the new-chat hint walks a new user from a profile chat to their first skill and is gone once they own one', async ({
  api,
  mail,
  browser,
}) => {
  test.setTimeout(120_000);
  const model = await defaultModel(api);
  const { member, api: memberApi } = await createMemberSession(
    api,
    mail,
    `onboarding-hint-${Date.now()}`,
  );
  const context = await browser.newContext({
    storageState: await memberApi.storageState(),
  });
  const page = await context.newPage();
  const hint = page.getByTestId('new-chat-onboarding-hint');
  try {
    await setMemoryAccess(api, model.id, true);
    expect(await getOnboardingStage(memberApi)).toEqual({
      stage: 'profile',
      modelId: model.id,
    });

    await page.goto('/chat');
    await expect(hint).toHaveAttribute('data-stage', 'profile');
    await hint.click();
    const profileThreadId = await openedThreadId(page);
    await expect(page.getByTestId('user-message')).toHaveCount(1);
    const profileThread = await getThread(memberApi, profileThreadId);
    expect(profileThread).toMatchObject({
      origin: { kind: 'onboarding', stage: 'profile' },
      isAnonymous: false,
      permittedModelId: model.id,
    });
    expect(OPENING_MESSAGES).toContain(firstText(profileThread));

    const role = `Sachbearbeiterin im Bauamt ${Date.now()}`;
    await sendMessage(page, `${REMEMBER_PROMPT}${role}`);
    await expect.poll(() => readPersonalMemory(memberApi)).toBe(role);

    await openNewChat(page);
    await expect(hint).toHaveAttribute('data-stage', 'first_skill');
    await hint.click();
    const skillThreadId = await openedThreadId(page);
    expect(await getThread(memberApi, skillThreadId)).toMatchObject({
      origin: { kind: 'onboarding', stage: 'first_skill' },
    });

    await createPersonalSkill(memberApi, `Bürgeranfragen ${Date.now()}`);
    await openNewChat(page);
    await expect(page.getByTestId('input')).toBeVisible();
    await expect(hint).toHaveCount(0);
  } finally {
    await setMemoryAccess(api, model.id, false);
    await context.close();
    await generatedApi.userControllerDeleteUser(member.id, { api });
    await memberApi.dispose();
  }
});
