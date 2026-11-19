import { randomUUID } from 'node:crypto';
import { request } from '@playwright/test';
import type { APIRequestContext, TestInfo } from '@playwright/test';
import { config } from '../../src/config';
import { generatedApi } from '../../src/clients/api/generated-api';
import { permitEmbeddingModel } from '../../src/clients/api/models.client';
import {
  addSharePointLocation,
  listSyncedLocations,
  requestSyncedLocations,
} from '../../src/clients/api/synced-locations.client';
import { sharePointLibraryUrl } from '../../src/clients/graph-mock.client';
import { connectMicrosoft365 } from '../../src/factories/microsoft-365.factory';
import { createOrg } from '../../src/factories/org.factory';
import { createMemberSession } from '../../src/factories/user.factory';
import { createWorkspaceWithResources } from '../../src/factories/workspace-resources.factory';
import { expect, test } from '../../src/fixtures/test';

async function freshOrgApi(
  testInfo: TestInfo,
  key: string,
): Promise<APIRequestContext> {
  const { storageState } = await createOrg(
    `sharepoint-access-${key}-${Date.now()}`,
    testInfo.outputPath(`${key}.json`),
  );
  return request.newContext({ baseURL: config.apiURL, storageState });
}

test('a workspace member who may only read sees a synced location but cannot change it, and another organization cannot see it', async ({
  browser,
  mail,
}, testInfo) => {
  test.setTimeout(120_000);
  const key = randomUUID().slice(0, 8);
  const ours = await freshOrgApi(testInfo, 'ours');
  const theirs = await freshOrgApi(testInfo, 'theirs');
  const member = await createMemberSession(ours, mail, `sp-reader-${key}`);
  const context = await browser.newContext({
    storageState: await member.api.storageState(),
  });
  try {
    await permitEmbeddingModel(ours);
    await connectMicrosoft365(ours);
    await connectMicrosoft365(theirs);
    const workspace = await createWorkspaceWithResources(ours, `Bauamt ${key}`);
    const knowledgeBaseId = workspace.knowledgeBaseId;
    const location = await addSharePointLocation(
      ours,
      knowledgeBaseId,
      sharePointLibraryUrl(`bauamt-${key}`),
    );

    expect(
      (await requestSyncedLocations.list(member.api, knowledgeBaseId)).status(),
    ).toBe(404);

    await generatedApi.workspaceMembersControllerAdd(
      workspace.id,
      { userIds: [member.member.id], role: 'user' },
      { api: ours },
    );

    const seen = await listSyncedLocations(member.api, knowledgeBaseId);
    expect(seen.data.map(({ id }) => id)).toEqual([location.id]);
    expect(
      (
        await requestSyncedLocations.syncNow(
          member.api,
          knowledgeBaseId,
          location.id,
        )
      ).status(),
    ).toBe(403);
    expect(
      (
        await requestSyncedLocations.remove(
          member.api,
          knowledgeBaseId,
          location.id,
        )
      ).status(),
    ).toBe(403);
    expect(
      (
        await requestSyncedLocations.add(
          member.api,
          knowledgeBaseId,
          sharePointLibraryUrl(`planung-${key}`),
        )
      ).status(),
    ).toBe(403);

    const page = await context.newPage();
    await page.goto(
      `/workspaces/${workspace.id}/knowledge-bases/${knowledgeBaseId}`,
    );
    await expect(page.getByTestId(`synced-location-${location.id}`)).toBeVisible();
    await expect(page.getByTestId('synced-location-sync-now')).toHaveCount(0);
    await expect(page.getByTestId('synced-location-remove')).toHaveCount(0);
    await expect(
      page.getByTestId('knowledge-base-documents-add'),
    ).toHaveCount(0);

    for (const response of [
      await requestSyncedLocations.list(theirs, knowledgeBaseId),
      await requestSyncedLocations.syncNow(theirs, knowledgeBaseId, location.id),
      await requestSyncedLocations.remove(theirs, knowledgeBaseId, location.id),
    ])
      expect(response.status()).toBe(404);

    expect(
      (
        await requestSyncedLocations.syncNow(ours, knowledgeBaseId, location.id)
      ).status(),
    ).toBe(202);
    expect(
      (
        await requestSyncedLocations.remove(ours, knowledgeBaseId, location.id)
      ).status(),
    ).toBe(204);
    expect((await listSyncedLocations(ours, knowledgeBaseId)).data).toEqual([]);
  } finally {
    await context.close();
    await member.api.dispose();
    await ours.dispose();
    await theirs.dispose();
  }
});
