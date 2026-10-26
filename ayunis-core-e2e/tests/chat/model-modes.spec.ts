import { login } from '../../src/clients/api/auth.client';
import {
  getModelModeEntries,
  replaceModelModeEntries,
} from '../../src/clients/api/model-modes.client';
import {
  archiveLanguageCatalogModel,
  createLanguageCatalogModel,
  permitLanguageModel,
  removePermittedModel,
} from '../../src/clients/api/models.client';
import { test, expect } from '../../src/fixtures/test';
import { sendMessage } from '../../src/flows/chat.flow';

test('a chat started in Auto binds the first listed model and attributes it', async ({
  page,
  api,
  publicApi,
}) => {
  test.slow();
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
  try {
    await replaceModelModeEntries(publicApi, 'auto', [
      { modelId: catalogModel.id, enabled: true },
      ...previousAutoEntries,
    ]);

    await page.goto('/chat');
    const selector = page.getByTestId('chat-model-selector');
    await selector.click();
    await page.getByTestId('chat-model-selector-mode-auto').click();
    await expect(page.getByTestId('chat-model-selector-mode-auto')).toBeHidden();

    await sendMessage(page, 'Wer antwortet im Auto-Modus?');
    const answer = page.getByTestId('assistant-message').last();
    await expect(answer).toContainText(`openai::${name}`);
    await expect(page).toHaveURL(/\/chats\/[0-9a-f-]+/);

    await expect(
      page.getByTestId('assistant-model-attribution').last(),
    ).toContainText(displayName.replace(/ \(.*\)$/, ''));

    // An existing chat shows the bound model, not the mode it started with.
    await page.reload();
    await expect(selector).toContainText(displayName);
  } finally {
    await replaceModelModeEntries(publicApi, 'auto', previousAutoEntries);
    await removePermittedModel(api, permittedModel.id);
    await archiveLanguageCatalogModel(publicApi, catalogModel);
  }
});
