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

test('existing chat stays usable when Auto replaces the default model', async ({
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

    await setOrgModeDefault(api, 'auto');
    await memberPage.goto(`/chats/${existingThread.id}`);
    await expect(memberPage.getByTestId('input')).toBeVisible();
    await sendMessage(memberPage, 'Prüfe den Chat mit Auto als Standard');
    await expect(
      memberPage.getByTestId('assistant-message').last(),
    ).toContainText(`${previousDefault.provider}::${previousDefault.name}`);

    await setOrgDefaultModel(api, previousDefault.id);
    await memberPage.reload();
    await sendMessage(memberPage, 'Prüfe den Chat nach dem Zurückwechseln');
    await expect(
      memberPage.getByTestId('assistant-message').last(),
    ).toContainText(`${previousDefault.provider}::${previousDefault.name}`);
  } finally {
    try {
      await setOrgDefaultModel(api, previousDefault.id);
    } finally {
      try {
        await memberContext.close();
      } finally {
        await fixture.cleanup();
      }
    }
  }
});
