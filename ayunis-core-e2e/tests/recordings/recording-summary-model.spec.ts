import { randomUUID } from 'node:crypto';
import { request } from '@playwright/test';
import { config } from '../../src/config';
import {
  findUnpermittedLanguageCandidate,
  getEffectiveLanguageModels,
  grantTeamLanguageModel,
  permitLanguageModel,
  removePermittedModel,
  setPermittedModelAnonymousOnly,
} from '../../src/clients/api/models.client';
import {
  getRecordingSummaryModelId,
  requestRecordingSummaryModel,
  requestRecordingSummaryModelChange,
  setRecordingSummaryModel,
} from '../../src/clients/api/recording-summary-model.client';
import { createTeam, deleteTeam } from '../../src/clients/api/teams.client';
import { createOrg } from '../../src/factories/org.factory';
import { createMemberSession } from '../../src/factories/user.factory';
import { test, expect } from '../../src/fixtures/test';

// Model options show the display name without its "(Provider)" suffix.
function optionLabel(displayName: string): string {
  return displayName.replace(/\s*\([^()]*\)\s*$/, '');
}

test('an admin selects and clears the summary model, and deleting the selected model falls back to the org default', async ({
  page,
  api,
}) => {
  const [orgModel] = await getEffectiveLanguageModels(api);
  const candidate = await findUnpermittedLanguageCandidate(api);
  try {
    await page.goto('/admin-settings/models');
    const select = page.getByTestId('recording-summary-model-select');
    await select.click();
    // Model names are catalogue data, not translated copy.
    await page
      .getByRole('option', { name: optionLabel(orgModel.displayName) })
      .click();
    await expect.poll(() => getRecordingSummaryModelId(api)).toBe(orgModel.id);
    await page.reload();
    await expect(select).toContainText(optionLabel(orgModel.displayName));

    await select.click();
    await page.getByTestId('recording-summary-model-org-default').click();
    await expect.poll(() => getRecordingSummaryModelId(api)).toBeNull();
    await page.reload();
    await select.click();
    await expect(
      page.getByTestId('recording-summary-model-org-default'),
    ).toHaveAttribute('data-state', 'checked');

    const permit = await permitLanguageModel(api, candidate.modelId);
    await setRecordingSummaryModel(api, permit.id);
    expect(await getRecordingSummaryModelId(api)).toBe(permit.id);
    await removePermittedModel(api, permit.id);
    expect(await getRecordingSummaryModelId(api)).toBeNull();
    const repermitted = await permitLanguageModel(api, candidate.modelId);
    expect(await getRecordingSummaryModelId(api)).toBeNull();
    await removePermittedModel(api, repermitted.id);
  } finally {
    await setRecordingSummaryModel(api, null);
  }
});

test('only admins of the organization read or change the summary model, and only its own org-wide models are accepted', async ({
  api,
  mail,
}, testInfo) => {
  test.slow();
  const key = randomUUID().slice(0, 8);
  const [orgModel] = await getEffectiveLanguageModels(api);
  const candidate = await findUnpermittedLanguageCandidate(api);
  const { api: memberApi } = await createMemberSession(api, mail, key);
  const otherOrg = await createOrg(
    `summary-other-${key}`,
    testInfo.outputPath('other-org.json'),
  );
  const otherAdminApi = await request.newContext({
    baseURL: config.apiURL,
    storageState: otherOrg.storageState,
  });
  const team = await createTeam(api, `Protokoll ${key}`);
  try {
    expect((await requestRecordingSummaryModel(memberApi)).status()).toBe(403);
    expect(
      (await requestRecordingSummaryModelChange(memberApi, orgModel.id)).status(),
    ).toBe(403);
    expect(await getRecordingSummaryModelId(api)).toBeNull();

    const [otherOrgModel] = await getEffectiveLanguageModels(otherAdminApi);
    const teamGrantId = await grantTeamLanguageModel(
      api,
      team.id,
      candidate.modelId,
    );
    for (const permittedModelId of [otherOrgModel.id, teamGrantId]) {
      const rejected = await requestRecordingSummaryModelChange(
        api,
        permittedModelId,
      );
      expect(rejected.status()).toBe(404);
    }
    const anonymousOnly = await permitLanguageModel(api, candidate.modelId);
    await setPermittedModelAnonymousOnly(api, anonymousOnly.id, true);
    const rejected = await requestRecordingSummaryModelChange(
      api,
      anonymousOnly.id,
    );
    expect(rejected.status()).toBe(400);
    expect(await rejected.json()).toMatchObject({
      code: 'RECORDING_SUMMARY_MODEL_ANONYMOUS_ONLY',
    });
    expect(await getRecordingSummaryModelId(api)).toBeNull();
    await removePermittedModel(api, anonymousOnly.id);

    await setRecordingSummaryModel(api, orgModel.id);
    expect(await getRecordingSummaryModelId(api)).toBe(orgModel.id);
    expect(await getRecordingSummaryModelId(otherAdminApi)).toBeNull();
  } finally {
    await setRecordingSummaryModel(api, null);
    await deleteTeam(api, team.id);
    await memberApi.dispose();
    await otherAdminApi.dispose();
  }
});
