import { randomUUID } from "node:crypto";
import type { APIRequestContext, BrowserContext } from "@playwright/test";
import { login } from "../../src/clients/api/auth.client";
import { skipChatPersonalization } from "../../src/clients/api/chat-settings.client";
import { dismissWelcomeVideo } from "../../src/clients/api/onboarding.client";
import {
  requestKnowledgeBaseCreation,
  requestSkillCreation,
} from "../../src/clients/api/ownership.client";
import {
  getUserRolePermissions,
  setUserRolePermissions,
} from "../../src/clients/api/role-permissions.client";
import { addTeamMember, createTeam } from "../../src/clients/api/teams.client";
import type { MailcatcherClient } from "../../src/clients/mailcatcher.client";
import { createApiContext } from "../../src/factories/api-context.factory";
import { createOrg } from "../../src/factories/org.factory";
import { createUser } from "../../src/factories/user.factory";
import { test, expect } from "../../src/fixtures/test";

const emptySession = { cookies: [], origins: [] };

interface OwnershipOrg {
  adminApi: APIRequestContext;
  memberApi: APIRequestContext;
  teamId: string;
}

// The role matrix is organization-wide state, so each test gets its own org.
async function createOwnershipOrg(
  mail: MailcatcherClient,
  key: string,
): Promise<OwnershipOrg> {
  const org = await createOrg(
    `owner-perms-${key}`,
    test.info().outputPath("owner-perms-org.json"),
  );
  const adminApi = await createApiContext(emptySession);
  await login(adminApi, org.admin.email, org.admin.password);
  const member = await createUser(adminApi, mail, `owner-perms-${key}`);
  const memberApi = await createApiContext(emptySession);
  await login(memberApi, member.email, member.password);
  await dismissWelcomeVideo(memberApi);
  await skipChatPersonalization(memberApi);
  const team = await createTeam(adminApi, `Bauamt ${key}`);
  await addTeamMember(adminApi, team.id, member.id);
  return { adminApi, memberApi, teamId: team.id };
}

test("members create team and organization skills only as their role permits", async ({
  browser,
  mail,
}) => {
  test.setTimeout(120_000);
  const key = `skill-${randomUUID().slice(0, 8)}`;
  const { adminApi, memberApi, teamId } = await createOwnershipOrg(mail, key);
  const team = { ownerType: "team" as const, teamId };
  const org = { ownerType: "org" as const };
  const contexts: BrowserContext[] = [];
  try {
    await setUserRolePermissions(adminApi, ["manage_skills"]);
    expect(
      (await requestSkillCreation(memberApi, team, `Team ${key}`)).status(),
    ).toBe(403);
    expect(
      (await requestSkillCreation(memberApi, org, `Org ${key}`)).status(),
    ).toBe(403);

    const adminContext = await browser.newContext({
      storageState: await adminApi.storageState(),
    });
    contexts.push(adminContext);
    const adminPage = await adminContext.newPage();
    await adminPage.goto("/admin-settings/roles");
    await expect(
      adminPage.getByRole("checkbox", { name: "share_skills_with_org-user" }),
    ).not.toBeChecked();
    await adminPage
      .getByRole("checkbox", { name: "share_skills_with_teams-user" })
      .click();
    await adminPage.getByTestId("roles-settings-save").click();
    await expect
      .poll(async () => (await getUserRolePermissions(adminApi)).sort())
      .toEqual(["manage_skills", "share_skills_with_teams"]);

    expect(
      (await requestSkillCreation(memberApi, team, `Team ${key}`)).status(),
    ).toBe(201);
    expect(
      (await requestSkillCreation(memberApi, org, `Org ${key}`)).status(),
    ).toBe(403);

    await setUserRolePermissions(adminApi, [
      "manage_skills",
      "share_skills_with_org",
    ]);
    expect(
      (await requestSkillCreation(memberApi, org, `Org ${key}`)).status(),
    ).toBe(201);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    await memberApi.dispose();
    await adminApi.dispose();
  }
});

test("organization-wide knowledge base ownership does not imply team ownership", async ({
  mail,
}) => {
  test.setTimeout(120_000);
  const key = `kb-${randomUUID().slice(0, 8)}`;
  const { adminApi, memberApi, teamId } = await createOwnershipOrg(mail, key);
  try {
    await setUserRolePermissions(adminApi, ["manage_knowledge_bases"]);
    expect(
      (
        await requestKnowledgeBaseCreation(
          memberApi,
          { ownerType: "org" },
          `Satzungen ${key}`,
        )
      ).status(),
    ).toBe(403);

    await setUserRolePermissions(adminApi, [
      "manage_knowledge_bases",
      "share_knowledge_bases_with_org",
    ]);

    expect(
      (
        await requestKnowledgeBaseCreation(
          memberApi,
          { ownerType: "org" },
          `Satzungen ${key}`,
        )
      ).status(),
    ).toBe(201);
    expect(
      (
        await requestKnowledgeBaseCreation(
          memberApi,
          { ownerType: "team", teamId },
          `Bauamt ${key}`,
        )
      ).status(),
    ).toBe(403);
  } finally {
    await memberApi.dispose();
    await adminApi.dispose();
  }
});
