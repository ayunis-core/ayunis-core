import { requestUsageVisibilityChange } from "../../src/clients/api/usage-visibility.client";
import {
  createTeam,
  deleteTeam,
  listMyTeams,
  listTeamMembers,
} from "../../src/clients/api/teams.client";
import {
  listPendingInvites,
  publicInviteDetails,
  inviteUserWithTeams,
} from "../../src/clients/api/invite-teams.client";
import { findUserByEmail } from "../../src/clients/api/users.client";
import { login } from "../../src/clients/api/auth.client";
import { acceptInvite, inviteUser } from "../../src/clients/api/invites.client";
import { test, expect } from "../../src/fixtures/test";

// Invite journey: the worker org's admin invites a member via the API, the
// invitee follows the emailed link, sets up the account, and signs in.
// The page starts unauthenticated (it belongs to the invitee); the `api`
// fixture stays authenticated as the org admin.
test.use({ storageState: { cookies: [], origins: [] } });

test("invited member joins the org and signs in", async ({
  page,
  api,
  mail,
}) => {
  const email = `e2e-invitee-${Date.now()}@e2e.local`;
  const password = "E2e-Password-1";

  await inviteUser(api, email);

  const token = await mail.extractLinkToken(email, "/accept-invite");
  await page.goto(`/accept-invite?token=${token}`);
  await page.getByTestId("invite-accept-name").fill("E2E Invitee");
  await page.getByTestId("invite-accept-password").fill(password);
  await page.getByTestId("invite-accept-submit").click();

  await expect(page).toHaveURL(/\/login/);

  await page.getByTestId("email").fill(email);
  await page.getByTestId("login-continue").click();
  await page.getByTestId("password").fill(password);
  await page.getByTestId("submit").click();
  await expect(page).not.toHaveURL(/\/login/);
});

test("single invite with hidden individual usage shows teams and grants membership", async ({
  page,
  api,
  org,
  mail,
  browser,
  publicApi,
}) => {
  test.setTimeout(90_000);
  const key = Date.now();
  const team = await createTeam(api, `Bauamt ${key}`);
  const removedTeam = await createTeam(api, `Kulturamt ${key}`);
  const email = `e2e-team-invite-${key}@e2e.local`;
  const adminContext = await browser.newContext({
    storageState: org.storageState,
  });
  const adminPage = await adminContext.newPage();
  adminPage.setDefaultTimeout(10_000);
  try {
    await login(publicApi, "admin@demo.local", "admin");
    expect(
      (
        await requestUsageVisibilityChange(publicApi, org.orgId, {
          hideIndividualUsage: true,
        })
      ).status(),
    ).toBe(200);
    await adminPage.goto("/admin-settings/users");
    await adminPage.getByTestId("invite-menu-trigger").click();
    await adminPage.getByTestId("single-invite-menu-item").click();
    await adminPage.getByTestId("invite-create-email").fill(email);
    await adminPage.getByTestId("invite-create-role").click();
    await adminPage.getByTestId("invite-create-role-user").click();
    await expect(adminPage.getByTestId("invite-create-role-user")).toBeHidden();
    await adminPage
      .getByTestId("invite-create-teams")
      .pressSequentially(team.name);
    await adminPage.getByTestId(`invite-create-team-${team.id}`).click();
    await expect(adminPage.getByTestId("invite-create-teams")).toHaveValue("");
    await expect(
      adminPage.getByTestId(`invite-create-team-${team.id}`),
    ).toBeHidden();
    await adminPage.getByTestId("invite-create-teams").click();
    await adminPage
      .getByTestId("invite-create-teams")
      .pressSequentially(removedTeam.name);
    await adminPage.getByTestId(`invite-create-team-${removedTeam.id}`).click();
    await expect(adminPage.getByTestId("invite-create-teams")).toHaveValue("");
    await expect(
      adminPage.getByTestId(`invite-create-team-${removedTeam.id}`),
    ).toBeHidden();
    await adminPage.getByTestId("invite-create-submit").click();
    const token = await mail.extractLinkToken(email, "/accept-invite");
    const pending = (await listPendingInvites(api, email)).data[0];
    expect(pending.teams?.map((item) => item.id).sort()).toEqual(
      [team.id, removedTeam.id].sort(),
    );
    await expect(
      adminPage.getByTestId(`invite-teams-${pending.id}`),
    ).toContainText(team.name);
    await expect(
      adminPage.getByTestId(`invite-teams-${pending.id}`),
    ).toContainText(removedTeam.name);
    expect((await listTeamMembers(api, team.id)).data).toEqual([]);
    expect((await listTeamMembers(api, removedTeam.id)).data).toEqual([]);
    const details = await publicInviteDetails(publicApi, token);
    expect(details).not.toHaveProperty("teams");
    expect(details).not.toHaveProperty("teamIds");
    await deleteTeam(api, removedTeam.id);
    const recreatedTeam = await createTeam(api, removedTeam.name);
    await page.goto(`/accept-invite?token=${token}`);
    await page.getByTestId("invite-accept-name").fill("Bamberg Invitee");
    await page.getByTestId("invite-accept-password").fill("E2e-Password-1");
    await page.getByTestId("invite-accept-submit").click();
    await expect(page).toHaveURL(/\/login/);
    await login(publicApi, email, "E2e-Password-1");
    expect((await listMyTeams(publicApi)).map((item) => item.id)).toEqual([
      team.id,
    ]);
    expect((await listTeamMembers(api, recreatedTeam.id)).data).toEqual([]);
    const user = await findUserByEmail(api, email);
    expect(user?.teams).toEqual([{ id: team.id, name: team.name }]);
    await adminPage.reload();
    await expect(adminPage.getByTestId(`user-teams-${user?.id}`)).toContainText(
      team.name,
    );
  } finally {
    await login(publicApi, "admin@demo.local", "admin");
    await requestUsageVisibilityChange(publicApi, org.orgId, {
      hideIndividualUsage: false,
    });
    await adminContext.close();
  }
});

test("an omitted team selection grants no memberships", async ({
  api,
  publicApi,
  mail,
}) => {
  const email = `e2e-no-team-${Date.now()}@e2e.local`;
  await inviteUserWithTeams(api, email, []);
  const token = await mail.extractLinkToken(email, "/accept-invite");
  await acceptInvite(publicApi, {
    inviteToken: token,
    userName: "No Teams",
    password: "E2e-Password-1",
    hasAcceptedMarketing: false,
  });
  await login(publicApi, email, "E2e-Password-1");
  expect(await listMyTeams(publicApi)).toEqual([]);
  expect((await findUserByEmail(api, email))?.teams).toEqual([]);
});
