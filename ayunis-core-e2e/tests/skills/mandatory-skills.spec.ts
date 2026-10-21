import type { APIRequestContext } from '@playwright/test';
import { test, expect } from '../../src/fixtures/test';
import { generatedApi } from '../../src/clients/api/generated-api';
import {
  requestCreateSkill,
  requestDeleteSkill,
  requestGetSkill,
  requestSetSkillActivation,
  requestSetSkillMandatory,
  requestSetSkillPin,
} from '../../src/clients/api/owned-resources.client';
import {
  createPersonalThread,
  createProjectThread,
} from '../../src/factories/workspace-context.factory';
import { createSignedInMember } from '../../src/factories/user.factory';

async function idOf(response: { json: () => Promise<unknown> }) {
  return ((await response.json()) as { id: string }).id;
}

async function contextSkillIds(api: APIRequestContext, threadId: string) {
  const context = await generatedApi.threadAiContextControllerGetAiContext(
    threadId,
    { api },
  );
  return context.skills.map(({ id }) => id);
}

test('an organisation skill made mandatory is always active outside workspaces and cannot be switched off', async ({
  api,
  mail,
}) => {
  test.setTimeout(120_000);
  const suffix = `mandatory-${Date.now()}`;
  const member = await createSignedInMember(api, mail, `${suffix}-lena`);
  let skillId = '';

  try {
    skillId = await idOf(
      await requestCreateSkill(api, { ownerType: 'org' }, `Datenschutz ${suffix}`),
    );
    const workspace = await generatedApi.workspacesControllerCreate(
      { name: `Projekt ${suffix}`, description: '', icon: 'building-2' },
      { api: member.api },
    );
    const personalThread = await createPersonalThread(member.api);
    const workspaceThread = await createProjectThread(member.api, workspace.id);

    await requestSetSkillActivation(member.api, skillId, false);
    expect(await contextSkillIds(member.api, personalThread.id)).not.toContain(skillId);
    expect(
      (await requestSetSkillMandatory(member.api, skillId, true)).status(),
    ).toBe(403);

    const made = await requestSetSkillMandatory(api, skillId, true);
    expect(made.status()).toBe(200);
    expect(await made.json()).toMatchObject({ isMandatory: true, isActive: true });

    expect(await (await requestGetSkill(member.api, skillId)).json()).toMatchObject({
      isMandatory: true,
      isActive: true,
    });
    expect(
      (await requestSetSkillActivation(member.api, skillId, false)).status(),
    ).toBe(409);
    expect(await contextSkillIds(member.api, personalThread.id)).toContain(skillId);
    expect(await contextSkillIds(member.api, workspaceThread.id)).not.toContain(
      skillId,
    );

    await requestSetSkillMandatory(api, skillId, false);
    expect(await (await requestGetSkill(member.api, skillId)).json()).toMatchObject({
      isMandatory: false,
      isActive: false,
    });
    expect(await contextSkillIds(member.api, personalThread.id)).not.toContain(skillId);
  } finally {
    if (skillId) await requestDeleteSkill(api, skillId);
    await generatedApi.userControllerDeleteUser(member.id, { api });
    await member.api.dispose();
  }
});

test('a switched-off organisation skill stays pinned once it is mandatory', async ({
  api,
  mail,
}) => {
  test.setTimeout(120_000);
  const suffix = `mandatory-pin-${Date.now()}`;
  const member = await createSignedInMember(api, mail, `${suffix}-jonas`);
  let skillId = '';

  try {
    skillId = await idOf(
      await requestCreateSkill(api, { ownerType: 'org' }, `Vergabe ${suffix}`),
    );
    await requestSetSkillActivation(member.api, skillId, false);
    await requestSetSkillMandatory(api, skillId, true);

    expect((await requestSetSkillPin(member.api, skillId, true)).status()).toBe(
      200,
    );
    expect(await (await requestGetSkill(member.api, skillId)).json()).toMatchObject({
      isMandatory: true,
      isPinned: true,
    });

    await requestSetSkillMandatory(api, skillId, false);
    expect(await (await requestGetSkill(member.api, skillId)).json()).toMatchObject({
      isMandatory: false,
      isActive: true,
      isPinned: true,
    });
  } finally {
    if (skillId) await requestDeleteSkill(api, skillId);
    await generatedApi.userControllerDeleteUser(member.id, { api });
    await member.api.dispose();
  }
});

test('personal skills cannot be made mandatory', async ({ api }) => {
  const personalId = await idOf(
    await requestCreateSkill(
      api,
      { ownerType: 'personal' },
      `Notiz mandatory-${Date.now()}`,
    ),
  );

  try {
    const response = await requestSetSkillMandatory(api, personalId, true);
    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'SKILL_NOT_ORG_OWNED' });
  } finally {
    await requestDeleteSkill(api, personalId);
  }
});
