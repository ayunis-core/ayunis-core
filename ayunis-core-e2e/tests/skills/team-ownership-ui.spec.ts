import type { Browser, Page } from '@playwright/test';
import { test, expect } from '../../src/fixtures/test';
import { generatedApi } from '../../src/clients/api/generated-api';
import { requestDeleteSkill } from '../../src/clients/api/owned-resources.client';
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

async function openAs(browser: Browser, member: SignedInMember): Promise<Page> {
  const context = await browser.newContext({
    storageState: member.storageState,
  });
  return context.newPage();
}

async function createTeamSkillInDialog(
  page: Page,
  teamId: string,
  name: string,
): Promise<string> {
  await page.goto('/skills');
  await page.getByTestId('create-skill-menu').first().click();
  await page.getByTestId('create-skill-editor').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByTestId('owner-field').click();
  await page.getByTestId(`owner-option-team:${teamId}`).click();
  const fields = dialog.getByRole('textbox');
  await fields.nth(0).fill(name);
  await fields.nth(1).fill('Wenn ein Bauantrag geprüft werden soll.');
  await fields.nth(2).fill('Prüfe die Unterlagen auf Vollständigkeit.');
  await dialog.getByTestId('create-entity-submit').click();
  await expect(page).toHaveURL(/\/skills\/[0-9a-f-]{36}$/);
  return page.url().split('/').at(-1) ?? '';
}

async function openTeamAndOrganisationTab(page: Page): Promise<void> {
  await page.goto('/skills?tab=shared');
  await expect(page.getByTestId('create-skill-menu').first()).toBeVisible();
}

test('members see a team skill read-only and people outside the team do not see it', async ({
  api,
  mail,
  browser,
}) => {
  test.setTimeout(120_000);
  const suffix = `team-skill-ui-${Date.now()}`;
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
  const teamAdminPage = await openAs(browser, teamAdmin);
  const memberPage = await openAs(browser, member);
  const outsiderPage = await openAs(browser, outsider);
  let skillId = '';

  try {
    skillId = await createTeamSkillInDialog(
      teamAdminPage,
      team.id,
      `Bauantrag ${suffix}`,
    );
    await expect(teamAdminPage.getByTestId('ownership-card')).toContainText(
      team.name,
    );
    await expect(teamAdminPage.getByTestId('read-only-badge')).toHaveCount(0);

    await openTeamAndOrganisationTab(memberPage);
    await expect(
      memberPage.getByTestId(`skill-owner-${skillId}`),
    ).toContainText(team.name);
    await memberPage.getByTestId(`skill-card-${skillId}`).click();
    await expect(memberPage.getByTestId('read-only-badge')).toBeVisible();
    await expect(memberPage.getByTestId('ownership-card')).toBeVisible();
    await expect(
      memberPage.getByTestId('skill-read-only-content'),
    ).toBeVisible();
    await expect(memberPage.getByTestId('skill-detail-delete')).toHaveCount(0);
    await expect(memberPage.getByTestId('skill-detail-active')).toBeVisible();

    await openTeamAndOrganisationTab(outsiderPage);
    await expect(outsiderPage.getByTestId(`skill-card-${skillId}`)).toHaveCount(
      0,
    );
  } finally {
    if (skillId) await requestDeleteSkill(api, skillId);
    await setTeamAdminPermissions(api, originalRights);
    await deleteTeam(api, team.id);
    for (const page of [teamAdminPage, memberPage, outsiderPage]) {
      await page.context().close();
    }
    for (const person of [teamAdmin, member, outsider]) {
      await generatedApi.userControllerDeleteUser(person.id, { api });
      await person.api.dispose();
    }
  }
});
