import { randomUUID } from 'node:crypto';
import type { APIRequestContext, Browser } from '@playwright/test';
import {
  getAuthenticatedPrincipalId,
  login,
  markWelcomeVideoSeen,
} from '../../src/clients/api/auth.client';
import {
  findUnpermittedLanguageCandidate,
  getEffectiveLanguageModels,
  permitEmbeddingModel,
  permitLanguageModel,
} from '../../src/clients/api/models.client';
import { setRecordingSummaryModel } from '../../src/clients/api/recording-summary-model.client';
import {
  createRecording,
  getRecording,
  getRecordingSummary,
  requestRecordingDeletion,
  requestRecordingSummaryRetry,
  uploadRecordingAudio,
} from '../../src/clients/api/recordings.client';
import {
  createSuperAdminSubscription,
  e2eSubscriptionBilling,
  updateSuperAdminMonthlyCredits,
} from '../../src/clients/api/super-admin-subscriptions.client';
import {
  countRecordingSummaryRows,
  findRecordingAudioRows,
  findRecordingAudioSourceId,
  findRecordingSummaryRunStatus,
  findUsageModelIds,
} from '../../src/clients/database.client';
import { createApiContext } from '../../src/factories/api-context.factory';
import { createSilentWav } from '../../src/factories/audio.factory';
import { createOrg } from '../../src/factories/org.factory';
import { createRecordingAccessFixture } from '../../src/factories/recording-access.factory';
import { test, expect } from '../../src/fixtures/test';

// Summaries come from the mock model, which answers "<provider>::<model>", so
// the text names the model that wrote it. Recordings are uploaded by users of
// their own organizations: the worker admin's recording upload limit is
// shared with the other recording specs.
const SUMMARY_TIMEOUT = { timeout: 60_000 };

/** The mock model holds its answer back while the input carries this. */
const SLOW_SUMMARY_MARKER = 'E2E slow response';

function audio(name: string) {
  return {
    name: `${name}.wav`,
    mimeType: 'audio/wav',
    buffer: createSilentWav(5),
  };
}

async function ownOrgAdmin(key: string) {
  const org = await createOrg(
    `recording-summary-${key}`,
    test.info().outputPath(`recording-summary-${key}.json`),
  );
  const api = await createApiContext({ cookies: [], origins: [] });
  await login(api, org.admin.email, org.admin.password);
  await permitEmbeddingModel(api);
  const [defaultModel] = await getEffectiveLanguageModels(api);
  return {
    api,
    id: await getAuthenticatedPrincipalId(api),
    defaultModel,
  };
}

async function openAs(browser: Browser, api: APIRequestContext) {
  const context = await browser.newContext({
    storageState: await api.storageState(),
  });
  return { context, page: await context.newPage() };
}

async function summaryOf(api: APIRequestContext, recordingId: string) {
  return (await getRecording(api, recordingId)).summary;
}

test('a summary is written by the org default model, or by the configured summary model, and billed to the uploader', async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const key = randomUUID().slice(0, 8);
  const uploader = await ownOrgAdmin(key);
  const { context, page } = await openAs(browser, uploader.api);
  try {
    // No summary model is set: the org default writes it.
    await page.goto('/recordings');
    await page.getByTestId('recording-create').first().click();
    await page.getByTestId('entity-form-name').fill(`Gemeinderat ${key}`);
    await page
      .getByTestId('recording-create-audio')
      .setInputFiles(audio(`gemeinderat-${key}`));
    await page.getByTestId('create-entity-submit').click();
    await expect(page.getByTestId('recording-page')).toBeVisible();
    const recordingId = new URL(page.url()).pathname.split('/').pop()!;

    const card = page.getByTestId('recording-summary-card');
    await expect(card).toHaveAttribute(
      'data-summary-status',
      'ready',
      SUMMARY_TIMEOUT,
    );
    await expect(page.getByTestId('recording-status')).toHaveAttribute(
      'data-status',
      'ready',
    );
    const { provider, name, modelId } = uploader.defaultModel;
    await expect(page.getByTestId('recording-summary-content')).toContainText(
      `${provider}::${name}`,
    );
    await expect(page.getByTestId('recording-transcript-turn')).toHaveCount(3);
    expect(await findUsageModelIds(uploader.id)).toEqual([modelId]);
    // The summary is searchable next to the transcript, told apart from it.
    const rows = await findRecordingAudioRows(recordingId);
    expect(rows?.summaryIndexEntries).toBeGreaterThan(0);
    expect(rows?.chunkRanges).toEqual([{ start: 0.2, end: 3.9 }]);

    // An admin picks another model for summaries.
    const candidate = await findUnpermittedLanguageCandidate(uploader.api);
    const permit = await permitLanguageModel(uploader.api, candidate.modelId);
    await setRecordingSummaryModel(uploader.api, permit.id);
    const second = await createRecording(uploader.api, {
      ownerType: 'personal',
      name: `Bauausschuss ${key}`,
    });
    await uploadRecordingAudio(
      uploader.api,
      second.id,
      audio(`bauausschuss-${key}`),
    );
    await expect
      .poll(async () => (await summaryOf(uploader.api, second.id))?.status, {
        timeout: 60_000,
      })
      .toBe('ready');

    expect(await summaryOf(uploader.api, second.id)).toMatchObject({
      modelName: candidate.displayName,
    });
    expect(await getRecordingSummary(uploader.api, second.id)).toContain(
      `${candidate.provider}::${candidate.name}`,
    );
    expect(await findUsageModelIds(uploader.id)).toEqual([
      modelId,
      candidate.modelId,
    ]);
  } finally {
    await context.close();
    await uploader.api.dispose();
  }
});

test('with the org budget used up the summary fails and the transcript stays; readers cannot try again, a manager can once the budget is raised and pays for it', async ({
  browser,
  mail,
}) => {
  test.setTimeout(240_000);
  const key = randomUUID().slice(0, 8);
  const fixture = await createRecordingAccessFixture(
    key,
    mail,
    test.info().outputPath('recording-summary-budget-org.json'),
  );
  const { admin, member, team } = fixture;
  const superAdmin = await createApiContext({ cookies: [], origins: [] });
  const contexts: Awaited<ReturnType<typeof openAs>>[] = [];
  try {
    await permitEmbeddingModel(admin.api);
    const [defaultModel] = await getEffectiveLanguageModels(admin.api);
    await login(superAdmin, 'admin@demo.local', 'admin');
    await markWelcomeVideoSeen(superAdmin);
    await createSuperAdminSubscription(superAdmin, fixture.org.orgId, {
      ...e2eSubscriptionBilling,
      type: 'USAGE_BASED',
      monthlyCredits: 1,
    });
    await updateSuperAdminMonthlyCredits(superAdmin, fixture.org.orgId, {
      monthlyCredits: 0,
    });

    // The member uploads it while allowed to manage team recordings, then
    // only reads team recordings.
    await fixture.setUserRecordingPermissions([
      'manage_recordings',
      'manage_team_recordings',
    ]);
    const recording = await createRecording(member.api, {
      ownerType: 'team',
      teamId: team.id,
      name: `Haushaltsausschuss ${key}`,
    });
    await uploadRecordingAudio(
      member.api,
      recording.id,
      audio(`haushaltsausschuss-${key}`),
    );
    await fixture.setUserRecordingPermissions(['manage_recordings']);
    await expect
      .poll(async () => (await summaryOf(admin.api, recording.id))?.status, {
        timeout: 60_000,
      })
      .toBe('failed');
    expect(await getRecording(admin.api, recording.id)).toMatchObject({
      status: 'ready',
      summary: { failureCode: 'CREDIT_BUDGET_EXCEEDED' },
    });
    expect(await findUsageModelIds(member.id)).toEqual([]);

    // The reader sees the failure and the transcript, but cannot try again.
    const reader = await openAs(browser, member.api);
    contexts.push(reader);
    await reader.page.goto(`/recordings/${recording.id}`);
    await expect(
      reader.page.getByTestId('recording-summary-failure'),
    ).toHaveAttribute('data-failure-code', 'CREDIT_BUDGET_EXCEEDED');
    await expect(
      reader.page.getByTestId('recording-transcript-turn'),
    ).toHaveCount(3);
    await expect(reader.page.getByTestId('recording-summary-retry')).toHaveCount(
      0,
    );
    expect(
      (await requestRecordingSummaryRetry(member.api, recording.id)).status(),
    ).toBe(403);

    // Once the budget is raised, the manager tries again and is billed.
    await updateSuperAdminMonthlyCredits(superAdmin, fixture.org.orgId, {
      monthlyCredits: 10_000,
    });
    const manager = await openAs(browser, admin.api);
    contexts.push(manager);
    await manager.page.goto(`/recordings/${recording.id}`);
    await expect(
      manager.page.getByTestId('recording-summary-failure'),
    ).toHaveAttribute('data-failure-code', 'CREDIT_BUDGET_EXCEEDED');
    await manager.page.getByTestId('recording-summary-retry').click();
    await expect(
      manager.page.getByTestId('recording-summary-card'),
    ).toHaveAttribute('data-summary-status', 'ready', SUMMARY_TIMEOUT);
    await expect(
      manager.page.getByTestId('recording-summary-content'),
    ).toContainText(`${defaultModel.provider}::${defaultModel.name}`);

    expect(await findUsageModelIds(admin.id)).toEqual([defaultModel.modelId]);
    expect(await findUsageModelIds(member.id)).toEqual([]);
  } finally {
    await Promise.all(contexts.map(({ context }) => context.close()));
    await superAdmin.dispose();
    await fixture.dispose();
  }
});

test('deleting a recording while its summary is written leaves no summary and no index entries behind', async () => {
  test.setTimeout(120_000);
  const key = randomUUID().slice(0, 8);
  const uploader = await ownOrgAdmin(key);
  try {
    const recording = await createRecording(uploader.api, {
      ownerType: 'personal',
      name: `${SLOW_SUMMARY_MARKER} ${key}`,
    });
    await uploadRecordingAudio(
      uploader.api,
      recording.id,
      audio(`aeltestenrat-${key}`),
    );
    await expect
      .poll(() => findRecordingSummaryRunStatus(recording.id), {
        timeout: 60_000,
      })
      .toBe('running');
    const audioSourceId = await findRecordingAudioSourceId(recording.id);
    expect(audioSourceId).not.toBeNull();

    expect(
      (await requestRecordingDeletion(uploader.api, recording.id)).status(),
    ).toBe(204);

    // The model call still returns and is billed; nothing is written after it.
    await expect
      .poll(() => findUsageModelIds(uploader.id), { timeout: 30_000 })
      .toEqual([uploader.defaultModel.modelId]);
    expect(await countRecordingSummaryRows(recording.id, audioSourceId!)).toBe(
      0,
    );
  } finally {
    await uploader.api.dispose();
  }
});
