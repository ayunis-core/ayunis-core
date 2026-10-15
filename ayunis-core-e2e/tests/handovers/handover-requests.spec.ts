import type { APIRequestContext } from '@playwright/test';
import { test, expect } from '../../src/fixtures/test';
import { generatedApi } from '../../src/clients/api/generated-api';
import {
  requestCreateHandover,
  requestDecideHandover,
  requestHandoverSummary,
  requestListHandovers,
  requestWithdrawHandover,
} from '../../src/clients/api/handovers.client';
import {
  requestCreateKnowledgeBase,
  requestCreateSkill,
  requestDeleteKnowledgeBase,
  requestDeleteSkill,
  requestGetKnowledgeBase,
  requestGetSkill,
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
  requestSetTeamAdmin,
} from '../../src/clients/api/teams.client';
import {
  createSignedInMember,
  type SignedInMember,
} from '../../src/factories/user.factory';

async function idOf(response: { json: () => Promise<unknown> }) {
  return ((await response.json()) as { id: string }).id;
}

async function inboxIds(
  api: APIRequestContext,
  kind: 'skill' | 'knowledge_base',
): Promise<string[]> {
  const response = await requestListHandovers(api, kind);
  expect(response.status()).toBe(200);
  return ((await response.json()) as { id: string }[]).map(({ id }) => id);
}

test('a team admin approves a handover to the team; others never see the request', async ({
  api,
  mail,
}) => {
  test.setTimeout(120_000);
  const suffix = `handover-${Date.now()}`;
  const originalRights = await getTeamAdminPermissions(api);
  const team = await createTeam(api, `Bauamt ${suffix}`);
  const requester = await createSignedInMember(api, mail, `${suffix}-lena`);
  const reviewer = await createSignedInMember(api, mail, `${suffix}-jonas`);
  const outsider = await createSignedInMember(api, mail, `${suffix}-nina`);
  await addTeamMember(api, team.id, requester.id);
  await addTeamMember(api, team.id, reviewer.id);
  await requestSetTeamAdmin(api, team.id, reviewer.id, true);
  await setTeamAdminPermissions(api, [
    ...new Set([...originalRights, 'team_review_requests' as const]),
  ]);
  const people: SignedInMember[] = [requester, reviewer, outsider];
  let skillId = '';

  try {
    skillId = await idOf(
      await requestCreateSkill(
        requester.api,
        { ownerType: 'personal' },
        `Protokoll ${suffix}`,
      ),
    );
    expect((await requestGetSkill(reviewer.api, skillId)).status()).toBe(404);

    const created = await requestCreateHandover(requester.api, 'skill', skillId, {
      teamId: team.id,
    });
    expect(created.status()).toBe(201);
    const request = (await created.json()) as { id: string; status: string };
    expect(request.status).toBe('pending');
    expect(
      (
        await requestCreateHandover(requester.api, 'skill', skillId, 'org')
      ).status(),
    ).toBe(409);

    expect((await requestGetSkill(reviewer.api, skillId)).status()).toBe(200);
    expect(
      (await requestUpdateSkill(reviewer.api, skillId, `Geändert ${suffix}`)).status(),
    ).toBe(404);
    expect(await inboxIds(reviewer.api, 'skill')).toContain(request.id);
    expect(
      ((await (await requestHandoverSummary(reviewer.api)).json()) as {
        canReviewSkills: boolean;
      }).canReviewSkills,
    ).toBe(true);
    expect(await inboxIds(outsider.api, 'skill')).not.toContain(request.id);
    expect((await requestGetSkill(outsider.api, skillId)).status()).toBe(404);

    expect(
      (await requestDecideHandover(reviewer.api, request.id, 'approve')).status(),
    ).toBe(200);
    expect(
      (await requestDecideHandover(api, request.id, 'approve')).status(),
    ).toBe(409);

    const afterApproval = await requestGetSkill(requester.api, skillId);
    expect(await afterApproval.json()).toMatchObject({
      ownerType: 'team',
      teamId: team.id,
      viewer: { canUse: true, canEdit: false },
      ownerDescription: { submittedBy: { userId: requester.id } },
    });
    expect(
      (await requestUpdateSkill(requester.api, skillId, `Geändert ${suffix}`)).status(),
    ).toBe(403);
  } finally {
    if (skillId) await requestDeleteSkill(api, skillId);
    await setTeamAdminPermissions(api, originalRights);
    await deleteTeam(api, team.id);
    for (const person of people) {
      await generatedApi.userControllerDeleteUser(person.id, { api });
      await person.api.dispose();
    }
  }
});

test('only admins and review-all holders decide requests to the organisation; the requester can withdraw', async ({
  api,
  mail,
}) => {
  const suffix = `handover-org-${Date.now()}`;
  const requester = await createSignedInMember(api, mail, `${suffix}-lena`);
  const colleague = await createSignedInMember(api, mail, `${suffix}-tobias`);
  let knowledgeBaseId = '';

  try {
    knowledgeBaseId = await idOf(
      await requestCreateKnowledgeBase(
        requester.api,
        { ownerType: 'personal' },
        `Kassenprüfung ${suffix}`,
      ),
    );
    const created = await requestCreateHandover(
      requester.api,
      'knowledge_base',
      knowledgeBaseId,
      'org',
    );
    expect(created.status()).toBe(201);
    const request = (await created.json()) as { id: string };

    expect(
      (await requestDecideHandover(colleague.api, request.id, 'approve')).status(),
    ).toBe(403);
    expect(
      (await requestWithdrawHandover(colleague.api, request.id)).status(),
    ).toBe(403);
    expect(await inboxIds(api, 'knowledge_base')).toContain(request.id);
    expect(
      (await requestGetKnowledgeBase(api, knowledgeBaseId)).status(),
    ).toBe(200);

    expect(
      (await requestWithdrawHandover(requester.api, request.id)).status(),
    ).toBe(204);
    expect(await inboxIds(api, 'knowledge_base')).not.toContain(request.id);
    expect(
      (await requestGetKnowledgeBase(api, knowledgeBaseId)).status(),
    ).toBe(404);
  } finally {
    if (knowledgeBaseId) {
      await requestDeleteKnowledgeBase(requester.api, knowledgeBaseId);
    }
    for (const person of [requester, colleague]) {
      await generatedApi.userControllerDeleteUser(person.id, { api });
      await person.api.dispose();
    }
  }
});

test('an admin hands an own skill over to the organisation at once', async ({
  api,
}) => {
  const name = `Direkt ${Date.now()}`;
  const skillId = await idOf(
    await requestCreateSkill(api, { ownerType: 'personal' }, name),
  );

  try {
    const created = await requestCreateHandover(api, 'skill', skillId, 'org');
    expect(created.status()).toBe(201);
    expect(await created.json()).toMatchObject({ status: 'approved' });
    expect(await (await requestGetSkill(api, skillId)).json()).toMatchObject({
      ownerType: 'org',
    });
  } finally {
    await requestDeleteSkill(api, skillId);
  }
});
