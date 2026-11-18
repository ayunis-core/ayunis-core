import { generatedApi } from '../../src/clients/api/generated-api';
import {
  clearMemory,
  createChat,
  defaultModel,
  readPersonalMemory,
  reportMemory,
} from '../../src/clients/api/memory.client';
import { setMemoryAccess } from '../../src/clients/api/models.client';
import { expect, test } from '../../src/fixtures/test';

test('applies an entry edited in settings to the next chat run', async ({
  api,
  page,
}) => {
  test.setTimeout(60_000);
  const stored = `Stored ${Date.now()}`;
  const edited = `Edited ${Date.now()}`;
  const model = await defaultModel(api);
  await setMemoryAccess(api, model.id, true);
  await generatedApi.memoryControllerUpsert(
    'personal',
    { content: stored },
    { api },
  );

  try {
    await page.goto('/settings/general');
    await page.getByTestId('settings-nav-memory').click();
    await expect(page.getByTestId('memory-settings-page')).toBeVisible();

    const card = page.getByTestId('memory-entry-personal');
    await expect(card.getByTestId('memory-entry-content')).toHaveText(stored);

    await card.getByTestId('memory-entry-edit').click();
    await card.getByTestId('memory-entry-input').fill(edited);
    await card.getByTestId('memory-entry-save').click();

    await expect(card.getByTestId('memory-entry-content')).toHaveText(edited);
    expect(await reportMemory(api, await createChat(api))).toMatchObject({
      personal: edited,
    });
  } finally {
    await clearMemory(api);
    await setMemoryAccess(api, model.id, false);
  }
});

test('keeps a reserved key listed after it is cleared', async ({
  api,
  page,
}) => {
  await clearMemory(api);
  await page.goto('/settings/memory');
  await expect(page.getByTestId('memory-entry-personal')).toBeVisible();
  await expect(page.getByTestId('memory-entry-preferences')).toBeVisible();

  const stored = `Stored ${Date.now()}`;
  await generatedApi.memoryControllerUpsert(
    'personal',
    { content: stored },
    { api },
  );
  try {
    await page.reload();
    const card = page.getByTestId('memory-entry-personal');
    await card.getByTestId('memory-entry-edit').click();
    await card.getByTestId('memory-entry-input').fill('');
    await card.getByTestId('memory-entry-save').click();

    await expect(card.getByTestId('memory-entry-content')).toBeVisible();
    await expect(card.getByTestId('memory-entry-content')).not.toContainText(
      stored,
    );
    expect(await readPersonalMemory(api)).toBe('');
  } finally {
    await clearMemory(api);
  }
});

test('shows and edits the description of an open key', async ({
  page,
  api,
}) => {
  const key = 'report_template';
  const edited = `When drafting council reports ${Date.now()}`;
  await generatedApi.memoryControllerUpsert(
    key,
    {
      content: 'Intro, three findings, next steps',
      description: 'How the user wants monthly council reports structured',
    },
    { api },
  );

  try {
    await page.goto('/settings/memory');
    const card = page.getByTestId(`memory-entry-${key}`);
    await expect(card.getByTestId('memory-entry-description')).toHaveText(
      'How the user wants monthly council reports structured',
    );

    await card.getByTestId('memory-entry-edit').click();
    await card.getByTestId('memory-entry-description-input').fill(edited);
    await card.getByTestId('memory-entry-save').click();

    await expect(card.getByTestId('memory-entry-description')).toHaveText(
      edited,
    );
    const memory = await generatedApi.memoryControllerFindAll({ api });
    expect(memory.entries.find((entry) => entry.key === key)?.description).toBe(
      edited,
    );
  } finally {
    await clearMemory(api);
  }
});
