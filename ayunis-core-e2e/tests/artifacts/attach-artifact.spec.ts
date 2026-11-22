import type { APIRequestContext, Page } from '@playwright/test';
import { generatedApi } from '../../src/clients/api/generated-api';
import { createChat } from '../../src/clients/api/memory.client';
import { createProjectThread } from '../../src/factories/workspace-context.factory';
import { sendMessage } from '../../src/flows/chat.flow';
import { expect, test } from '../../src/fixtures/test';

function createDocument(
  api: APIRequestContext,
  threadId: string,
  title: string,
) {
  return generatedApi.artifactsControllerCreate(
    { threadId, title, content: `<p>${title}</p>` },
    { api },
  );
}

async function linkedArtifactIds(api: APIRequestContext, threadId: string) {
  const artifacts = await generatedApi.artifactsControllerFindByThread(
    threadId,
    { api },
  );
  return artifacts.map(({ id }) => id);
}

async function searchArtifactPicker(page: Page, term: string) {
  await page.getByTestId('chat-plus-button').click();
  await page.getByTestId('chat-attach-artifact').click();
  await expect(page.getByTestId('artifact-picker')).toBeVisible();
  await page.getByTestId('artifact-picker-search').fill(term);
}

function pickerItem(page: Page, artifactId: string) {
  return page.getByTestId(`artifact-picker-item-${artifactId}`);
}

function chip(page: Page, artifactId: string) {
  return page.getByTestId(`chat-artifact-chip-${artifactId}`);
}

test('attaches artifacts picked in the composer when the message is sent, on the new-chat page once the chat exists and in an open chat, and lists them in the side panel', async ({
  page,
  api,
}) => {
  test.setTimeout(120_000);
  const suffix = `${Date.now()}`;
  const sourceChat = await createChat(api);
  const letter = await createDocument(api, sourceChat, `Brief ${suffix}`);
  const memo = await createDocument(api, sourceChat, `Vermerk ${suffix}`);
  const workspace = await generatedApi.workspacesControllerCreate(
    { name: `Anhänge ${suffix}`, icon: 'building-2' },
    { api },
  );
  const decision = await createDocument(
    api,
    (await createProjectThread(api, workspace.id)).id,
    `Beschluss ${suffix}`,
  );

  await page.goto('/chat');
  await searchArtifactPicker(page, suffix);
  await expect(pickerItem(page, memo.id)).toBeVisible();
  await expect(pickerItem(page, decision.id)).toHaveCount(0);
  await pickerItem(page, memo.id).click();
  await expect(chip(page, memo.id)).toBeVisible();
  await chip(page, memo.id).getByTestId('chat-artifact-chip-remove').click();
  await expect(chip(page, memo.id)).toHaveCount(0);
  await searchArtifactPicker(page, suffix);
  await pickerItem(page, letter.id).click();
  await expect(chip(page, letter.id)).toBeVisible();

  await sendMessage(page, 'Bitte den Brief prüfen');

  await expect(page).toHaveURL(/\/chats\/[0-9a-f-]+/);
  const threadId = /\/chats\/([0-9a-f-]+)/.exec(page.url())?.[1] ?? '';
  await expect.poll(() => linkedArtifactIds(api, threadId)).toEqual([letter.id]);
  await expect(chip(page, letter.id)).toHaveCount(0);
  await expect(page.getByTestId('assistant-message')).toHaveCount(1);
  await expect(page.getByTestId('send')).toBeVisible();

  await searchArtifactPicker(page, suffix);
  await expect(pickerItem(page, memo.id)).toBeVisible();
  await expect(pickerItem(page, letter.id)).toHaveCount(0);
  await pickerItem(page, memo.id).click();
  await expect(chip(page, memo.id)).toBeVisible();
  await expect.poll(() => linkedArtifactIds(api, threadId)).toEqual([letter.id]);

  await sendMessage(page, 'Und den Vermerk');

  await expect
    .poll(() => linkedArtifactIds(api, threadId))
    .toEqual([letter.id, memo.id]);
  await expect(chip(page, memo.id)).toHaveCount(0);
  await page.getByTestId('chat-side-panel-toggle').click();
  await page.getByTestId('chat-side-panel-tab-artifacts').click();
  await expect(page.getByTestId(`artifact-list-item-${letter.id}`)).toBeVisible();
  await expect(page.getByTestId(`artifact-list-item-${memo.id}`)).toBeVisible();
});
