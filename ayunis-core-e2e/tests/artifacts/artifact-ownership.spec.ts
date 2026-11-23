import type { APIRequestContext } from '@playwright/test';
import {
  callArtifactTool,
  currentArtifactContent,
  saveArtifactAsUser,
} from '../../src/clients/api/artifact-tools.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import { createChat } from '../../src/clients/api/memory.client';
import { deleteThread } from '../../src/clients/api/threads.client';
import { findArtifactOwners } from '../../src/clients/database.client';
import type { MailcatcherClient } from '../../src/clients/mailcatcher.client';
import { createMemberSession } from '../../src/factories/user.factory';
import { createProjectThread } from '../../src/factories/workspace-context.factory';
import { expect, test } from '../../src/fixtures/test';

const NOT_FOUND = /\(HTTP 404\)/;

/**
 * Creator A owns a workspace, colleague B is added to it during a test, and
 * the org admin (`api`) never joins it.
 */
async function createPrincipals(
  api: APIRequestContext,
  mail: MailcatcherClient,
) {
  const suffix = `${Date.now()}`;
  const creator = await createMemberSession(api, mail, `art-own-a-${suffix}`);
  const colleague = await createMemberSession(api, mail, `art-own-b-${suffix}`);
  const workspace = await generatedApi.workspacesControllerCreate(
    { name: `Bauamt ${suffix}`, icon: 'building-2' },
    { api: creator.api },
  );
  const addColleague = (role: 'user' | 'admin' = 'user') =>
    generatedApi.workspaceMembersControllerAdd(
      workspace.id,
      { userIds: [colleague.member.id], role },
      { api: creator.api },
    );
  const dispose = async () => {
    await creator.api.dispose();
    await colleague.api.dispose();
  };
  return { creator, colleague, workspace, addColleague, dispose };
}

async function createDocument(
  api: APIRequestContext,
  threadId: string,
  title: string,
) {
  return generatedApi.artifactsControllerCreate(
    { threadId, title, content: `<p>${title}</p>` },
    { api },
  );
}

/** Reading, editing and listing a workspace artifact, as one user. */
function workspaceArtifactRequests(
  api: APIRequestContext,
  workspaceId: string,
  artifactId: string,
) {
  const options = { api };
  return {
    read: () => generatedApi.artifactsControllerFindOne(artifactId, options),
    edit: () =>
      generatedApi.artifactsControllerUpdate(
        artifactId,
        { content: '<p>Übernommen</p>' },
        options,
      ),
    list: () =>
      generatedApi.artifactsControllerFindByWorkspace(
        workspaceId,
        undefined,
        options,
      ),
  };
}

async function expectNoAccess(
  api: APIRequestContext,
  workspaceId: string,
  artifactId: string,
) {
  for (const [label, send] of Object.entries(
    workspaceArtifactRequests(api, workspaceId, artifactId),
  )) {
    await expect(send(), label).rejects.toThrow(NOT_FOUND);
  }
}

test('lets every workspace member read, list and edit a colleague’s workspace artifact, and no one else, org admins included', async ({
  api,
  mail,
}) => {
  const { creator, colleague, workspace, addColleague, dispose } =
    await createPrincipals(api, mail);
  try {
    const chat = await createProjectThread(creator.api, workspace.id);
    const artifact = await createDocument(creator.api, chat.id, 'Bauantrag');
    expect(artifact).toMatchObject({
      ownerType: 'workspace',
      workspaceId: workspace.id,
    });

    await expectNoAccess(colleague.api, workspace.id, artifact.id);
    await expectNoAccess(api, workspace.id, artifact.id);

    await addColleague();

    const asColleague = workspaceArtifactRequests(
      colleague.api,
      workspace.id,
      artifact.id,
    );
    expect((await asColleague.list()).data.map(({ id }) => id)).toEqual([
      artifact.id,
    ]);
    expect((await asColleague.read()).versions?.[0]?.content).toBe(
      '<p>Bauantrag</p>',
    );
    await asColleague.edit();
    expect(await currentArtifactContent(creator.api, artifact.id)).toEqual({
      version: 2,
      content: '<p>Übernommen</p>',
    });
    await expectNoAccess(api, workspace.id, artifact.id);
  } finally {
    await dispose();
  }
});

test('keeps a personal artifact from everyone but its owner, even a colleague in a shared workspace', async ({
  api,
  mail,
}) => {
  const { creator, colleague, workspace, addColleague, dispose } =
    await createPrincipals(api, mail);
  try {
    await addColleague();
    const chat = await createChat(creator.api);
    const artifact = await createDocument(creator.api, chat, 'Notiz');
    expect(artifact).toMatchObject({ ownerType: 'personal' });

    await expect(
      generatedApi.artifactsControllerFindOne(artifact.id, {
        api: colleague.api,
      }),
    ).rejects.toThrow(NOT_FOUND);
    await expect(
      saveArtifactAsUser(colleague.api, artifact.id, '<p>Übernommen</p>'),
    ).rejects.toThrow(NOT_FOUND);
    expect(
      await generatedApi.artifactsControllerFindByThread(chat, {
        api: colleague.api,
      }),
    ).toEqual([]);
    expect(
      (
        await generatedApi.artifactsControllerFindByWorkspace(
          workspace.id,
          undefined,
          { api: colleague.api },
        )
      ).data,
    ).toEqual([]);
    expect(await currentArtifactContent(creator.api, artifact.id)).toEqual({
      version: 1,
      content: '<p>Notiz</p>',
    });
  } finally {
    await dispose();
  }
});

test('keeps artifacts when their chat is deleted and when their creator is deleted, unless they were the creator’s own, and deletes them with their workspace', async ({
  api,
  mail,
}) => {
  const { creator, colleague, workspace, addColleague, dispose } =
    await createPrincipals(api, mail);
  try {
    await addColleague('admin');
    const workspaceChat = await createProjectThread(creator.api, workspace.id);
    const workspaceArtifact = await createDocument(
      creator.api,
      workspaceChat.id,
      'Beschluss',
    );
    const personalChat = await createChat(creator.api);
    const personalArtifact = await createDocument(
      creator.api,
      personalChat,
      'Entwurf',
    );

    await deleteThread(creator.api, workspaceChat.id);
    await deleteThread(creator.api, personalChat);

    await expect(
      generatedApi.artifactsControllerFindOne(workspaceArtifact.id, {
        api: colleague.api,
      }),
    ).resolves.toMatchObject({ id: workspaceArtifact.id });
    await expect(
      generatedApi.artifactsControllerFindOne(personalArtifact.id, {
        api: creator.api,
      }),
    ).resolves.toMatchObject({ id: personalArtifact.id });

    await generatedApi.userControllerDeleteUser(creator.member.id, { api });

    expect(
      await findArtifactOwners([workspaceArtifact.id, personalArtifact.id]),
    ).toEqual([
      {
        id: workspaceArtifact.id,
        userId: null,
        workspaceId: workspace.id,
        creatorId: null,
      },
    ]);
    const list = await generatedApi.artifactsControllerFindByWorkspace(
      workspace.id,
      undefined,
      { api: colleague.api },
    );
    expect(list.data.map(({ id }) => id)).toEqual([workspaceArtifact.id]);

    await generatedApi.workspacesControllerRemove(workspace.id, {
      api: colleague.api,
    });

    expect(await findArtifactOwners([workspaceArtifact.id])).toEqual([]);
  } finally {
    await dispose();
  }
});

test('drops a chat’s links to its workspace’s artifacts when the chat leaves the workspace, and keeps the artifacts in the workspace', async ({
  api,
  mail,
}) => {
  test.setTimeout(120_000);
  const { creator, colleague, workspace, addColleague, dispose } =
    await createPrincipals(api, mail);
  try {
    await addColleague();
    const chat = await createProjectThread(creator.api, workspace.id);
    const artifact = await createDocument(creator.api, chat.id, 'Satzung');
    const readInChat = () =>
      callArtifactTool(creator.api, chat.id, 'read_document', {
        artifact_id: artifact.id,
      });
    const linked = async () =>
      (
        await generatedApi.artifactsControllerFindByThread(chat.id, {
          api: creator.api,
        })
      ).map(({ id }) => id);
    expect(await readInChat()).toContain('Satzung');
    expect(await linked()).toEqual([artifact.id]);

    await generatedApi.threadsControllerAssignWorkspace(
      chat.id,
      { workspaceId: null },
      { api: creator.api },
    );

    expect(await linked()).toEqual([]);
    expect(await readInChat()).toBe(
      `The tool didn't provide any result due to the following error in tool usage: Failed to execute tool read_document: Artifact with ID '${artifact.id}' not found`,
    );
    const list = await generatedApi.artifactsControllerFindByWorkspace(
      workspace.id,
      undefined,
      { api: colleague.api },
    );
    expect(list.data.map(({ id }) => id)).toEqual([artifact.id]);
  } finally {
    await dispose();
  }
});
