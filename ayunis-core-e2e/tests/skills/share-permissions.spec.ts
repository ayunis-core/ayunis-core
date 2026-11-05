import { randomUUID } from "node:crypto";
import type { APIRequestContext, Browser, BrowserContext } from "@playwright/test";
import { login } from "../../src/clients/api/auth.client";
import { skipChatPersonalization } from "../../src/clients/api/chat-settings.client";
import { generatedApi } from "../../src/clients/api/generated-api";
import { dismissWelcomeVideo } from "../../src/clients/api/onboarding.client";
import {
  getUserRolePermissions,
  setUserRolePermissions,
} from "../../src/clients/api/role-permissions.client";
import {
  listSkillShares,
  requestKnowledgeBaseShare,
  requestShareDeletion,
  requestSkillShare,
} from "../../src/clients/api/shares.client";
import { addTeamMember, createTeam } from "../../src/clients/api/teams.client";
import type { MailcatcherClient } from "../../src/clients/mailcatcher.client";
import { createApiContext } from "../../src/factories/api-context.factory";
import { createOrg } from "../../src/factories/org.factory";
import { createUser } from "../../src/factories/user.factory";
import { test, expect } from "../../src/fixtures/test";

const emptySession = { cookies: [], origins: [] };

interface SharingOrg {
  adminApi: APIRequestContext;
  memberApi: APIRequestContext;
  teamId: string;
}

async function createSharingOrg(
  mail: MailcatcherClient,
  key: string,
): Promise<SharingOrg> {
  const org = await createOrg(
    `share-perms-${key}`,
    test.info().outputPath("share-perms-org.json"),
  );
  const adminApi = await createApiContext(emptySession);
  await login(adminApi, org.admin.email, org.admin.password);
  const member = await createUser(adminApi, mail, `share-perms-${key}`);
  const memberApi = await createApiContext(emptySession);
  await login(memberApi, member.email, member.password);
  await dismissWelcomeVideo(memberApi);
  await skipChatPersonalization(memberApi);
  const team = await createTeam(adminApi, `Bauamt ${key}`);
  await addTeamMember(adminApi, team.id, member.id);
  return { adminApi, memberApi, teamId: team.id };
}

async function openContext(
  browser: Browser,
  api: APIRequestContext,
): Promise<BrowserContext> {
  return browser.newContext({ storageState: await api.storageState() });
}

test("members share skills only with the audiences their role permits", async ({
  browser,
  mail,
}) => {
  test.setTimeout(120_000);
  const key = `skill-${randomUUID().slice(0, 8)}`;
  const { adminApi, memberApi, teamId } = await createSharingOrg(mail, key);
  const contexts: BrowserContext[] = [];
  try {
    await setUserRolePermissions(adminApi, ["manage_skills"]);
    const skill = await generatedApi.skillsControllerCreate(
      {
        ownerType: "personal",
        name: `Bauantrag ${key}`,
        shortDescription: "Answers building permit questions",
        instructions: "Answer building permit questions.",
        isActive: true,
      },
      { api: memberApi },
    );

    expect((await requestSkillShare(memberApi, skill.id, teamId)).status()).toBe(
      403,
    );
    expect((await requestSkillShare(memberApi, skill.id)).status()).toBe(403);

    const memberContext = await openContext(browser, memberApi);
    contexts.push(memberContext);
    const memberPage = await memberContext.newPage();
    await memberPage.goto(`/skills/${skill.id}?tab=share`);
    const orgSwitch = memberPage.getByTestId("shares-org-switch");
    const teamSwitch = memberPage.getByTestId(`shares-team-switch-${teamId}`);
    await expect(orgSwitch).toBeDisabled();
    await expect(teamSwitch).toBeDisabled();

    const adminContext = await openContext(browser, adminApi);
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

    await memberPage.reload();
    await expect(teamSwitch).toBeEnabled();
    await expect(orgSwitch).toBeDisabled();
    await teamSwitch.click();
    await memberPage.getByTestId("confirmation-confirm").click();
    await expect(teamSwitch).toBeChecked();
    expect((await requestSkillShare(memberApi, skill.id)).status()).toBe(403);

    await setUserRolePermissions(adminApi, [
      "manage_skills",
      "share_skills_with_teams",
      "share_skills_with_org",
    ]);
    const orgShare = await requestSkillShare(memberApi, skill.id);
    expect(orgShare.status()).toBe(201);
    const orgShareId = (await orgShare.json()).id as string;

    await setUserRolePermissions(adminApi, [
      "manage_skills",
      "share_skills_with_teams",
    ]);
    expect((await requestShareDeletion(memberApi, orgShareId)).status()).toBe(
      403,
    );
    const teamShare = (await listSkillShares(memberApi, skill.id)).find(
      (share) => share.scopeType === "team",
    );
    expect(teamShare).toBeDefined();
    expect(
      (await requestShareDeletion(memberApi, teamShare!.id)).status(),
    ).toBe(204);
    expect(
      (await listSkillShares(memberApi, skill.id)).map((s) => s.id),
    ).toEqual([orgShareId]);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    await memberApi.dispose();
    await adminApi.dispose();
  }
});

test("organisation-wide knowledge base sharing does not imply team sharing", async ({
  mail,
}) => {
  test.setTimeout(120_000);
  const key = `kb-${randomUUID().slice(0, 8)}`;
  const { adminApi, memberApi, teamId } = await createSharingOrg(mail, key);
  try {
    await setUserRolePermissions(adminApi, ["manage_knowledge_bases"]);
    const knowledgeBase = await generatedApi.knowledgeBasesControllerCreate(
      {
        ownerType: "personal",
        name: `Satzungen ${key}`,
        description: "Municipal statutes",
      },
      { api: memberApi },
    );
    expect(
      (await requestKnowledgeBaseShare(memberApi, knowledgeBase.id)).status(),
    ).toBe(403);

    await setUserRolePermissions(adminApi, [
      "manage_knowledge_bases",
      "share_knowledge_bases_with_org",
    ]);

    expect(
      (await requestKnowledgeBaseShare(memberApi, knowledgeBase.id)).status(),
    ).toBe(201);
    expect(
      (
        await requestKnowledgeBaseShare(memberApi, knowledgeBase.id, teamId)
      ).status(),
    ).toBe(403);
  } finally {
    await memberApi.dispose();
    await adminApi.dispose();
  }
});
