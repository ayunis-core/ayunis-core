import type { APIRequestContext } from '@playwright/test';
import { setOrgModeDefault } from '../../src/clients/api/model-modes.client';
import {
  getEffectiveDefaultModel,
  getEffectiveLanguageModels,
  setOrgDefaultModel,
} from '../../src/clients/api/models.client';
import { createEmptyThread } from '../../src/clients/api/threads.client';
import {
  grantTeamModel,
  setTeamModelOverride,
} from '../../src/clients/api/teams.client';
import { createTeamModelAccessFixture } from '../../src/factories/team-model-access.factory';
import { test, expect } from '../../src/fixtures/test';
import { sendMessage } from '../../src/flows/chat.flow';

async function requireEffectiveDefaultModel(api: APIRequestContext) {
  const model = await getEffectiveDefaultModel(api);
  if (!model) {
    throw new Error('Worker organization has no effective default model');
  }
  return model;
}

function modelPickerLabel(displayName: string) {
  return displayName.replace(/\s+\([^)]*\)\s*$/, '');
}

test('existing chat stays usable when Auto replaces the default model', async ({
  api,
  page,
}) => {
  const previousDefault = await requireEffectiveDefaultModel(api);
  const existingThread = await createEmptyThread(api, previousDefault.id);

  try {
    await page.goto(`/chats/${existingThread.id}`);
    await expect(page.getByTestId('input')).toBeVisible();
    await expect(page.getByTestId('chat-model-selector')).toContainText(
      modelPickerLabel(previousDefault.displayName),
    );

    await setOrgModeDefault(api, 'auto');
    await page.reload();
    await expect(page.getByTestId('input')).toBeVisible();
    await expect(page.getByTestId('chat-model-selector')).toContainText(
      modelPickerLabel(previousDefault.displayName),
    );
    await sendMessage(page, 'Prüfe den Chat mit Auto als Standard');
    await expect(page.getByTestId('assistant-message').last()).toContainText(
      `${previousDefault.provider}::${previousDefault.name}`,
    );
  } finally {
    await setOrgDefaultModel(api, previousDefault.id);
  }
});

test('existing chat displays an equivalent replacement team grant', async ({
  api,
  browser,
  mail,
}) => {
  test.setTimeout(90_000);
  const previousDefault = await requireEffectiveDefaultModel(api);
  const fixture = await createTeamModelAccessFixture(
    api,
    mail,
    `existing-chat-${Date.now()}`,
  );
  const memberContext = await browser.newContext({
    storageState: fixture.member.storageState,
  });
  const memberPage = await memberContext.newPage();

  try {
    const existingThread = await createEmptyThread(
      fixture.member.api,
      previousDefault.id,
    );
    await grantTeamModel(api, fixture.team.id, previousDefault.modelId);
    await setTeamModelOverride(api, fixture.team, true);
    await expect
      .poll(async () =>
        (await getEffectiveLanguageModels(fixture.member.api)).map(
          (model) => model.modelId,
        ),
      )
      .toEqual([previousDefault.modelId]);

    await memberPage.goto(`/chats/${existingThread.id}`);
    await expect(memberPage.getByTestId('input')).toBeVisible();
    await expect(
      memberPage.getByTestId('chat-model-selector'),
    ).toContainText(modelPickerLabel(previousDefault.displayName));
    await sendMessage(memberPage, 'Prüfe den Chat mit Team-Modell');
    await expect(
      memberPage.getByTestId('assistant-message').last(),
    ).toContainText(`${previousDefault.provider}::${previousDefault.name}`);
  } finally {
    try {
      await memberContext.close();
    } finally {
      await fixture.cleanup();
    }
  }
});
