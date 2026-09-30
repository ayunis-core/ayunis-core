import { request, type APIRequestContext } from '@playwright/test';
import { login } from '../../src/clients/api/auth.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import {
  addReadyWebSource,
  findKnowledgeBaseDocument,
  setDocumentReindexSchedule,
} from '../../src/clients/api/knowledge-bases.client';
import { permitFirstEmbeddingModel } from '../../src/clients/api/models.client';
import { revokeRolePermission } from '../../src/clients/api/role-permissions.client';
import {
  CreateKnowledgeBaseDtoOwnerType,
  CreateKnowledgeBaseShareDtoEntityType,
  RolePermissionSetDtoPermissionsItem,
} from '../../src/clients/generated/ayunisCoreAPI.schemas';
import { config } from '../../src/config';
import { createUser } from '../../src/factories/user.factory';
import { test, expect } from '../../src/fixtures/test';
import { setReindexInterval } from '../../src/flows/reindex-schedule.flow';
import {
  startWebPageServer,
  type WebPageServer,
} from '../../src/servers/web-page.server';
import type { MailcatcherClient } from '../../src/clients/mailcatcher.client';

const EVERY_TWO_WEEKS = { value: 2, unit: 'weeks' } as const;

let site: WebPageServer;

test.beforeAll(async () => {
  site = await startWebPageServer(
    'Abfallkalender',
    'Die Restmülltonne wird alle zwei Wochen geleert.',
  );
});

test.afterAll(async () => {
  await site.close();
});

async function loggedInMember(
  adminApi: APIRequestContext,
  mail: MailcatcherClient,
  key: string,
): Promise<APIRequestContext> {
  const member = await createUser(adminApi, mail, key);
  const memberApi = await request.newContext({ baseURL: config.apiURL });
  await login(memberApi, member.email, member.password);
  return memberApi;
}

test('adds a web page with a re-index interval, then changes and removes it', async ({
  api,
  page,
}) => {
  test.setTimeout(90_000);
  await permitFirstEmbeddingModel(api);
  const knowledgeBase = await generatedApi.knowledgeBasesControllerCreate(
    {
      ownerType: CreateKnowledgeBaseDtoOwnerType.personal,
      name: `Stadtverwaltung ${Date.now()}`,
    },
    { api },
  );
  const onlyDocument = async () => {
    const { data } = await generatedApi.knowledgeBasesControllerListDocuments(
      knowledgeBase.id,
      { api },
    );
    return data.at(0);
  };

  try {
    await page.goto(`/knowledge-bases/${knowledgeBase.id}`);
    await page.getByTestId('knowledge-base-add-url').click();
    const addDialog = page.getByTestId('add-url-dialog');
    await addDialog.getByTestId('add-url-input').fill(site.url);
    await addDialog.getByTestId('reindex-interval-enabled').click();
    await setReindexInterval(addDialog, 2, 'weeks');
    await addDialog.getByTestId('add-url-submit').click();
    await expect(addDialog).toBeHidden();

    await expect
      .poll(async () => (await onlyDocument())?.reindexInterval)
      .toEqual(EVERY_TWO_WEEKS);
    await expect
      .poll(async () => (await onlyDocument())?.status, { timeout: 30_000 })
      .toBe('ready');
    const document = await onlyDocument();
    expect(document?.nextReindexAt).toBeTruthy();
    const row = page.getByTestId(`knowledge-base-document-${document?.id}`);
    await expect(
      row.getByTestId('knowledge-base-document-reindex-summary'),
    ).toBeVisible();

    await row.getByTestId('knowledge-base-document-reindex-schedule').click();
    const scheduleDialog = page.getByTestId('reindex-schedule-dialog');
    await expect(
      scheduleDialog.getByTestId('reindex-schedule-next-run'),
    ).toBeVisible();
    await setReindexInterval(scheduleDialog, 3, 'months');
    await scheduleDialog.getByTestId('reindex-schedule-save').click();
    await expect(scheduleDialog).toBeHidden();
    await expect
      .poll(async () => (await onlyDocument())?.reindexInterval)
      .toEqual({ value: 3, unit: 'months' });

    await row.getByTestId('knowledge-base-document-reindex-schedule').click();
    await scheduleDialog.getByTestId('reindex-interval-enabled').click();
    await scheduleDialog.getByTestId('reindex-schedule-save').click();
    await expect(scheduleDialog).toBeHidden();
    await expect
      .poll(async () => {
        const current = await onlyDocument();
        return [current?.reindexInterval, current?.nextReindexAt];
      })
      .toEqual([null, null]);
    await expect(
      row.getByTestId('knowledge-base-document-reindex-summary'),
    ).toBeHidden();
  } finally {
    await generatedApi.knowledgeBasesControllerDelete(knowledgeBase.id, {
      api,
    });
  }
});

test('lets only the owner schedule a web page in a knowledge base shared read-only', async ({
  api,
  mail,
}) => {
  test.setTimeout(90_000);
  await permitFirstEmbeddingModel(api);
  const knowledgeBase = await generatedApi.knowledgeBasesControllerCreate(
    {
      ownerType: CreateKnowledgeBaseDtoOwnerType.personal,
      name: `Geteilte Stadtverwaltung ${Date.now()}`,
    },
    { api },
  );
  const memberApi = await loggedInMember(
    api,
    mail,
    `reindex-share-${Date.now()}`,
  );

  try {
    const document = await addReadyWebSource(api, knowledgeBase.id, site.url);

    await expect(
      setDocumentReindexSchedule(
        memberApi,
        knowledgeBase.id,
        document.id,
        EVERY_TWO_WEEKS,
      ),
    ).rejects.toThrow('HTTP 404');

    await generatedApi.sharesControllerCreateKnowledgeBaseShare(
      {
        entityType: CreateKnowledgeBaseShareDtoEntityType.knowledge_base,
        knowledgeBaseId: knowledgeBase.id,
      },
      { api },
    );
    await expect(
      findKnowledgeBaseDocument(memberApi, knowledgeBase.id, document.id),
    ).resolves.toMatchObject({ id: document.id });
    await expect(
      setDocumentReindexSchedule(
        memberApi,
        knowledgeBase.id,
        document.id,
        EVERY_TWO_WEEKS,
      ),
    ).rejects.toThrow('HTTP 404');
    await expect(
      findKnowledgeBaseDocument(api, knowledgeBase.id, document.id),
    ).resolves.toMatchObject({ reindexInterval: null });

    await expect(
      setDocumentReindexSchedule(
        api,
        knowledgeBase.id,
        document.id,
        EVERY_TWO_WEEKS,
      ),
    ).resolves.toMatchObject({ reindexInterval: EVERY_TWO_WEEKS });
  } finally {
    await memberApi.dispose();
    await generatedApi.knowledgeBasesControllerDelete(knowledgeBase.id, {
      api,
    });
  }
});

test('denies scheduling to a workspace owner whose role lacks the knowledge-base permission', async ({
  api,
  mail,
}) => {
  test.setTimeout(90_000);
  await permitFirstEmbeddingModel(api);
  const memberApi = await loggedInMember(
    api,
    mail,
    `reindex-permission-${Date.now()}`,
  );

  try {
    const workspace = await generatedApi.workspacesControllerCreate(
      { name: `Bauamt ${Date.now()}`, icon: 'building-2' },
      { api: memberApi },
    );
    const knowledgeBase = await generatedApi.knowledgeBasesControllerCreate(
      {
        ownerType: CreateKnowledgeBaseDtoOwnerType.workspace,
        workspaceId: workspace.id,
        name: 'Bebauungspläne',
      },
      { api: memberApi },
    );
    const document = await addReadyWebSource(
      memberApi,
      knowledgeBase.id,
      site.url,
    );

    const restorePermission = await revokeRolePermission(
      api,
      'user',
      RolePermissionSetDtoPermissionsItem.manage_knowledge_bases,
    );
    try {
      await expect(
        setDocumentReindexSchedule(
          memberApi,
          knowledgeBase.id,
          document.id,
          EVERY_TWO_WEEKS,
        ),
      ).rejects.toThrow('HTTP 403');
    } finally {
      await restorePermission();
    }

    await expect(
      setDocumentReindexSchedule(
        memberApi,
        knowledgeBase.id,
        document.id,
        EVERY_TWO_WEEKS,
      ),
    ).resolves.toMatchObject({ reindexInterval: EVERY_TWO_WEEKS });
  } finally {
    await memberApi.dispose();
  }
});
