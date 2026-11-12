import { randomUUID } from 'node:crypto';
import { getAuthenticatedPrincipalId } from '../../src/clients/api/auth.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import {
  createRecording,
  getRecording,
  requestRecording,
} from '../../src/clients/api/recordings.client';
import {
  addTeamMember,
  createTeam,
  deleteTeam,
} from '../../src/clients/api/teams.client';
import { createMemberSession } from '../../src/factories/user.factory';
import { test, expect } from '../../src/fixtures/test';

test('deleting a team or workspace deletes its recordings', async ({ api }) => {
  const key = randomUUID().slice(0, 8);
  const team = await createTeam(api, `Jugendhilfe ${key}`);
  await addTeamMember(api, team.id, await getAuthenticatedPrincipalId(api));
  const workspace = await generatedApi.workspacesControllerCreate(
    { name: `Jugendhilfe ${key}`, icon: 'building-2' },
    { api },
  );
  const teamRecording = await createRecording(api, {
    ownerType: 'team',
    teamId: team.id,
    name: `Jugendhilfeausschuss ${key}`,
  });
  const workspaceRecording = await createRecording(api, {
    ownerType: 'workspace',
    workspaceId: workspace.id,
    name: `Vorbesprechung ${key}`,
  });

  await deleteTeam(api, team.id);
  await generatedApi.workspacesControllerRemove(workspace.id, { api });

  expect((await requestRecording(api, teamRecording.id)).status()).toBe(404);
  expect((await requestRecording(api, workspaceRecording.id)).status()).toBe(
    404,
  );
});

test('deleting the creator keeps their team and organization recordings', async ({
  api,
  mail,
}) => {
  const key = randomUUID().slice(0, 8);
  const team = await createTeam(api, `Kulturausschuss ${key}`);
  const creator = await createMemberSession(api, mail, `rec-creator-${key}`);
  try {
    await addTeamMember(api, team.id, creator.member.id);
    const teamRecording = await createRecording(creator.api, {
      ownerType: 'team',
      teamId: team.id,
      name: `Kulturausschuss ${key}`,
    });
    const orgRecording = await createRecording(creator.api, {
      ownerType: 'org',
      name: `Bürgerversammlung ${key}`,
    });
    expect(await getRecording(api, orgRecording.id)).toMatchObject({
      creatorName: creator.member.name,
    });

    await generatedApi.userControllerDeleteUser(creator.member.id, { api });

    // Team recordings are readable for team members only.
    await addTeamMember(api, team.id, await getAuthenticatedPrincipalId(api));
    for (const recording of [teamRecording, orgRecording]) {
      expect(await getRecording(api, recording.id)).toMatchObject({
        id: recording.id,
        creatorName: null,
      });
    }
  } finally {
    await creator.api.dispose();
    await deleteTeam(api, team.id);
  }
});
