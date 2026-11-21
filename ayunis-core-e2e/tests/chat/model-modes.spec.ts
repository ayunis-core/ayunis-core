import { ok } from 'node:assert/strict';
import type { Page } from '@playwright/test';
import { generatedApi } from '../../src/clients/api/generated-api';
import { login } from '../../src/clients/api/auth.client';
import {
  getModelModeEntries,
  replaceModelModeEntries,
} from '../../src/clients/api/model-modes.client';
import {
  archiveLanguageCatalogModel,
  createLanguageCatalogModel,
  getEffectiveDefaultModel,
  permitLanguageModel,
  removePermittedModel,
} from '../../src/clients/api/models.client';
import { getThread } from '../../src/clients/api/threads.client';
import { test, expect } from '../../src/fixtures/test';
import { sendMessage } from '../../src/flows/chat.flow';

test('Auto replies retain attribution after model replacement', async ({
  page,
  api,
  publicApi,
}) => {
  test.slow();
  const replacement = await getEffectiveDefaultModel(api);
  ok(replacement, 'Worker organization has no default model');
  const uniqueKey = Date.now().toString();
  const displayName = `E2E Auto Mode ${uniqueKey}`;
  const name = `e2e-auto-mode-${uniqueKey}`;

  await login(publicApi, 'admin@demo.local', 'admin');
  const catalogModel = await createLanguageCatalogModel(publicApi, {
    name,
    displayName,
  });
  // The lists are global; only this worker's org permits the new model, so
  // prepending it changes the Auto resolution for this org alone.
  const previousAutoEntries = await getModelModeEntries(publicApi, 'auto');
  const permittedModel = await permitLanguageModel(api, catalogModel.id);
  const selector = page.getByTestId('chat-model-selector');
  try {
    let threadId: string;
    try {
      await replaceModelModeEntries(publicApi, 'auto', [
        { modelId: catalogModel.id, enabled: true },
        ...previousAutoEntries,
      ]);

      await generatedApi.modelModeDefaultsControllerSetUserModeDefault(
        { mode: 'auto' },
        { api },
      );
      await page.goto('/chat');
      await expect(selector).toContainText('Auto');

      const firstRun = waitForReply(page);
      await sendMessage(page, 'Wer antwortet im Auto-Modus?');
      await expect(page.getByTestId('assistant-message').last()).toContainText(
        `openai::${name}`,
      );
      await expect(page).toHaveURL(/\/chats\/[0-9a-f-]+/);
      await expect(selector).toContainText('Auto');
      await expectReplyModel(page, 0, displayName);
      await expect((await firstRun).text()).resolves.toContain(
        `"answeringModelName":${JSON.stringify(displayName)}`,
      );
      threadId = new URL(page.url()).pathname.split('/').at(-1)!;
    } finally {
      await removePermittedModel(api, permittedModel.id);
    }
    await expect
      .poll(async () => (await getThread(api, threadId)).permittedModelId)
      .toBe(replacement.id);

    await page.reload();
    await expect(selector).toContainText('Auto');
    await expectReplyModel(page, 0, displayName);

    const replacementRun = waitForReply(page);
    await sendMessage(page, 'Wer antwortet nach dem Modellwechsel?');
    await expect(page.getByTestId('assistant-message').last()).toContainText(
      `${replacement.provider}::${replacement.name}`,
    );
    await expectReplyModel(page, 1, replacement.displayName);
    await expect((await replacementRun).finished()).resolves.toBeNull();

    await page.reload();
    await expect(selector).toContainText('Auto');
    await expectReplyModel(page, 0, displayName);
    await expectReplyModel(page, 1, replacement.displayName);
  } finally {
    await generatedApi.modelModeDefaultsControllerSetUserModeDefault(
      { mode: null },
      { api },
    );
    await replaceModelModeEntries(publicApi, 'auto', previousAutoEntries);
    await archiveLanguageCatalogModel(publicApi, catalogModel);
  }
});

function waitForReply(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/runs/send-message') &&
      response.request().method() === 'POST',
  );
}

async function expectReplyModel(page: Page, index: number, modelName: string) {
  await page
    .getByTestId('assistant-message')
    .nth(index)
    .locator('[data-copyable]')
    .last()
    .hover();
  await expect(
    page.getByRole('tooltip', { name: modelName, exact: true }),
  ).toBeVisible();
}
