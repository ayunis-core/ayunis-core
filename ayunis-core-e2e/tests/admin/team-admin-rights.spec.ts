import { test, expect } from '../../src/fixtures/test';
import { generatedApi } from '../../src/clients/api/generated-api';
import {
  getTeamAdminPermissions,
  setTeamAdminPermissions,
} from '../../src/clients/api/role-permissions.client';
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  requestAddTeamMember,
  requestSetTeamAdmin,
} from '../../src/clients/api/teams.client';
import { createSignedInMember } from '../../src/factories/user.factory';
import { setTeamAdminPermissionInCard } from '../../src/flows/role-permissions.flow';

test('team admins add members only while the organisation allows it', async ({
  page,
  api,
  mail,
  browser,
}) => {
  test.setTimeout(120_000);
  const suffix = `team-admin-rights-${Date.now()}`;
  const originalRights = await getTeamAdminPermissions(api);
  const team = await createTeam(api, `Bürgerservice ${suffix}`);
  const teamAdmin = await createSignedInMember(api, mail, `${suffix}-admin`);
  const newcomer = await createSignedInMember(api, mail, `${suffix}-new`);
  await addTeamMember(api, team.id, teamAdmin.id);
  expect(
    (await requestSetTeamAdmin(api, team.id, teamAdmin.id, true)).status(),
  ).toBe(200);
  const teamAdminContext = await browser.newContext({
    storageState: teamAdmin.storageState,
  });
  const teamAdminPage = await teamAdminContext.newPage();

  try {
    await setTeamAdminPermissionInCard(page, 'team_manage_members', false);

    await teamAdminPage.goto(`/admin-settings/teams/${team.id}`);
    await expect(
      teamAdminPage.getByTestId(`team-member-role-${teamAdmin.id}`),
    ).toBeVisible();
    await expect(teamAdminPage.getByTestId('team-members-add')).toHaveCount(0);
    expect(
      (await requestAddTeamMember(teamAdmin.api, team.id, newcomer.id)).status(),
    ).toBe(403);

    await setTeamAdminPermissionInCard(page, 'team_manage_members', true);

    await teamAdminPage.reload();
    await expect(teamAdminPage.getByTestId('team-members-add')).toBeVisible();
    expect(
      (await requestAddTeamMember(teamAdmin.api, team.id, newcomer.id)).status(),
    ).toBe(201);
  } finally {
    await setTeamAdminPermissions(api, originalRights);
    await teamAdminContext.close();
    await deleteTeam(api, team.id);
    await generatedApi.userControllerDeleteUser(teamAdmin.id, { api });
    await generatedApi.userControllerDeleteUser(newcomer.id, { api });
    await teamAdmin.api.dispose();
    await newcomer.api.dispose();
  }
});
