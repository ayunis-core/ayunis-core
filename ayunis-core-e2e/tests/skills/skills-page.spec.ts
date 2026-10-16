import type { APIRequestContext, Browser, Page } from '@playwright/test';
import { test, expect } from '../../src/fixtures/test';
import { generatedApi } from '../../src/clients/api/generated-api';
import {
  requestCreateKnowledgeBase,
  requestCreateSkill,
  requestDeleteKnowledgeBase,
  requestDeleteSkill,
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

async function openAs(browser: Browser, member: SignedInMember): Promise<Page> {
  const context = await browser.newContext({
    storageState: member.storageState,
  });
  return context.newPage();
}

async function teamWithAdmin(
  api: APIRequestContext,
  name: string,
  admin: SignedInMember,
) {
  const team = await createTeam(api, name);
  await addTeamMember(api, team.id, admin.id);
  await requestSetTeamAdmin(api, team.id, admin.id, true);
  return team;
}

test('members see their own items and the items of their teams and the organisation, grouped and searchable', async ({
  api,
  mail,
  browser,
  page,
}) => {
  test.setTimeout(120_000);
  const suffix = `skills-page-${Date.now()}`;
  const originalRights = await getTeamAdminPermissions(api);
  const people: SignedInMember[] = [];
  const teamIds: string[] = [];
  const skills: { api: APIRequestContext; id: string }[] = [];
  const knowledgeBases: string[] = [];
  const pages: Page[] = [];

  try {
    await setTeamAdminPermissions(api, [
      ...new Set([
        ...originalRights,
        'team_manage_skills' as const,
        'team_manage_knowledge' as const,
      ]),
    ]);
    const signIn = async (name: string) => {
      const person = await createSignedInMember(api, mail, `${suffix}-${name}`);
      people.push(person);
      return person;
    };
    const adminX = await signIn('x-admin');
    const adminY = await signIn('y-admin');
    const member = await signIn('member');
    const other = await signIn('other');
    const teamX = await teamWithAdmin(api, `Bauamt ${suffix}`, adminX);
    teamIds.push(teamX.id);
    const teamY = await teamWithAdmin(api, `Kämmerei ${suffix}`, adminY);
    teamIds.push(teamY.id);
    await addTeamMember(api, teamX.id, member.id);
    const memberPage = await openAs(browser, member);
    pages.push(memberPage);

    const ownSkill = await idOf(
      await requestCreateSkill(member.api, { ownerType: 'personal' }, `Notiz ${suffix}`),
    );
    const otherSkill = await idOf(
      await requestCreateSkill(other.api, { ownerType: 'personal' }, `Privat ${suffix}`),
    );
    const teamXSkill = await idOf(
      await requestCreateSkill(adminX.api, { ownerType: 'team', teamId: teamX.id }, `Bauantrag ${suffix}`),
    );
    const teamYSkill = await idOf(
      await requestCreateSkill(adminY.api, { ownerType: 'team', teamId: teamY.id }, `Haushalt ${suffix}`),
    );
    const orgSkill = await idOf(
      await requestCreateSkill(api, { ownerType: 'org' }, `Dienstanweisung ${suffix}`),
    );
    skills.push(
      { api: member.api, id: ownSkill },
      { api: other.api, id: otherSkill },
      { api, id: teamXSkill },
      { api, id: teamYSkill },
      { api, id: orgSkill },
    );
    knowledgeBases.push(
      await idOf(
        await requestCreateKnowledgeBase(adminX.api, { ownerType: 'team', teamId: teamX.id }, `Merkblätter ${suffix}`),
      ),
    );

    await memberPage.goto('/skills');
    await expect(memberPage.getByTestId(`skill-card-${ownSkill}`)).toBeVisible();
    await expect(memberPage.getByTestId(`skill-card-${otherSkill}`)).toHaveCount(0);

    await memberPage.getByTestId('skills-tab-shared').click();
    await expect(memberPage).toHaveURL(/tab=shared/);
    const sectionX = memberPage.getByTestId(`skills-section-team:${teamX.id}`);
    await expect(sectionX.getByTestId(`skill-card-${teamXSkill}`)).toBeVisible();
    await expect(sectionX.getByTestId(`skill-active-${teamXSkill}`)).toBeVisible();
    await expect(
      memberPage.getByTestId('skills-section-org').getByTestId(`skill-card-${orgSkill}`),
    ).toBeVisible();
    await expect(memberPage.getByTestId(`skills-section-team:${teamY.id}`)).toHaveCount(0);
    await expect(memberPage.getByTestId(`skill-card-${teamYSkill}`)).toHaveCount(0);
    await expect(memberPage.getByTestId(`skill-card-${otherSkill}`)).toHaveCount(0);

    await memberPage.getByTestId('skills-search').fill(`  ${suffix.toUpperCase()} `);
    await expect(memberPage.getByTestId('skills-tab-own-count')).toHaveText('1');
    await expect(memberPage.getByTestId('skills-tab-shared-count')).toHaveText('2');
    await memberPage.getByTestId('skills-search').fill(`nichts-${suffix}`);
    await expect(memberPage.getByTestId('skills-tab-shared-count')).toHaveText('0');

    await memberPage.goto('/skills?tab=requests');
    await expect(memberPage.getByTestId('skills-tab-own')).toHaveAttribute(
      'data-state',
      'active',
    );
    await expect(memberPage.getByTestId('skills-tab-requests')).toHaveCount(0);

    await memberPage.goto(`/skills/${orgSkill}`);
    await expect(memberPage.getByTestId('read-only-badge')).toBeVisible();
    await expect(memberPage.getByTestId('skill-detail-delete')).toHaveCount(0);
    await page.goto(`/skills/${orgSkill}`);
    await expect(page.getByTestId('ownership-card')).toBeVisible();
    await expect(page.getByTestId('read-only-badge')).toHaveCount(0);
    await expect(page.getByTestId('skill-detail-delete')).toBeVisible();

    await memberPage.goto('/knowledge-bases?tab=shared');
    await expect(
      memberPage
        .getByTestId(`knowledge-bases-section-team:${teamX.id}`)
        .getByTestId(`knowledge-base-card-${knowledgeBases[0]}`),
    ).toBeVisible();
  } finally {
    await setTeamAdminPermissions(api, originalRights);
    for (const skill of skills) await requestDeleteSkill(skill.api, skill.id);
    for (const id of knowledgeBases) await requestDeleteKnowledgeBase(api, id);
    for (const id of teamIds) await deleteTeam(api, id);
    for (const person of people) {
      await generatedApi.userControllerDeleteUser(person.id, { api });
      await person.api.dispose();
    }
    for (const openPage of pages) await openPage.context().close();
  }
});
