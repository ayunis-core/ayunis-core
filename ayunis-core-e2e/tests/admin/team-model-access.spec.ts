import {
  createEmptyThread,
  sendThreadMessage,
} from '../../src/clients/api/threads.client';
import {
  getEffectiveLanguageModels,
  getTeamImageGrants,
  getTeamLanguageGrants,
} from '../../src/clients/api/models.client';
import { sendMessage } from '../../src/flows/chat.flow';
import { createTeamModelAccessFixture } from '../../src/factories/team-model-access.factory';
import { test, expect } from '../../src/fixtures/test';

test('team model access follows the explicit override allowlist', async ({
  page,
  api,
  mail,
  browser,
}) => {
  test.setTimeout(90_000);
  const fixture = await createTeamModelAccessFixture(
    api,
    mail,
    `team-model-${Date.now()}`,
  );
  const memberContext = await browser.newContext({
    storageState: fixture.member.storageState,
  });
  const nonMemberContext = await browser.newContext({
    storageState: fixture.nonMember.storageState,
  });
  const memberPage = await memberContext.newPage();

  const effectiveModelIds = async (
    principalApi: typeof fixture.member.api,
  ): Promise<string[]> =>
    (await getEffectiveLanguageModels(principalApi))
      .map((model) => model.modelId)
      .sort();

  try {
    await expect
      .poll(() => effectiveModelIds(fixture.member.api))
      .toEqual([fixture.orgModel.modelId]);
    await expect
      .poll(() => effectiveModelIds(fixture.nonMember.api))
      .toEqual([fixture.orgModel.modelId]);

    const existingThread = await createEmptyThread(
      fixture.member.api,
      fixture.orgModel.id,
    );

    await page.goto(`/admin-settings/teams/${fixture.team.id}`);
    await page.getByTestId('team-models-tab').click();
    await page.getByTestId('team-model-override-toggle').click();

    const orgToggle = page.getByTestId(
      `team-model-${fixture.orgModel.modelId}-toggle`,
    );
    const teamOnlyToggle = page.getByTestId(
      `team-model-${fixture.teamOnlyModel.modelId}-toggle`,
    );
    await expect(orgToggle).toHaveAttribute('data-state', 'unchecked');
    await expect(teamOnlyToggle).toHaveAttribute('data-state', 'unchecked');
    await expect
      .poll(() => effectiveModelIds(fixture.member.api))
      .toEqual([]);
    await expect
      .poll(() => effectiveModelIds(fixture.nonMember.api))
      .toEqual([fixture.orgModel.modelId]);

    await memberPage.goto('/chat');
    await expect(memberPage.getByTestId('new-chat-no-model')).toBeVisible();

    const deniedRun = await sendThreadMessage(
      fixture.member.api,
      existingThread.id,
      'Prüfe den bestehenden Zugriff',
    );
    expect(await deniedRun.text()).toContain('RUN_NO_MODEL_FOUND');

    await teamOnlyToggle.click();
    await expect
      .poll(() => effectiveModelIds(fixture.member.api))
      .toEqual([fixture.teamOnlyModel.modelId]);
    await expect
      .poll(async () =>
        (await getTeamLanguageGrants(api, fixture.team.id)).map(
          (grant) => grant.modelId,
        ),
      )
      .toEqual([fixture.teamOnlyModel.modelId]);

    await memberPage.goto('/chat');
    await memberPage.getByTestId('chat-model-selector').click();
    await expect(memberPage.getByRole('option')).toHaveCount(1);
    await memberPage.getByRole('option').click();
    await sendMessage(memberPage, 'Nutze das Teammodell');
    await expect(memberPage.getByTestId('assistant-message').last()).toContainText(
      `${fixture.teamOnlyModel.provider}::${fixture.teamOnlyModel.name}`,
    );

    await orgToggle.click();
    await expect
      .poll(() => effectiveModelIds(fixture.member.api))
      .toEqual(
        [fixture.orgModel.modelId, fixture.teamOnlyModel.modelId].sort(),
      );
    const restoredRun = await sendThreadMessage(
      fixture.member.api,
      existingThread.id,
      'Prüfe den wiederhergestellten Zugriff',
    );
    expect(await restoredRun.text()).toContain(
      `${fixture.orgModel.provider}::${fixture.orgModel.name}`,
    );

    const imageToggle = page.getByTestId(
      `team-model-${fixture.imageModel.modelId}-toggle`,
    );
    await imageToggle.click();
    await expect(imageToggle).toHaveAttribute('data-state', 'checked');
    await expect
      .poll(async () =>
        (await getTeamImageGrants(api, fixture.team.id)).map(
          (grant) => grant.modelId,
        ),
      )
      .toEqual([fixture.imageModel.modelId]);
    await imageToggle.click();
    await expect.poll(() => getTeamImageGrants(api, fixture.team.id)).toEqual([]);

    await page.getByTestId('team-model-override-toggle').click();
    await expect
      .poll(() => effectiveModelIds(fixture.member.api))
      .toEqual([fixture.orgModel.modelId]);
    await expect
      .poll(() => getTeamLanguageGrants(api, fixture.team.id))
      .toHaveLength(2);

    await page.getByTestId('team-model-override-toggle').click();
    await expect
      .poll(() => effectiveModelIds(fixture.member.api))
      .toEqual(
        [fixture.orgModel.modelId, fixture.teamOnlyModel.modelId].sort(),
      );
    await expect
      .poll(() => effectiveModelIds(fixture.nonMember.api))
      .toEqual([fixture.orgModel.modelId]);
  } finally {
    await memberContext.close();
    await nonMemberContext.close();
    await fixture.cleanup();
  }
});
