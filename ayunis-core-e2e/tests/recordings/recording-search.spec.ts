import { randomUUID } from 'node:crypto';
import type { APIRequestContext, Browser } from '@playwright/test';
import { login } from '../../src/clients/api/auth.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import {
  getEffectiveLanguageModels,
  permitEmbeddingModel,
} from '../../src/clients/api/models.client';
import { createRecording } from '../../src/clients/api/recordings.client';
import {
  addTeamMember,
  requestTeamMemberRemoval,
} from '../../src/clients/api/teams.client';
import { getThreadSourceCitationResponse } from '../../src/clients/api/threads.client';
import type { SourceCitationResponseDto } from '../../src/clients/generated/ayunisCoreAPI.schemas';
import { createApiContext } from '../../src/factories/api-context.factory';
import { createOrg } from '../../src/factories/org.factory';
import { createRecordingAccessFixture } from '../../src/factories/recording-access.factory';
import {
  citedChunkIds,
  searchRecordingsInNewChat,
  uploadSearchableAudio,
} from '../../src/flows/recording-search.flow';
import { test, expect } from '../../src/fixtures/test';

// Recordings are uploaded by users of their own organizations: the worker
// admin's recording upload limit is shared with the other recording specs.

async function openAs(browser: Browser, api: APIRequestContext) {
  const context = await browser.newContext({
    storageState: await api.storageState(),
  });
  return { context, page: await context.newPage() };
}

async function citationsOf(
  api: APIRequestContext,
  threadId: string,
  chunkIds: string[],
): Promise<SourceCitationResponseDto[]> {
  return Promise.all(
    chunkIds.map(async (chunkId) => {
      const response = await getThreadSourceCitationResponse(
        api,
        threadId,
        chunkId,
      );
      expect(response.status()).toBe(200);
      return (await response.json()) as SourceCitationResponseDto;
    }),
  );
}

test('an org member finds a team recording, from its transcript and its summary, only while in the team; its citation opens the recording and is denied after leaving; another organization never finds it', async ({
  browser,
  mail,
  page,
  api,
}) => {
  test.setTimeout(240_000);
  const key = randomUUID().slice(0, 8);
  const fixture = await createRecordingAccessFixture(
    key,
    mail,
    test.info().outputPath('recording-search-org.json'),
  );
  const { admin, outsider, team } = fixture;
  const outsiderSession = await openAs(browser, outsider.api);
  const outsiderPage = outsiderSession.page;
  try {
    await permitEmbeddingModel(admin.api);
    const [summaryModel] = await getEffectiveLanguageModels(admin.api);
    const name = `Bauausschuss ${key}`;
    const recording = await createRecording(admin.api, {
      ownerType: 'team',
      teamId: team.id,
      name,
    });
    await uploadSearchableAudio(admin.api, recording.id, { withSummary: true });

    // Outside the team: not found.
    const denied = await searchRecordingsInNewChat(outsiderPage, outsider.api);
    await expect(denied.answer).toContainText('recording-search::0');

    // In the team: found in the transcript and in the summary, with citations.
    await addTeamMember(admin.api, team.id, outsider.id);
    const allowed = await searchRecordingsInNewChat(
      outsiderPage,
      outsider.api,
    );
    await expect(allowed.answer).toContainText(`${name} (transcript)`);
    await expect(allowed.answer).toContainText(`${name} (summary)`);
    const chunkIds = await citedChunkIds(allowed.answer);
    const citations = await citationsOf(
      outsider.api,
      allowed.threadId,
      chunkIds,
    );
    // The summary is the mock model's answer, which the transcript never says.
    const summaryCitation = citations.find(
      (citation) => citation.recording?.position === 'summary',
    );
    expect(summaryCitation?.chunk.content).toContain(
      `${summaryModel.provider}::${summaryModel.name}`,
    );
    expect(
      citations.find((citation) => citation.recording?.position === 'transcript')
        ?.recording,
    ).toMatchObject({
      id: recording.id,
      name,
      start: 0.2,
      end: 3.9,
      speakerNumbers: [1, 2],
    });

    const transcriptChunkId =
      chunkIds[
        citations.findIndex(
          (citation) => citation.recording?.position === 'transcript',
        )
      ];
    await outsiderPage
      .locator(`[data-source-chunk-id="${transcriptChunkId}"]`)
      .click();
    await expect(
      outsiderPage.getByTestId('source-citation-recording-position'),
    ).toHaveAttribute('data-position', 'transcript');
    await outsiderPage.getByTestId('source-citation-open-recording').click();
    await expect(outsiderPage).toHaveURL(
      new RegExp(`/recordings/${recording.id}$`),
    );
    await expect(outsiderPage.getByTestId('recording-page')).toBeVisible();

    // A user of another organization never finds it, nor opens its citation.
    const foreign = await searchRecordingsInNewChat(page, api);
    await expect(foreign.answer).not.toContainText(name);
    expect(
      (
        await getThreadSourceCitationResponse(
          api,
          foreign.threadId,
          transcriptChunkId,
        )
      ).status(),
    ).toBe(404);

    // Leaving the team: the citation is denied and the search finds nothing.
    expect(
      (
        await requestTeamMemberRemoval(admin.api, team.id, outsider.id)
      ).status(),
    ).toBeLessThan(300);
    expect(
      (
        await getThreadSourceCitationResponse(
          outsider.api,
          allowed.threadId,
          transcriptChunkId,
        )
      ).status(),
    ).toBe(404);
    await outsiderPage.goto(`/chats/${allowed.threadId}`);
    await outsiderPage
      .locator(`[data-source-chunk-id="${transcriptChunkId}"]`)
      .click();
    await expect(outsiderPage.getByTestId('source-citation-error')).toBeVisible();
    const left = await searchRecordingsInNewChat(outsiderPage, outsider.api);
    await expect(left.answer).toContainText('recording-search::0');
  } finally {
    await outsiderSession.context.close();
    await fixture.dispose();
  }
});

test('the upload time filter keeps only recordings uploaded within the range, and workspace recordings are found only in their workspace chat', async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const key = randomUUID().slice(0, 8);
  const org = await createOrg(
    `recording-search-${key}`,
    test.info().outputPath('recording-search-filter-org.json'),
  );
  const adminApi = await createApiContext({ cookies: [], origins: [] });
  await login(adminApi, org.admin.email, org.admin.password);
  const { context, page } = await openAs(browser, adminApi);
  try {
    await permitEmbeddingModel(adminApi);
    const march = await createRecording(adminApi, {
      ownerType: 'personal',
      name: `Gemeinderat März ${key}`,
    });
    // The filter compares when recordings were created, so these are
    // created a moment apart.
    await expect
      .poll(() => Date.now() - Date.parse(march.createdAt))
      .toBeGreaterThan(1_000);
    const april = await createRecording(adminApi, {
      ownerType: 'personal',
      name: `Gemeinderat April ${key}`,
    });
    const workspace = await generatedApi.workspacesControllerCreate(
      { name: `Klausur ${key}`, icon: 'building-2' },
      { api: adminApi },
    );
    const retreat = await createRecording(adminApi, {
      ownerType: 'workspace',
      workspaceId: workspace.id,
      name: `Klausurtagung ${key}`,
    });
    for (const recording of [march, april, retreat]) {
      await uploadSearchableAudio(adminApi, recording.id);
    }
    const between = new Date(
      (Date.parse(march.createdAt) + Date.parse(april.createdAt)) / 2,
    ).toISOString();

    const from = await searchRecordingsInNewChat(page, adminApi, {
      search: { uploadedFrom: between },
    });
    await expect(from.answer).toContainText(april.name);
    await expect(from.answer).not.toContainText(march.name);

    const to = await searchRecordingsInNewChat(page, adminApi, {
      search: { uploadedTo: between },
    });
    await expect(to.answer).toContainText(march.name);
    await expect(to.answer).not.toContainText(april.name);

    const personal = await searchRecordingsInNewChat(page, adminApi);
    await expect(personal.answer).toContainText(march.name);
    await expect(personal.answer).not.toContainText(retreat.name);

    const inWorkspace = await searchRecordingsInNewChat(page, adminApi, {
      workspaceId: workspace.id,
    });
    await expect(inWorkspace.answer).toContainText(retreat.name);
    await expect(inWorkspace.answer).toContainText(march.name);
  } finally {
    await context.close();
    await adminApi.dispose();
  }
});
