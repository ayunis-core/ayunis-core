import { randomUUID } from 'node:crypto';
import { request } from '@playwright/test';
import type { APIRequestContext, Page, TestInfo } from '@playwright/test';
import { config } from '../../src/config';
import {
  grantCrawlDomain,
  revokeCrawlDomain,
} from '../../src/clients/api/crawl-domains.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import { permitEmbeddingModel } from '../../src/clients/api/models.client';
import {
  listSyncedLocations,
  requestSyncedLocations,
} from '../../src/clients/api/synced-locations.client';
import { createOrg } from '../../src/factories/org.factory';
import { createMemberSession } from '../../src/factories/user.factory';
import { createWorkspaceWithResources } from '../../src/factories/workspace-resources.factory';
import { expect, test } from '../../src/fixtures/test';
import {
  htmlPage,
  startWebsiteServer,
  type WebsiteServer,
} from '../../src/servers/website.server';

let site: WebsiteServer;

test.beforeAll(async () => {
  site = await startWebsiteServer({
    '/ortsrecht': htmlPage(
      'Ortsrecht',
      '<p>Satzungen der Gemeinde.</p><a href="/hundesteuer">Hundesteuer</a>',
    ),
    '/hundesteuer': htmlPage(
      'Hundesteuersatzung',
      '<p>Die Hundesteuer beträgt 96 Euro im Jahr.</p>',
    ),
  });
});

test.afterAll(async () => {
  await site.close();
});

async function freshOrg(testInfo: TestInfo, key: string) {
  const { orgId, storageState } = await createOrg(
    `website-access-${key}-${Date.now()}`,
    testInfo.outputPath(`${key}.json`),
  );
  const api = await request.newContext({ baseURL: config.apiURL, storageState });
  return { orgId, storageState, api };
}

test('a workspace member who may only read sees a website and its pages but cannot change it, another organization cannot see it, and a host reserved for another organization is refused', async ({
  browser,
  mail,
}, testInfo) => {
  test.setTimeout(180_000);
  const key = randomUUID().slice(0, 8);
  const ours = await freshOrg(testInfo, 'ours');
  const theirs = await freshOrg(testInfo, 'theirs');
  const member = await createMemberSession(ours.api, mail, `web-reader-${key}`);
  const ownerContext = await browser.newContext({
    storageState: ours.storageState,
  });
  const memberContext = await browser.newContext({
    storageState: await member.api.storageState(),
  });
  const reservedHost = `reserved-${key}.test`;
  const grant = await grantCrawlDomain(theirs.orgId, reservedHost);
  try {
    await permitEmbeddingModel(ours.api);
    const workspace = await createWorkspaceWithResources(
      ours.api,
      `Ordnungsamt ${key}`,
    );
    const knowledgeBaseId = workspace.knowledgeBaseId;
    const knowledgeBasePath = `/workspaces/${workspace.id}/knowledge-bases/${knowledgeBaseId}`;

    const owner = await ownerContext.newPage();
    await owner.goto(knowledgeBasePath);
    await openWebsiteDialog(owner);
    await owner.getByTestId('website-url').fill(`https://${reservedHost}/`);
    await owner.getByTestId('website-add').click();
    await expect(owner.getByTestId('website-url-error')).toBeVisible();
    expect((await listSyncedLocations(ours.api, knowledgeBaseId)).data).toEqual(
      [],
    );
    await owner.getByTestId('website-url').fill(site.url('/ortsrecht'));
    await owner.getByTestId('website-depth').click();
    await owner.getByTestId('website-depth-1').click();
    await owner.getByTestId('website-add').click();
    await expect(owner.getByRole('dialog')).toHaveCount(0);
    const [location] = (await listSyncedLocations(ours.api, knowledgeBaseId))
      .data;
    expect(location).toMatchObject({
      provider: 'web',
      product: null,
      location: site.url('/ortsrecht'),
    });
    await waitForReadyDocuments(ours.api, knowledgeBaseId, [
      'Hundesteuersatzung',
      'Ortsrecht',
    ]);

    expect(
      (await requestSyncedLocations.list(member.api, knowledgeBaseId)).status(),
    ).toBe(404);
    expect(
      (
        await requestSyncedLocations.addWebsite(
          member.api,
          knowledgeBaseId,
          site.url('/hundesteuer'),
        )
      ).status(),
    ).toBe(404);

    await generatedApi.workspaceMembersControllerAdd(
      workspace.id,
      { userIds: [member.member.id], role: 'user' },
      { api: ours.api },
    );

    const seen = await listSyncedLocations(member.api, knowledgeBaseId);
    expect(seen.data.map(({ id }) => id)).toEqual([location.id]);
    for (const response of [
      await requestSyncedLocations.addWebsite(
        member.api,
        knowledgeBaseId,
        site.url('/hundesteuer'),
      ),
      await requestSyncedLocations.syncNow(
        member.api,
        knowledgeBaseId,
        location.id,
      ),
      await requestSyncedLocations.remove(
        member.api,
        knowledgeBaseId,
        location.id,
      ),
    ])
      expect(response.status()).toBe(403);

    const reader = await memberContext.newPage();
    await reader.goto(knowledgeBasePath);
    const row = reader.getByTestId(`synced-location-${location.id}`);
    await expect(row).toHaveAttribute('data-provider', 'web');
    await row.getByTestId('synced-location-files-toggle').click();
    await expect(
      reader
        .getByTestId(`synced-location-files-${location.id}`)
        .getByTestId(/^knowledge-base-document-[0-9a-f]{8}-/),
    ).toHaveCount(2);
    await expect(reader.getByTestId('synced-location-sync-now')).toHaveCount(0);
    await expect(reader.getByTestId('synced-location-remove')).toHaveCount(0);
    await expect(reader.getByTestId('knowledge-base-documents-add')).toHaveCount(
      0,
    );

    for (const response of [
      await requestSyncedLocations.list(theirs.api, knowledgeBaseId),
      await requestSyncedLocations.addWebsite(
        theirs.api,
        knowledgeBaseId,
        site.url('/hundesteuer'),
      ),
      await requestSyncedLocations.syncNow(
        theirs.api,
        knowledgeBaseId,
        location.id,
      ),
      await requestSyncedLocations.remove(
        theirs.api,
        knowledgeBaseId,
        location.id,
      ),
    ])
      expect(response.status()).toBe(404);

    expect(
      (
        await requestSyncedLocations.syncNow(
          ours.api,
          knowledgeBaseId,
          location.id,
        )
      ).status(),
    ).toBe(202);
    expect(
      (
        await requestSyncedLocations.remove(
          ours.api,
          knowledgeBaseId,
          location.id,
        )
      ).status(),
    ).toBe(204);
    expect((await listSyncedLocations(ours.api, knowledgeBaseId)).data).toEqual(
      [],
    );
    expect(
      (
        await generatedApi.knowledgeBasesControllerListDocuments(
          knowledgeBaseId,
          { api: ours.api },
        )
      ).data,
    ).toEqual([]);
  } finally {
    await revokeCrawlDomain(theirs.orgId, grant.id);
    await ownerContext.close();
    await memberContext.close();
    await member.api.dispose();
    await ours.api.dispose();
    await theirs.api.dispose();
  }
});

async function openWebsiteDialog(page: Page): Promise<void> {
  await page.getByTestId('knowledge-base-documents-add').click();
  await page.getByTestId('knowledge-base-documents-add-url').click();
}

async function waitForReadyDocuments(
  api: APIRequestContext,
  knowledgeBaseId: string,
  names: string[],
): Promise<void> {
  await expect
    .poll(
      async () =>
        (
          await generatedApi.knowledgeBasesControllerListDocuments(
            knowledgeBaseId,
            { api },
          )
        ).data
          .map(({ name, status }) => `${name}:${status}`)
          .sort(),
      { timeout: 60_000 },
    )
    .toEqual(names.map((name) => `${name}:ready`));
}
