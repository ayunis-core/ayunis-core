import { randomUUID } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import { login } from "../../src/clients/api/auth.client";
import { generatedApi } from "../../src/clients/api/generated-api";
import {
  setManagerRolePermissions,
  setUserRolePermissions,
} from "../../src/clients/api/role-permissions.client";
import { requestSkillShare } from "../../src/clients/api/shares.client";
import {
  addTeamMember,
  createTeam,
  listMyTeams,
  listTeamMembers,
  listTeams,
  requestAddTeamMember,
  requestTeam,
  requestTeamMemberRemoval,
  requestTeamMemberRoleChange,
  setTeamMemberRole,
} from "../../src/clients/api/teams.client";
import type { MailcatcherClient } from "../../src/clients/mailcatcher.client";
import { createApiContext } from "../../src/factories/api-context.factory";
import { createOrg } from "../../src/factories/org.factory";
import { createUser, type UserContext } from "../../src/factories/user.factory";
import { test, expect } from "../../src/fixtures/test";

const emptySession = { cookies: [], origins: [] };

interface Principal {
  user: UserContext;
  api: APIRequestContext;
}

interface TeamAdminOrg {
  adminApi: APIRequestContext;
  lead: Principal;
  colleague: Principal;
  newcomer: Principal;
  teamId: string;
  otherTeamId: string;
  dispose: () => Promise<void>;
}

async function signIn(
  adminApi: APIRequestContext,
  mail: MailcatcherClient,
  key: string,
): Promise<Principal> {
  const user = await createUser(adminApi, mail, key);
  const api = await createApiContext(emptySession);
  await login(api, user.email, user.password);
  return { user, api };
}

/**
 * Lead and colleague belong to the team, the newcomer to no team; the other
 * team has only the colleague. Every member starts with the `user` team role
 * and every principal has the `user` organisation role.
 */
async function createTeamAdminOrg(
  mail: MailcatcherClient,
  key: string,
): Promise<TeamAdminOrg> {
  const org = await createOrg(
    `team-admins-${key}`,
    test.info().outputPath("team-admins-org.json"),
  );
  const adminApi = await createApiContext(emptySession);
  await login(adminApi, org.admin.email, org.admin.password);
  const lead = await signIn(adminApi, mail, `lead-${key}`);
  const colleague = await signIn(adminApi, mail, `colleague-${key}`);
  const newcomer = await signIn(adminApi, mail, `newcomer-${key}`);
  const team = await createTeam(adminApi, `Bauamt ${key}`);
  const otherTeam = await createTeam(adminApi, `Kämmerei ${key}`);
  await addTeamMember(adminApi, team.id, lead.user.id);
  await addTeamMember(adminApi, team.id, colleague.user.id);
  await addTeamMember(adminApi, otherTeam.id, colleague.user.id);
  return {
    adminApi,
    lead,
    colleague,
    newcomer,
    teamId: team.id,
    otherTeamId: otherTeam.id,
    dispose: async () => {
      await Promise.all(
        [adminApi, lead.api, colleague.api, newcomer.api].map((api) =>
          api.dispose(),
        ),
      );
    },
  };
}

test("a team admin manages the members of their own team only", async ({
  mail,
}) => {
  test.setTimeout(120_000);
  const key = randomUUID().slice(0, 8);
  const org = await createTeamAdminOrg(mail, key);
  const { adminApi, lead, colleague, newcomer, teamId, otherTeamId } = org;
  try {
    await setUserRolePermissions(adminApi, ["manage_skills"]);

    expect((await requestTeam(lead.api, teamId)).status()).toBe(403);
    expect(
      (await requestAddTeamMember(lead.api, teamId, newcomer.user.id)).status(),
    ).toBe(403);
    expect(await listTeams(lead.api)).toEqual([]);

    await setTeamMemberRole(adminApi, teamId, lead.user.id, "admin");

    expect((await listTeams(lead.api)).map((team) => team.id)).toEqual([
      teamId,
    ]);
    const myTeam = (await listMyTeams(lead.api)).find((t) => t.id === teamId);
    expect(myTeam?.role).toBe("admin");
    expect(myTeam?.permissions).toContain("assign_users_to_teams");

    expect((await requestTeam(lead.api, teamId)).status()).toBe(200);
    expect(
      (await requestAddTeamMember(lead.api, teamId, newcomer.user.id)).status(),
    ).toBe(201);
    expect(
      (
        await requestTeamMemberRoleChange(
          lead.api,
          teamId,
          colleague.user.id,
          "manager",
        )
      ).status(),
    ).toBe(200);
    expect(
      (
        await requestTeamMemberRemoval(lead.api, teamId, newcomer.user.id)
      ).status(),
    ).toBe(204);
    const members = await listTeamMembers(adminApi, teamId);
    expect(
      Object.fromEntries(members.data.map((m) => [m.userId, m.role])),
    ).toEqual({ [lead.user.id]: "admin", [colleague.user.id]: "manager" });

    expect((await requestTeam(lead.api, otherTeamId)).status()).toBe(403);
    expect(
      (
        await requestAddTeamMember(lead.api, otherTeamId, newcomer.user.id)
      ).status(),
    ).toBe(403);

    expect(
      (
        await requestTeamMemberRoleChange(lead.api, teamId, lead.user.id, "user")
      ).status(),
    ).toBe(409);
    expect(
      (await requestTeamMemberRemoval(lead.api, teamId, lead.user.id)).status(),
    ).toBe(409);
    expect(
      (
        await requestTeamMemberRoleChange(adminApi, teamId, lead.user.id, "user")
      ).status(),
    ).toBe(200);
    expect((await requestTeam(lead.api, teamId)).status()).toBe(403);
  } finally {
    await org.dispose();
  }
});

test("a team manager holds the manager permissions in their team", async ({
  mail,
}) => {
  test.setTimeout(120_000);
  const key = randomUUID().slice(0, 8);
  const org = await createTeamAdminOrg(mail, key);
  const { adminApi, lead, colleague, newcomer, teamId, otherTeamId } = org;
  try {
    await setUserRolePermissions(adminApi, ["manage_skills"]);
    await setManagerRolePermissions(adminApi, ["manage_skills"]);
    await setTeamMemberRole(adminApi, teamId, lead.user.id, "admin");
    await setTeamMemberRole(adminApi, teamId, colleague.user.id, "manager");

    expect(
      (
        await requestAddTeamMember(colleague.api, teamId, newcomer.user.id)
      ).status(),
    ).toBe(403);

    await setManagerRolePermissions(adminApi, [
      "manage_skills",
      "assign_users_to_teams",
    ]);

    expect(
      (
        await requestAddTeamMember(colleague.api, teamId, newcomer.user.id)
      ).status(),
    ).toBe(201);
    expect(
      (
        await requestTeamMemberRemoval(colleague.api, teamId, newcomer.user.id)
      ).status(),
    ).toBe(204);
    expect(
      (
        await requestAddTeamMember(colleague.api, otherTeamId, newcomer.user.id)
      ).status(),
    ).toBe(403);
    expect(
      (
        await requestTeamMemberRoleChange(
          colleague.api,
          teamId,
          colleague.user.id,
          "admin",
        )
      ).status(),
    ).toBe(403);
    expect(
      (
        await requestTeamMemberRemoval(colleague.api, teamId, lead.user.id)
      ).status(),
    ).toBe(403);
  } finally {
    await org.dispose();
  }
});

test("a team admin shares with their team even when the role matrix forbids it", async ({
  mail,
}) => {
  test.setTimeout(120_000);
  const key = randomUUID().slice(0, 8);
  const org = await createTeamAdminOrg(mail, key);
  const { adminApi, lead, colleague, teamId, otherTeamId } = org;
  try {
    await setUserRolePermissions(adminApi, ["manage_skills"]);
    const createSkill = (api: APIRequestContext, name: string) =>
      generatedApi.skillsControllerCreate(
        {
          ownerType: "personal",
          name: `${name} ${key}`,
          shortDescription: "Answers building permit questions",
          instructions: "Answer building permit questions.",
          isActive: true,
        },
        { api },
      );
    const leadSkill = await createSkill(lead.api, "Bauantrag");
    const colleagueSkill = await createSkill(colleague.api, "Baulast");

    expect(
      (await requestSkillShare(lead.api, leadSkill.id, teamId)).status(),
    ).toBe(403);

    await setTeamMemberRole(adminApi, teamId, lead.user.id, "admin");

    expect(
      (await requestSkillShare(lead.api, leadSkill.id, teamId)).status(),
    ).toBe(201);
    expect((await requestSkillShare(lead.api, leadSkill.id)).status()).toBe(
      403,
    );
    expect(
      (await requestSkillShare(lead.api, leadSkill.id, otherTeamId)).status(),
    ).toBe(403);
    expect(
      (
        await requestSkillShare(colleague.api, colleagueSkill.id, teamId)
      ).status(),
    ).toBe(403);
  } finally {
    await org.dispose();
  }
});
