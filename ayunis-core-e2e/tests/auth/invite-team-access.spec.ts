import { requestUsageVisibilityChange } from "../../src/clients/api/usage-visibility.client";
import { test, expect } from "../../src/fixtures/test";
import { createOrg } from "../../src/factories/org.factory";
import { createUser } from "../../src/factories/user.factory";
import {
  createTeam,
  addTeamMember,
  listMyTeams,
} from "../../src/clients/api/teams.client";
import { login } from "../../src/clients/api/auth.client";
import {
  requestUsersByEmail,
  findUserByEmail,
} from "../../src/clients/api/users.client";
import {
  requestInviteWithTeams,
  listPendingInvites,
  grantTeamAssignmentPermission,
} from "../../src/clients/api/invite-teams.client";
import { createApiContext } from "../../src/factories/api-context.factory";

const emptySession = { cookies: [], origins: [] };

test("single invites reject foreign and unknown teams without persisting an invite", async ({
  api,
}) => {
  test.setTimeout(90_000);
  const key = Date.now();
  const foreignOrg = await createOrg(
    `foreign-invite-${key}`,
    test.info().outputPath("foreign-org.json"),
  );
  const foreignApi = await createApiContext(emptySession);
  try {
    await login(foreignApi, foreignOrg.admin.email, foreignOrg.admin.password);
    const team = await createTeam(foreignApi, `Foreign Bauamt ${key}`);
    for (const teamId of [team.id, "a8a636eb-bd89-4a2e-b2cf-e0e6c895b195"]) {
      const email = `foreign-team-${teamId}-${key}@e2e.local`;
      const response = await requestInviteWithTeams(api, {
        email,
        role: "user",
        teamIds: [teamId],
      });
      expect(response.status()).toBe(404);
      expect((await response.json()).code).toBe("TEAM_NOT_FOUND");
      expect((await listPendingInvites(api, email)).data).toEqual([]);
    }
  } finally {
    await foreignApi.dispose();
  }
});

// Changes the USER role of its own organization, so it cannot affect the
// worker organization other specs share.
test("members granted the user-list permission still receive no team data and cannot invite", async ({
  mail,
}) => {
  test.setTimeout(90_000);
  const key = Date.now();
  const org = await createOrg(
    `team-list-${key}`,
    test.info().outputPath("team-list-org.json"),
  );
  const adminApi = await createApiContext(emptySession);
  const recipientApi = await createApiContext(emptySession);
  try {
    await login(adminApi, org.admin.email, org.admin.password);
    const member = await createUser(adminApi, mail, `team-list-${key}`);
    await login(recipientApi, member.email, member.password);
    expect(
      (await requestUsersByEmail(recipientApi, member.email)).status(),
    ).toBe(403);
    expect(await listMyTeams(recipientApi)).toEqual([]);
    await grantTeamAssignmentPermission(adminApi);
    const allowed = await requestUsersByEmail(recipientApi, member.email);
    expect(allowed.status()).toBe(200);
    expect((await allowed.json()).data[0]).not.toHaveProperty("teams");
    const team = await createTeam(adminApi, `Bamberg list ${key}`);
    await addTeamMember(adminApi, team.id, member.id);
    expect((await listMyTeams(recipientApi)).map((item) => item.id)).toEqual([
      team.id,
    ]);
    expect((await findUserByEmail(adminApi, member.email))?.teams).toEqual([
      { id: team.id, name: team.name },
    ]);
    const memberList = await requestUsersByEmail(recipientApi, member.email);
    expect(memberList.status()).toBe(200);
    expect((await memberList.json()).data[0]).not.toHaveProperty("teams");
    const denied = await requestInviteWithTeams(recipientApi, {
      email: `denied-invite-${key}@e2e.local`,
      role: "user",
      teamIds: [team.id],
    });
    expect(denied.status()).toBe(403);
    expect(
      (await listPendingInvites(adminApi, `denied-invite-${key}@e2e.local`))
        .data,
    ).toEqual([]);
  } finally {
    await recipientApi.dispose();
    await adminApi.dispose();
  }
});

test("single invites keep team assignments while individual usage is hidden", async ({
  api,
  org,
}) => {
  const team = await createTeam(api, `Privacy Bauamt ${Date.now()}`);
  const superAdminApi = await createApiContext(emptySession);
  const email = `privacy-team-${Date.now()}@e2e.local`;
  try {
    await login(superAdminApi, "admin@demo.local", "admin");
    expect(
      (
        await requestUsageVisibilityChange(superAdminApi, org.orgId, {
          hideIndividualUsage: true,
        })
      ).status(),
    ).toBe(200);
    const allowed = await requestInviteWithTeams(api, {
      email,
      role: "user",
      teamIds: [team.id],
    });
    expect(allowed.status()).toBe(201);
    expect((await listPendingInvites(api, email)).data).toContainEqual(
      expect.objectContaining({
        email,
        teams: [{ id: team.id, name: team.name }],
      }),
    );
  } finally {
    await requestUsageVisibilityChange(superAdminApi, org.orgId, {
      hideIndividualUsage: false,
    });
    await superAdminApi.dispose();
  }
});
