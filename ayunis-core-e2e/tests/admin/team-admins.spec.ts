import { test, expect } from '../../src/fixtures/test';
import { generatedApi } from '../../src/clients/api/generated-api';
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  requestGetTeam,
  requestListTeams,
  requestSetTeamAdmin,
} from '../../src/clients/api/teams.client';
import { createSignedInMember } from '../../src/factories/user.factory';
import type { TeamResponseDto } from '../../src/clients/generated/ayunisCoreAPI.schemas';

test('a team admin manages only their own team and cannot leave it without one', async ({
  page,
  api,
  mail,
  browser,
}) => {
  test.setTimeout(120_000);
  const suffix = `team-admin-${Date.now()}`;
  const ownTeam = await createTeam(api, `Bauamt ${suffix}`);
  const otherTeam = await createTeam(api, `Kämmerei ${suffix}`);
  const teamAdmin = await createSignedInMember(api, mail, `${suffix}-admin`);
  const colleague = await createSignedInMember(api, mail, `${suffix}-member`);
  await addTeamMember(api, ownTeam.id, teamAdmin.id);
  await addTeamMember(api, ownTeam.id, colleague.id);
  await addTeamMember(api, otherTeam.id, teamAdmin.id);
  const teamAdminContext = await browser.newContext({
    storageState: teamAdmin.storageState,
  });
  const teamAdminPage = await teamAdminContext.newPage();
  const roleOf = (userId: string) =>
    teamAdminPage.getByTestId(`team-member-role-${userId}`);

  try {
    expect((await requestListTeams(teamAdmin.api)).status()).toBe(403);
    await teamAdminPage.goto('/');
    await teamAdminPage.getByTestId('menu').click();
    await expect(teamAdminPage.getByRole('menuitem').first()).toBeVisible();
    await expect(teamAdminPage.getByTestId('menu-organisation')).toHaveCount(0);

    await page.goto(`/admin-settings/teams/${ownTeam.id}`);
    await page.getByTestId(`team-member-role-${teamAdmin.id}`).click();
    await page.getByRole('option', { name: 'Team-Admin' }).click();
    await expect
      .poll(async () => (await requestListTeams(teamAdmin.api)).status())
      .toBe(200);

    const teams = (await (
      await requestListTeams(teamAdmin.api)
    ).json()) as TeamResponseDto[];
    expect(teams.map((team) => team.id)).toEqual([ownTeam.id]);
    expect(teams[0].teamAdmins?.map((admin) => admin.userId)).toEqual([
      teamAdmin.id,
    ]);
    expect((await requestGetTeam(teamAdmin.api, otherTeam.id)).status()).toBe(
      403,
    );

    await teamAdminPage.goto('/admin-settings/users');
    await expect(teamAdminPage).toHaveURL(/\/admin-settings\/teams$/);
    await expect(
      teamAdminPage.getByTestId(`team-admins-${ownTeam.id}`),
    ).toBeVisible();
    await expect(
      teamAdminPage.getByTestId(`team-admins-${otherTeam.id}`),
    ).toHaveCount(0);
    await teamAdminPage.goto(`/admin-settings/teams/${otherTeam.id}`);
    await expect(teamAdminPage.getByTestId('team-forbidden')).toBeVisible();

    await teamAdminPage.goto(`/admin-settings/teams/${ownTeam.id}`);
    await expect(roleOf(colleague.id)).toHaveAttribute('role', 'combobox');
    await expect(roleOf(teamAdmin.id)).not.toHaveAttribute('role', 'combobox');
    await expect(
      teamAdminPage.getByTestId(`team-member-remove-${teamAdmin.id}`),
    ).toHaveCount(0);
    const demoteLastAdmin = await requestSetTeamAdmin(
      teamAdmin.api,
      ownTeam.id,
      teamAdmin.id,
      false,
    );
    expect(demoteLastAdmin.status()).toBe(403);
    expect(((await demoteLastAdmin.json()) as { code: string }).code).toBe(
      'LAST_TEAM_ADMIN',
    );

    await roleOf(colleague.id).click();
    await teamAdminPage.getByRole('option', { name: 'Team-Admin' }).click();
    await expect(roleOf(teamAdmin.id)).toHaveAttribute('role', 'combobox');
  } finally {
    await teamAdminContext.close();
    await deleteTeam(api, ownTeam.id);
    await deleteTeam(api, otherTeam.id);
    await generatedApi.userControllerDeleteUser(teamAdmin.id, { api });
    await generatedApi.userControllerDeleteUser(colleague.id, { api });
    await teamAdmin.api.dispose();
    await colleague.api.dispose();
  }
});
