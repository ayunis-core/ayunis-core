import { randomUUID } from 'node:crypto';
import { login, markWelcomeVideoSeen } from '../../src/clients/api/auth.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import {
  createRecording,
  requestRecording,
  requestRecordingCreation,
  requestRecordings,
  requestRecordingSummary,
  requestRecordingSummaryRetry,
  requestRecordingTranscript,
  requestRecordingUpload,
} from '../../src/clients/api/recordings.client';
import {
  getRecordingSummaryModelId,
  requestRecordingSummaryModel,
  requestRecordingSummaryModelChange,
  setRecordingSummaryModel,
} from '../../src/clients/api/recording-summary-model.client';
import { getEffectiveLanguageModels } from '../../src/clients/api/models.client';
import { getRolePermissions } from '../../src/clients/api/role-permissions.client';
import {
  getRecordingFairUseLimit,
  requestRecordingFairUseLimitChange,
} from '../../src/clients/api/platform-config.client';
import { requestFeatureToggles } from '../../src/clients/api/routines.client';
import { permitEmbeddingModel } from '../../src/clients/api/models.client';
import {
  getThread,
  getThreadSourceCitationResponse,
  sendThreadMessage,
  uploadThreadTextSource,
} from '../../src/clients/api/threads.client';
import { createPersonalThread } from '../../src/factories/workspace-context.factory';
import { sendMessage } from '../../src/flows/chat.flow';
import {
  citedChunkIds,
  searchRecordingsInNewChat,
  uploadSearchableAudio,
} from '../../src/flows/recording-search.flow';
import { createApiContext } from '../../src/factories/api-context.factory';
import { createOrg } from '../../src/factories/org.factory';
import { test, expect } from '../../src/fixtures/test';

// Same database and frontend build, served by a second backend started with
// FEATURE_RECORDINGS_ENABLED=false (see .github/workflows/e2e-tests.yml).
const disabledBaseUrl =
  process.env.E2E_RECORDINGS_DISABLED_BASE_URL ?? 'http://localhost:3003';
// Locally the dev frontend and backend listen on different ports.
const disabledApiUrl =
  process.env.E2E_RECORDINGS_DISABLED_API_URL ?? disabledBaseUrl;

test('with recordings disabled there are no recording endpoints or pages, and skills, knowledge bases and existing recordings are untouched', async ({
  api,
  page,
}) => {
  const key = randomUUID().slice(0, 8);
  const recording = await createRecording(api, {
    ownerType: 'personal',
    name: `Gemeinderat ${key}`,
  });
  const workspace = await generatedApi.workspacesControllerCreate(
    { name: `Gemeinderat ${key}`, icon: 'building-2' },
    { api },
  );

  const toggles = await requestFeatureToggles(api, disabledApiUrl);
  expect(await toggles.json()).toMatchObject({ recordingsEnabled: false });
  expect((await requestRecordings(api, disabledApiUrl)).status()).toBe(404);
  expect(
    (await requestRecording(api, recording.id, disabledApiUrl)).status(),
  ).toBe(404);
  expect(
    (
      await requestRecordingUpload(
        api,
        recording.id,
        { fileName: `sitzung-${key}.mp3`, mimeType: 'audio/mpeg', fileSize: 1024 },
        disabledApiUrl,
      )
    ).status(),
  ).toBe(404);
  expect(
    (await requestRecordingTranscript(api, recording.id, disabledApiUrl)).status(),
  ).toBe(404);
  expect(
    (await requestRecordingSummary(api, recording.id, disabledApiUrl)).status(),
  ).toBe(404);
  expect(
    (
      await requestRecordingSummaryRetry(api, recording.id, disabledApiUrl)
    ).status(),
  ).toBe(404);
  expect(
    (
      await requestRecordingCreation(
        api,
        { ownerType: 'personal', name: `Nicht möglich ${key}` },
        disabledApiUrl,
      )
    ).status(),
  ).toBe(404);
  for (const path of ['skills', 'knowledge-bases']) {
    const response = await api.get(`${disabledApiUrl}/api/${path}`, {
      params: { ownerType: 'personal' },
    });
    expect(response.status()).toBe(200);
  }

  await page.goto(`${disabledBaseUrl}/recordings`);
  await expect(page).toHaveURL(/\/chat$/);
  await page.goto(`${disabledBaseUrl}/recordings/${recording.id}`);
  await expect(page).toHaveURL(/\/chat$/);
  await expect(page.getByTestId('sidebar')).toBeVisible();
  await expect(page.getByTestId('sidebar-navigation-recordings')).toHaveCount(
    0,
  );
  await page.goto(
    `${disabledBaseUrl}/workspaces/${workspace.id}?tab=recordings`,
  );
  await expect(page.getByTestId('workspace-tab-knowledge')).toBeVisible();
  await expect(page.getByTestId('workspace-tab-recordings')).toHaveCount(0);

  expect((await requestRecording(api, recording.id)).status()).toBe(200);
});

// Changes the MANAGER role of its own organization, so it cannot affect the
// worker organization other specs share.
test('with recordings disabled the roles settings hide the recording permissions and keep their grants', async ({
  browser,
}) => {
  const key = randomUUID().slice(0, 8);
  const org = await createOrg(
    `recordings-off-roles-${key}`,
    test.info().outputPath('recordings-off-roles-org.json'),
  );
  const adminApi = await createApiContext({ cookies: [], origins: [] });
  await login(adminApi, org.admin.email, org.admin.password);
  const context = await browser.newContext({
    storageState: await adminApi.storageState(),
  });
  try {
    const page = await context.newPage();
    await page.goto(`${disabledBaseUrl}/admin-settings/roles`);
    const shareWithOrg = page.getByRole('checkbox', {
      name: 'share_skills_with_org-manager',
    });
    await expect(shareWithOrg).toBeChecked();
    for (const permission of [
      'manage_recordings',
      'manage_team_recordings',
      'manage_org_recordings',
    ]) {
      await expect(
        page.getByRole('checkbox', { name: `${permission}-manager` }),
      ).toHaveCount(0);
    }

    await shareWithOrg.click();
    await page.getByTestId('roles-settings-save').click();
    await expect
      .poll(() => getRolePermissions(adminApi, 'manager'))
      .not.toContain('share_skills_with_org');
    expect(await getRolePermissions(adminApi, 'manager')).toEqual(
      expect.arrayContaining([
        'manage_recordings',
        'manage_team_recordings',
        'manage_org_recordings',
      ]),
    );
  } finally {
    await context.close();
    await adminApi.dispose();
  }
});

test('with recordings disabled the model settings hide the summary model, its endpoints 404 and the stored selection is kept', async ({
  api,
  page,
}) => {
  const [orgModel] = await getEffectiveLanguageModels(api);
  await setRecordingSummaryModel(api, orgModel.id);
  try {
    expect(
      (await requestRecordingSummaryModel(api, disabledApiUrl)).status(),
    ).toBe(404);
    expect(
      (
        await requestRecordingSummaryModelChange(api, null, disabledApiUrl)
      ).status(),
    ).toBe(404);

    await page.goto(`${disabledBaseUrl}/admin-settings/models`);
    await expect(page.getByTestId('org-default-model-select')).toBeVisible();
    await expect(page.getByTestId('recording-summary-model-card')).toHaveCount(
      0,
    );

    expect(await getRecordingSummaryModelId(api)).toBe(orgModel.id);
  } finally {
    await setRecordingSummaryModel(api, null);
  }
});

test('with recordings disabled the platform settings hide the recording upload limit, its endpoint 404s and the stored limit is kept', async ({
  browser,
}) => {
  const superAdmin = await createApiContext({ cookies: [], origins: [] });
  await login(superAdmin, 'admin@demo.local', 'admin');
  await markWelcomeVideoSeen(superAdmin);
  const context = await browser.newContext({
    storageState: await superAdmin.storageState(),
  });
  try {
    const stored = await getRecordingFairUseLimit(superAdmin);
    expect(
      (
        await requestRecordingFairUseLimitChange(
          superAdmin,
          stored.limit + 1,
          disabledApiUrl,
        )
      ).status(),
    ).toBe(404);

    const page = await context.newPage();
    await page.goto(`${disabledBaseUrl}/super-admin-settings/platform-config`);
    await expect(page.getByTestId('image-fair-use-section')).toBeVisible();
    await expect(page.getByTestId('recording-fair-use-section')).toHaveCount(0);

    expect(await getRecordingFairUseLimit(superAdmin)).toEqual(stored);
  } finally {
    await context.close();
    await superAdmin.dispose();
  }
});

// Uploads a recording as the admin of its own organization: the worker
// admin's recording upload limit is shared with the other recording specs.
test('with recordings disabled chats offer no recording search and recording citations are not found, while other citations stay', async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const key = randomUUID().slice(0, 8);
  const org = await createOrg(
    `recordings-off-search-${key}`,
    test.info().outputPath('recordings-off-search-org.json'),
  );
  const adminApi = await createApiContext({ cookies: [], origins: [] });
  await login(adminApi, org.admin.email, org.admin.password);
  const context = await browser.newContext({
    storageState: await adminApi.storageState(),
  });
  try {
    const page = await context.newPage();
    await permitEmbeddingModel(adminApi);
    const recording = await createRecording(adminApi, {
      ownerType: 'personal',
      name: `Gemeinderat ${key}`,
    });
    await uploadSearchableAudio(adminApi, recording.id);
    const { threadId, answer } = await searchRecordingsInNewChat(
      page,
      adminApi,
    );
    const [chunkId] = await citedChunkIds(answer);
    expect(
      (await getThreadSourceCitationResponse(adminApi, threadId, chunkId)).status(),
    ).toBe(200);

    expect(
      (
        await getThreadSourceCitationResponse(
          adminApi,
          threadId,
          chunkId,
          disabledApiUrl,
        )
      ).status(),
    ).toBe(404);
    // The mock model answers so when the chat offers no recording_search.
    const thread = await createPersonalThread(adminApi);
    expect(
      (
        await sendThreadMessage(
          adminApi,
          thread.id,
          'E2E search recordings',
          disabledApiUrl,
        )
      ).ok(),
    ).toBe(true);
    const { messages } = await getThread(adminApi, thread.id);
    expect(JSON.stringify(messages.at(-1)?.content)).toContain(
      'recording-search::unavailable',
    );

    // A chat file is still cited on the backend with recordings disabled.
    const fileThread = await createPersonalThread(adminApi);
    expect(
      (
        await uploadThreadTextSource(
          adminApi,
          fileThread.id,
          `haushalt-${key}.txt`,
          'Der Gemeinderat hat den Haushalt 2026 beschlossen.',
        )
      ).ok(),
    ).toBe(true);
    await expect
      .poll(
        async () =>
          (
            await generatedApi.threadSourcesControllerGetThreadSources(
              fileThread.id,
              { api: adminApi },
            )
          ).map((source) => source.status),
        { timeout: 30_000 },
      )
      .toEqual(['ready']);
    await page.goto(`/chats/${fileThread.id}`);
    await sendMessage(page, 'E2E cite first source');
    const fileCitation = page.getByTestId('source-citation').last();
    await expect(fileCitation).toBeVisible();
    expect(
      (
        await getThreadSourceCitationResponse(
          adminApi,
          fileThread.id,
          await fileCitation.getAttribute('data-source-chunk-id'),
          disabledApiUrl,
        )
      ).status(),
    ).toBe(200);
  } finally {
    await context.close();
    await adminApi.dispose();
  }
});
