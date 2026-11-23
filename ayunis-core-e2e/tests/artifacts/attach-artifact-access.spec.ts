import type { APIRequestContext } from '@playwright/test';
import {
  ARTIFACT_WRITE_SUCCEEDED,
  callArtifactTool,
  currentArtifactContent,
} from '../../src/clients/api/artifact-tools.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import { createChat } from '../../src/clients/api/memory.client';
import { makeArtifactAnonymous } from '../../src/clients/artifacts.database.client';
import { createMemberSession } from '../../src/factories/user.factory';
import { createProjectThread } from '../../src/factories/workspace-context.factory';
import { expect, test } from '../../src/fixtures/test';

const NOT_FOUND = /\(HTTP 404\)/;
const OUTSIDE_SCOPE = /\(HTTP 400\).*ARTIFACT_OUTSIDE_CHAT_SCOPE/;
const MODE_MISMATCH = /\(HTTP 400\).*ARTIFACT_CHAT_MODE_MISMATCH/;

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

function createDocument(
  api: APIRequestContext,
  threadId: string,
  title: string,
) {
  return generatedApi.artifactsControllerCreate(
    { threadId, title, content: `<p>${title} Entwurf</p>` },
    { api },
  );
}

test('pulls a personal artifact into another personal chat, where the model reads and edits it, and the edit shows in the first chat and on the artifact', async ({
  api,
}) => {
  test.setTimeout(120_000);
  const firstChat = await createChat(api);
  const letter = await createDocument(api, firstChat, 'Brief');
  const secondChat = await createChat(api);
  const readInSecondChat = () =>
    callArtifactTool(api, secondChat, 'read_document', {
      artifact_id: letter.id,
    });
  expect(await readInSecondChat()).toBe(
    `The tool didn't provide any result due to the following error in tool usage: Failed to execute tool read_document: Artifact with ID '${letter.id}' not found`,
  );

  await attach(api, secondChat, letter.id);
  await attach(api, secondChat, letter.id);

  expect(await linkedArtifactIds(api, secondChat)).toEqual([letter.id]);
  expect(await readInSecondChat()).toContain('Brief Entwurf');
  expect(
    await callArtifactTool(api, secondChat, 'edit_document', {
      artifact_id: letter.id,
      edits: [{ old_text: 'Entwurf', new_text: 'Endfassung' }],
      expected_version: 1,
    }),
  ).toBe(ARTIFACT_WRITE_SUCCEEDED);
  expect(await currentArtifactContent(api, letter.id)).toEqual({
    version: 2,
    content: '<p>Brief Endfassung</p>',
  });
  const [inFirstChat] = await generatedApi.artifactsControllerFindByThread(
    firstChat,
    { api },
  );
  expect(inFirstChat).toMatchObject({ id: letter.id, currentVersionNumber: 2 });
});

test('lets workspace member B attach member A’s workspace artifact in B’s own chat and edit it there, and rejects non-member C and B for A’s personal artifact before and after A attaches it', async ({
  api,
  mail,
}) => {
  test.setTimeout(180_000);
  const suffix = `${Date.now()}`;
  const creator = await createMemberSession(api, mail, `att-a-${suffix}`);
  const colleague = await createMemberSession(api, mail, `att-b-${suffix}`);
  // The org admin never joins the workspace: non-member C.
  const outsider = api;
  try {
    const workspace = await generatedApi.workspacesControllerCreate(
      { name: `Bauamt ${suffix}`, icon: 'building-2' },
      { api: creator.api },
    );
    const workspaceArtifact = await createDocument(
      creator.api,
      (await createProjectThread(creator.api, workspace.id)).id,
      'Satzung',
    );
    const personalArtifact = await createDocument(
      creator.api,
      await createChat(creator.api),
      'Notiz',
    );
    const colleaguePersonalChat = await createChat(colleague.api);
    const outsiderChat = await createChat(outsider);
    const expectRejected = async () => {
      await expect(
        attach(colleague.api, colleaguePersonalChat, personalArtifact.id),
      ).rejects.toThrow(NOT_FOUND);
      await expect(
        attach(outsider, outsiderChat, workspaceArtifact.id),
      ).rejects.toThrow(NOT_FOUND);
      await expect(
        attach(outsider, outsiderChat, personalArtifact.id),
      ).rejects.toThrow(NOT_FOUND);
    };

    await expectRejected();
    await expect(
      attach(colleague.api, colleaguePersonalChat, workspaceArtifact.id),
    ).rejects.toThrow(NOT_FOUND);

    const creatorWorkspaceChat = await createProjectThread(
      creator.api,
      workspace.id,
    );
    const creatorPersonalChat = await createChat(creator.api);
    await attach(creator.api, creatorWorkspaceChat.id, workspaceArtifact.id);
    await attach(creator.api, creatorPersonalChat, personalArtifact.id);
    expect(
      await linkedArtifactIds(creator.api, creatorPersonalChat),
    ).toEqual([personalArtifact.id]);

    await expectRejected();

    await generatedApi.workspaceMembersControllerAdd(
      workspace.id,
      { userIds: [colleague.member.id], role: 'user' },
      { api: creator.api },
    );
    const colleagueWorkspaceChat = await createProjectThread(
      colleague.api,
      workspace.id,
    );
    await expect(
      attach(colleague.api, colleagueWorkspaceChat.id, personalArtifact.id),
    ).rejects.toThrow(NOT_FOUND);
    await attach(colleague.api, colleagueWorkspaceChat.id, workspaceArtifact.id);

    expect(
      await linkedArtifactIds(colleague.api, colleagueWorkspaceChat.id),
    ).toEqual([workspaceArtifact.id]);
    expect(
      await callArtifactTool(
        colleague.api,
        colleagueWorkspaceChat.id,
        'edit_document',
        {
          artifact_id: workspaceArtifact.id,
          edits: [{ old_text: 'Entwurf', new_text: 'beschlossen' }],
          expected_version: 1,
        },
      ),
    ).toBe(ARTIFACT_WRITE_SUCCEEDED);
    expect(
      await currentArtifactContent(creator.api, workspaceArtifact.id),
    ).toEqual({ version: 2, content: '<p>Satzung beschlossen</p>' });
    await expect(
      attach(outsider, outsiderChat, workspaceArtifact.id),
    ).rejects.toThrow(NOT_FOUND);
  } finally {
    await creator.api.dispose();
    await colleague.api.dispose();
  }
});

test('offers each chat mode only its own artifacts and rejects attaching across scopes and modes: a workspace artifact to a personal chat, a personal artifact to a workspace chat, and normal and anonymous artifacts to chats of the other mode', async ({
  api,
}) => {
  const suffix = `${Date.now()}`;
  const workspace = await generatedApi.workspacesControllerCreate(
    { name: `Kämmerei ${suffix}`, icon: 'building-2' },
    { api },
  );
  const otherWorkspace = await generatedApi.workspacesControllerCreate(
    { name: `Bauhof ${suffix}`, icon: 'building-2' },
    { api },
  );
  const workspaceArtifact = await createDocument(
    api,
    (await createProjectThread(api, workspace.id)).id,
    'Haushalt',
  );
  const personalArtifact = await createDocument(
    api,
    await createChat(api),
    `Vermerk ${suffix}`,
  );
  const anonymousArtifact = await createDocument(
    api,
    await createChat(api),
    `Bescheid ${suffix}`,
  );
  await makeArtifactAnonymous({
    artifactId: anonymousArtifact.id,
    title: `Bescheid ${suffix} an {{pii:PERSON_NAME_1}}`,
    content: '<p>Sehr geehrter Herr {{pii:PERSON_NAME_1}},</p>',
    dictionary: [{ category: 'person_name', maskIndex: 1, value: 'Jonas Weber' }],
  });
  const personalChat = await createChat(api);
  const workspaceChat = (await createProjectThread(api, workspace.id)).id;
  const otherWorkspaceChat = (await createProjectThread(api, otherWorkspace.id))
    .id;
  const anonymousChat = await createChat(api, undefined, true);
  const offeredForMode = async (isAnonymous: boolean) =>
    (
      await generatedApi.artifactsControllerFindPersonal(
        { search: suffix, isAnonymous },
        { api },
      )
    ).data.map(({ id }) => id);
  expect(await offeredForMode(false)).toEqual([personalArtifact.id]);
  expect(await offeredForMode(true)).toEqual([anonymousArtifact.id]);

  await expect(
    attach(api, personalChat, workspaceArtifact.id),
  ).rejects.toThrow(OUTSIDE_SCOPE);
  await expect(
    attach(api, workspaceChat, personalArtifact.id),
  ).rejects.toThrow(OUTSIDE_SCOPE);
  await expect(
    attach(api, otherWorkspaceChat, workspaceArtifact.id),
  ).rejects.toThrow(OUTSIDE_SCOPE);
  await expect(
    attach(api, anonymousChat, personalArtifact.id),
  ).rejects.toThrow(MODE_MISMATCH);
  await expect(
    attach(api, personalChat, anonymousArtifact.id),
  ).rejects.toThrow(MODE_MISMATCH);
  for (const chat of [
    personalChat,
    workspaceChat,
    otherWorkspaceChat,
    anonymousChat,
  ]) {
    expect(await linkedArtifactIds(api, chat)).toEqual([]);
  }

  await attach(api, anonymousChat, anonymousArtifact.id);

  expect(await linkedArtifactIds(api, anonymousChat)).toEqual([
    anonymousArtifact.id,
  ]);
});
