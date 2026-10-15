import type { APIRequestContext } from '@playwright/test';
import { test, expect } from '../../src/fixtures/test';
import { generatedApi } from '../../src/clients/api/generated-api';
import {
  requestCreateKnowledgeBase,
  requestCreateSkill,
  requestDeleteKnowledgeBase,
  requestDeleteSkill,
  requestGetKnowledgeBase,
  requestGetSkill,
  requestListPersonalSkills,
  requestSetSkillActivation,
  requestSkillOwnerOptions,
  requestUpdateSkill,
} from '../../src/clients/api/owned-resources.client';
import {
  getTeamAdminPermissions,
  setTeamAdminPermissions,
} from '../../src/clients/api/role-permissions.client';
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  requestDeleteTeam,
  requestSetTeamAdmin,
} from '../../src/clients/api/teams.client';
import {
  createSignedInMember,
  type SignedInMember,
} from '../../src/factories/user.factory';

async function listedSkillIds(api: APIRequestContext): Promise<string[]> {
  const response = await requestListPersonalSkills(api);
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { data: { id: string }[] };
  return body.data.map(({ id }) => id);
}

async function removeUsers(
  admin: APIRequestContext,
  members: SignedInMember[],
): Promise<void> {
  for (const member of members) {
    await generatedApi.userControllerDeleteUser(member.id, { api: admin });
    await member.api.dispose();
  }
}

test('a team skill is usable by its team, editable by its team admin and hidden from others', async ({
  api,
  mail,
}) => {
  test.setTimeout(120_000);
  const suffix = `team-ownership-${Date.now()}`;
  const originalRights = await getTeamAdminPermissions(api);
  const team = await createTeam(api, `Bauamt ${suffix}`);
  const teamAdmin = await createSignedInMember(api, mail, `${suffix}-admin`);
  const member = await createSignedInMember(api, mail, `${suffix}-member`);
  const outsider = await createSignedInMember(api, mail, `${suffix}-out`);
  await addTeamMember(api, team.id, teamAdmin.id);
  await addTeamMember(api, team.id, member.id);
  await requestSetTeamAdmin(api, team.id, teamAdmin.id, true);
  await setTeamAdminPermissions(api, [
    ...new Set([...originalRights, 'team_manage_skills' as const]),
  ]);
  let skillId: string | undefined;

  try {
    const options = await requestSkillOwnerOptions(teamAdmin.api);
    expect(await options.json()).toMatchObject({
      options: [{ type: 'personal' }, { type: 'team', teamId: team.id }],
    });
    expect(
      (await requestCreateSkill(member.api, { ownerType: 'team', teamId: team.id }, `Verboten ${suffix}`)).status(),
    ).toBe(403);

    const created = await requestCreateSkill(
      teamAdmin.api,
      { ownerType: 'team', teamId: team.id },
      `Bauantrag ${suffix}`,
    );
    expect(created.status()).toBe(201);
    skillId = ((await created.json()) as { id: string }).id;

    const asMember = await requestGetSkill(member.api, skillId);
    expect(asMember.status()).toBe(200);
    expect(await asMember.json()).toMatchObject({
      ownerType: 'team',
      teamId: team.id,
      isActive: true,
      viewer: { canUse: true, canEdit: false, canDelete: false },
      ownerDescription: { teamEditors: [{ userId: teamAdmin.id }] },
    });
    expect(await listedSkillIds(member.api)).toContain(skillId);
    expect(
      (await requestUpdateSkill(member.api, skillId, `Geändert ${suffix}`)).status(),
    ).toBe(403);
    expect((await requestDeleteSkill(member.api, skillId)).status()).toBe(403);
    const deactivated = await requestSetSkillActivation(member.api, skillId, false);
    expect(await deactivated.json()).toMatchObject({ isActive: false });
    expect(await (await requestGetSkill(teamAdmin.api, skillId)).json()).toMatchObject(
      { isActive: true, viewer: { canEdit: true } },
    );

    expect((await requestGetSkill(outsider.api, skillId)).status()).toBe(404);
    expect(await listedSkillIds(outsider.api)).not.toContain(skillId);

    const asAdmin = await requestGetSkill(api, skillId);
    expect(await asAdmin.json()).toMatchObject({
      viewer: { canUse: false, canEdit: true },
    });

    const blocked = await requestDeleteTeam(api, team.id);
    expect(blocked.status()).toBe(409);
    expect(await blocked.json()).toMatchObject({ code: 'TEAM_OWNS_RESOURCES' });

    expect((await requestDeleteSkill(teamAdmin.api, skillId)).status()).toBe(204);
    skillId = undefined;
  } finally {
    if (skillId) await requestDeleteSkill(api, skillId);
    await setTeamAdminPermissions(api, originalRights);
    await deleteTeam(api, team.id);
    await removeUsers(api, [teamAdmin, member, outsider]);
  }
});

test('an organisation knowledge base is usable but read-only for members', async ({
  api,
  mail,
}) => {
  const suffix = `org-knowledge-${Date.now()}`;
  const member = await createSignedInMember(api, mail, `${suffix}-member`);
  let knowledgeBaseId: string | undefined;

  try {
    expect(
      (await requestCreateKnowledgeBase(member.api, { ownerType: 'org' }, `Verboten ${suffix}`)).status(),
    ).toBe(403);

    const created = await requestCreateKnowledgeBase(
      api,
      { ownerType: 'org' },
      `Dienstanweisungen ${suffix}`,
    );
    expect(created.status()).toBe(201);
    knowledgeBaseId = ((await created.json()) as { id: string }).id;

    const asMember = await requestGetKnowledgeBase(member.api, knowledgeBaseId);
    expect(asMember.status()).toBe(200);
    expect(await asMember.json()).toMatchObject({
      ownerType: 'org',
      isActive: true,
      viewer: { canUse: true, canEdit: false },
    });
    expect(
      (await requestDeleteKnowledgeBase(member.api, knowledgeBaseId)).status(),
    ).toBe(403);
  } finally {
    if (knowledgeBaseId) {
      await requestDeleteKnowledgeBase(api, knowledgeBaseId);
    }
    await removeUsers(api, [member]);
  }
});
