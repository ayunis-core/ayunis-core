import type { APIRequestContext, Page } from '@playwright/test';
import {
  createArtifactByTool,
  spreadsheetContent,
} from '../../src/clients/api/artifact-tools.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import { createChat, defaultModel } from '../../src/clients/api/memory.client';
import { getThread } from '../../src/clients/api/threads.client';
import {
  addThreadPiiMask,
  makeArtifactAnonymous,
  setArtifactVersionContent,
} from '../../src/clients/artifacts.database.client';
import { createMemberSession } from '../../src/factories/user.factory';
import { createProjectThread } from '../../src/factories/workspace-context.factory';
import { sendMessage } from '../../src/flows/chat.flow';
import { expect, test } from '../../src/fixtures/test';

const FORBIDDEN = /\(HTTP 403\)/;
const NOT_FOUND = /\(HTTP 404\)/;
const MODE_MISMATCH = /\(HTTP 400\).*ARTIFACT_CHAT_MODE_MISMATCH/;

const dictionary = [
  { category: 'person_name', maskIndex: 1, value: 'Jonas Weber' },
  { category: 'organization', maskIndex: 1, value: 'Müller & Söhne' },
];

function convert(api: APIRequestContext, artifactId: string) {
  return generatedApi.artifactsControllerConvertToNormal(artifactId, { api });
}

function attach(api: APIRequestContext, threadId: string, artifactId: string) {
  return generatedApi.threadArtifactsControllerAttach(threadId, artifactId, {
    api,
  });
}

async function linkedArtifactIds(api: APIRequestContext, threadId: string) {
  const artifacts = await generatedApi.artifactsControllerFindByThread(
    threadId,
    { api },
  );
  return artifacts.map(({ id }) => id);
}

async function storedArtifact(api: APIRequestContext, artifactId: string) {
  const artifact = await generatedApi.artifactsControllerFindOne(artifactId, {
    api,
  });
  return {
    isAnonymous: artifact.isAnonymous,
    title: artifact.title,
    dictionarySize: artifact.piiMasks?.length ?? 0,
    contents: (artifact.versions ?? []).map(({ content }) => content),
  };
}

async function anonymousWorkspaceChat(
  api: APIRequestContext,
  workspaceId: string,
) {
  const model = await defaultModel(api);
  return (
    await generatedApi.threadsControllerCreate(
      { workspaceId, modelId: model.id, isAnonymous: true },
      { api },
    )
  ).id;
}

test('lets only those who may delete a workspace artifact convert it to normal: every version then holds the real values, anonymous chats lose it with their masks unchanged, and normal chats can take it', async ({
  api,
  mail,
}) => {
  test.setTimeout(180_000);
  const suffix = `${Date.now()}`;
  const owner = await createMemberSession(api, mail, `conv-o-${suffix}`);
  const creator = await createMemberSession(api, mail, `conv-a-${suffix}`);
  const colleague = await createMemberSession(api, mail, `conv-b-${suffix}`);
  // The org admin never joins the workspace: non-member C.
  const outsider = api;
  try {
    const workspace = await generatedApi.workspacesControllerCreate(
      { name: `Umwandeln ${suffix}`, icon: 'building-2' },
      { api: owner.api },
    );
    for (const session of [creator, colleague]) {
      await generatedApi.workspaceMembersControllerAdd(
        workspace.id,
        { userIds: [session.member.id], role: 'user' },
        { api: owner.api },
      );
    }
    const notice = await generatedApi.artifactsControllerCreate(
      {
        threadId: (await createProjectThread(creator.api, workspace.id)).id,
        title: `Bescheid ${suffix}`,
        content: '<p>Entwurf</p>',
      },
      { api: creator.api },
    );
    await generatedApi.artifactsControllerUpdate(
      notice.id,
      { content: '<p>Zweiter Entwurf</p>' },
      { api: creator.api },
    );
    await makeArtifactAnonymous({
      artifactId: notice.id,
      title: `Bescheid ${suffix} an {{pii:PERSON_NAME_1}}`,
      content:
        '<p>Sehr geehrter Herr {{pii:PERSON_NAME_1}}, {{pii:ORGANIZATION_1}}</p>',
      dictionary,
    });
    await setArtifactVersionContent({
      artifactId: notice.id,
      versionNumber: 1,
      content: '<p>Entwurf für {{pii:PERSON_NAME_1}}</p>',
    });
    const anonymousChat = await anonymousWorkspaceChat(
      creator.api,
      workspace.id,
    );
    await attach(creator.api, anonymousChat, notice.id);
    await addThreadPiiMask({
      threadId: anonymousChat,
      category: 'person_name',
      maskIndex: 1,
      value: 'Jonas Weber',
      unmasked: true,
    });
    const anonymousChatBefore = await getThread(creator.api, anonymousChat);
    const colleagueChat = (
      await createProjectThread(colleague.api, workspace.id)
    ).id;
    const anonymous = await storedArtifact(creator.api, notice.id);
    expect(anonymous).toMatchObject({ isAnonymous: true, dictionarySize: 2 });

    await expect(
      attach(colleague.api, colleagueChat, notice.id),
    ).rejects.toThrow(MODE_MISMATCH);
    await expect(convert(colleague.api, notice.id)).rejects.toThrow(FORBIDDEN);
    await expect(convert(outsider, notice.id)).rejects.toThrow(NOT_FOUND);
    expect(await storedArtifact(creator.api, notice.id)).toEqual(anonymous);

    await convert(creator.api, notice.id);

    expect(await storedArtifact(creator.api, notice.id)).toEqual({
      isAnonymous: false,
      title: `Bescheid ${suffix} an Jonas Weber`,
      dictionarySize: 0,
      contents: [
        '<p>Entwurf für Jonas Weber</p>',
        '<p>Sehr geehrter Herr Jonas Weber, Müller &amp; Söhne</p>',
      ],
    });
    expect(await linkedArtifactIds(creator.api, anonymousChat)).toEqual([]);
    await expect(
      attach(creator.api, anonymousChat, notice.id),
    ).rejects.toThrow(MODE_MISMATCH);
    const anonymousChatAfter = await getThread(creator.api, anonymousChat);
    expect(anonymousChatAfter.messages).toEqual(anonymousChatBefore.messages);
    expect(anonymousChatAfter.piiMasks).toEqual(anonymousChatBefore.piiMasks);
    expect(anonymousChatAfter.piiMasks).toHaveLength(1);

    await attach(colleague.api, colleagueChat, notice.id);
    expect(await linkedArtifactIds(colleague.api, colleagueChat)).toEqual([
      notice.id,
    ]);
    const reverted = await generatedApi.artifactsControllerRevert(
      notice.id,
      { versionNumber: 1 },
      { api: colleague.api },
    );
    expect(reverted.content).toBe('<p>Entwurf für Jonas Weber</p>');
  } finally {
    await owner.api.dispose();
    await creator.api.dispose();
    await colleague.api.dispose();
  }
});

test('converts an anonymous spreadsheet cell by cell, so its export stays the same', async ({
  api,
}) => {
  test.setTimeout(60_000);
  const sheet = await createArtifactByTool(
    api,
    await createChat(api),
    'create_spreadsheet',
    { title: `Kontakte ${Date.now()}`, columns: ['Name'], rows: [['Platzhalter']] },
  );
  await makeArtifactAnonymous({
    artifactId: sheet.id,
    title: sheet.title,
    content: spreadsheetContent(
      ['Name', 'Firma'],
      [['{{pii:PERSON_NAME_1}}', '{{pii:ORGANIZATION_1}}']],
    ),
    dictionary,
  });
  const exportCsv = async () =>
    String(
      await generatedApi.artifactsControllerExport(
        sheet.id,
        { format: 'csv' },
        { api },
      ),
    );
  const before = await exportCsv();
  expect(before).toContain('Jonas Weber');

  await convert(api, sheet.id);

  expect(await exportCsv()).toBe(before);
  expect(await storedArtifact(api, sheet.id)).toMatchObject({
    isAnonymous: false,
    contents: [
      spreadsheetContent(['Name', 'Firma'], [['Jonas Weber', 'Müller & Söhne']]),
    ],
  });
});

async function pickArtifact(page: Page, title: string, artifactId: string) {
  await page.getByTestId('chat-plus-button').click();
  await page.getByTestId('chat-attach-artifact').click();
  await page.getByTestId('artifact-picker-search').fill(title);
  const item = page.getByTestId(`artifact-picker-item-${artifactId}`);
  await expect(
    item.getByTestId('artifact-picker-item-anonymized'),
  ).toBeVisible();
  await item.click();
}

test('offers an anonymous artifact in a normal chat behind a warning, converts it on confirm and attaches it on Send', async ({
  page,
  api,
}) => {
  test.setTimeout(120_000);
  const title = `Anhörung ${Date.now()}`;
  const hearing = await generatedApi.artifactsControllerCreate(
    { threadId: await createChat(api), title, content: '<p>Entwurf</p>' },
    { api },
  );
  await makeArtifactAnonymous({
    artifactId: hearing.id,
    title: `${title} {{pii:PERSON_NAME_1}}`,
    content: '<p>Anhörung von {{pii:PERSON_NAME_1}}</p>',
    dictionary,
  });
  const chip = page.getByTestId(`chat-artifact-chip-${hearing.id}`);

  await page.goto('/chat');
  await pickArtifact(page, title, hearing.id);
  await page.getByTestId('confirmation-cancel').click();
  await expect(chip).toHaveCount(0);
  expect((await storedArtifact(api, hearing.id)).isAnonymous).toBe(true);

  await pickArtifact(page, title, hearing.id);
  await page.getByTestId('confirmation-confirm').click();
  await expect(chip).toBeVisible();
  expect(await storedArtifact(api, hearing.id)).toMatchObject({
    isAnonymous: false,
    contents: ['<p>Anhörung von Jonas Weber</p>'],
  });

  await sendMessage(page, 'Bitte die Anhörung prüfen');

  await expect(page).toHaveURL(/\/chats\/[0-9a-f-]+/);
  const threadId = /\/chats\/([0-9a-f-]+)/.exec(page.url())?.[1] ?? '';
  await expect
    .poll(() => linkedArtifactIds(api, threadId))
    .toEqual([hearing.id]);
});
