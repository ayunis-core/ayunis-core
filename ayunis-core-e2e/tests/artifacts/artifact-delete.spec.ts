import type { APIRequestContext } from '@playwright/test';
import { callArtifactTool } from '../../src/clients/api/artifact-tools.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import {
  countArtifactRows,
  linkArtifactToChat,
} from '../../src/clients/artifacts.database.client';
import { createMemberSession } from '../../src/factories/user.factory';
import { createProjectThread } from '../../src/factories/workspace-context.factory';
import { expect, test } from '../../src/fixtures/test';

const FORBIDDEN = /\(HTTP 403\)/;
const NOT_FOUND = /\(HTTP 404\)/;

function deleteArtifact(api: APIRequestContext, artifactId: string) {
  return generatedApi.artifactsControllerDelete(artifactId, { api });
}

async function linkedArtifactIds(api: APIRequestContext, threadId: string) {
  const artifacts = await generatedApi.artifactsControllerFindByThread(
    threadId,
    { api },
  );
  return artifacts.map(({ id }) => id);
}

test('lets the creator and members who may manage the workspace delete a workspace artifact, rejects other members and hides it from non-members, and removes it from every chat and the model’s tools', async ({
  api,
  mail,
}) => {
  test.setTimeout(180_000);
  const suffix = `${Date.now()}`;
  const owner = await createMemberSession(api, mail, `art-del-o-${suffix}`);
  const creator = await createMemberSession(api, mail, `art-del-a-${suffix}`);
  const colleague = await createMemberSession(api, mail, `art-del-b-${suffix}`);
  const manager = await createMemberSession(api, mail, `art-del-m-${suffix}`);
  try {
    const workspace = await generatedApi.workspacesControllerCreate(
      { name: `Löschen ${suffix}`, icon: 'building-2' },
      { api: owner.api },
    );
    for (const [session, role] of [
      [creator, 'user'],
      [colleague, 'user'],
      [manager, 'manager'],
    ] as const) {
      await generatedApi.workspaceMembersControllerAdd(
        workspace.id,
        { userIds: [session.member.id], role },
        { api: owner.api },
      );
    }
    const creatorChat = await createProjectThread(creator.api, workspace.id);
    const colleagueChat = await createProjectThread(
      colleague.api,
      workspace.id,
    );
    const artifact = await generatedApi.artifactsControllerCreate(
      {
        threadId: creatorChat.id,
        title: `Vorlage ${suffix}`,
        content: '<p>Vorlage</p>',
      },
      { api: creator.api },
    );
    await linkArtifactToChat(colleagueChat.id, artifact.id);
    const readInChat = () =>
      callArtifactTool(creator.api, creatorChat.id, 'read_document', {
        artifact_id: artifact.id,
      });
    expect(await linkedArtifactIds(creator.api, creatorChat.id)).toEqual([
      artifact.id,
    ]);
    expect(await linkedArtifactIds(colleague.api, colleagueChat.id)).toEqual([
      artifact.id,
    ]);
    expect(await readInChat()).toContain('Vorlage');

    await expect(deleteArtifact(api, artifact.id)).rejects.toThrow(NOT_FOUND);
    await expect(deleteArtifact(colleague.api, artifact.id)).rejects.toThrow(
      FORBIDDEN,
    );
    expect(await countArtifactRows(artifact.id)).toEqual({
      artifacts: 1,
      versions: 1,
      links: 2,
    });

    await deleteArtifact(creator.api, artifact.id);

    expect(await countArtifactRows(artifact.id)).toEqual({
      artifacts: 0,
      versions: 0,
      links: 0,
    });
    expect(await linkedArtifactIds(creator.api, creatorChat.id)).toEqual([]);
    expect(await linkedArtifactIds(colleague.api, colleagueChat.id)).toEqual(
      [],
    );
    expect(await readInChat()).toBe(
      `The tool didn't provide any result due to the following error in tool usage: Failed to execute tool read_document: Artifact with ID '${artifact.id}' not found`,
    );
    await expect(
      generatedApi.artifactsControllerFindOne(artifact.id, {
        api: creator.api,
      }),
    ).rejects.toThrow(NOT_FOUND);

    const second = await generatedApi.artifactsControllerCreate(
      {
        threadId: creatorChat.id,
        title: `Zweite Vorlage ${suffix}`,
        content: '<p>Zweite Vorlage</p>',
      },
      { api: creator.api },
    );
    await expect(deleteArtifact(colleague.api, second.id)).rejects.toThrow(
      FORBIDDEN,
    );
    await deleteArtifact(manager.api, second.id);
    expect((await countArtifactRows(second.id)).artifacts).toBe(0);
  } finally {
    for (const session of [owner, creator, colleague, manager]) {
      await session.api.dispose();
    }
  }
});
