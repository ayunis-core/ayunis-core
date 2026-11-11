import { randomUUID } from "node:crypto";
import type {
  APIRequestContext,
  Browser,
  BrowserContext,
  Page,
} from "@playwright/test";
import { login } from "../../src/clients/api/auth.client";
import { skipChatPersonalization } from "../../src/clients/api/chat-settings.client";
import { dismissWelcomeVideo } from "../../src/clients/api/onboarding.client";
import { requestSkillCreation } from "../../src/clients/api/ownership.client";
import { setUserRolePermissions } from "../../src/clients/api/role-permissions.client";
import {
  addTeamMember,
  createTeam,
  listTeamMembers,
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

async function signIn(
  adminApi: APIRequestContext,
  mail: MailcatcherClient,
  key: string,
): Promise<Principal> {
  const user = await createUser(adminApi, mail, key);
  const api = await createApiContext(emptySession);
  await login(api, user.email, user.password);
  await dismissWelcomeVideo(api);
  await skipChatPersonalization(api);
  return { user, api };
}

async function openContext(
  browser: Browser,
  api: APIRequestContext,
): Promise<BrowserContext> {
  return browser.newContext({ storageState: await api.storageState() });
}

test("a team admin manages their team from the admin settings", async ({
  browser,
  mail,
}) => {
  test.setTimeout(120_000);
  const key = randomUUID().slice(0, 8);
  const org = await createOrg(
    `team-admin-ui-${key}`,
    test.info().outputPath("team-admin-ui-org.json"),
  );
  const adminApi = await createApiContext(emptySession);
  await login(adminApi, org.admin.email, org.admin.password);
  const lead = await signIn(adminApi, mail, `ui-lead-${key}`);
  const colleague = await signIn(adminApi, mail, `ui-colleague-${key}`);
  const team = await createTeam(adminApi, `Bauamt ${key}`);
  const otherTeam = await createTeam(adminApi, `Kämmerei ${key}`);
  await addTeamMember(adminApi, team.id, lead.user.id);
  await addTeamMember(adminApi, team.id, colleague.user.id);
  await setUserRolePermissions(adminApi, ["manage_skills"]);
  const leadContext = await openContext(browser, lead.api);
  try {
    const page = await leadContext.newPage();

    await page.goto("/admin-settings/teams");
    await expect(page).not.toHaveURL(/\/admin-settings/);

    await setTeamMemberRole(adminApi, team.id, lead.user.id, "admin");

    await page.goto("/admin-settings/teams");
    await expect(page.getByTestId(`teams-edit-${team.id}`)).toBeVisible();
    await expect(page.getByTestId(`teams-delete-${team.id}`)).toHaveCount(0);
    await expect(page.getByTestId(`teams-edit-${otherTeam.id}`)).toHaveCount(
      0,
    );

    await page.goto(`/admin-settings/teams/${team.id}`);
    await expect(page.getByTestId("team-members-add")).toBeVisible();
    await page.getByTestId(`team-member-role-${colleague.user.id}`).click();
    const roleHint = page.getByTestId("team-member-role-hint");
    await expect(roleHint).toBeVisible();
    await expect(roleHint.getByRole("listitem")).toHaveCount(0);
    await page.getByTestId("team-member-role-option-admin").hover();
    await expect(
      roleHint.getByTestId("team-member-role-hint-item-assign_users_to_teams"),
    ).toBeVisible();
    await expect(
      roleHint.getByTestId("team-member-role-hint-item-manage_roles"),
    ).toBeVisible();
    await page.getByTestId("team-member-role-option-manager").click();
    await page.getByTestId("confirmation-confirm").click();
    await expect
      .poll(async () => {
        const { data } = await listTeamMembers(adminApi, team.id);
        return data.find((m) => m.userId === colleague.user.id)?.role;
      })
      .toBe("manager");
  } finally {
    await leadContext.close();
    await Promise.all(
      [adminApi, lead.api, colleague.api].map((api) => api.dispose()),
    );
  }
});

async function openCreateSkillDialog(page: Page): Promise<void> {
  await page.goto("/skills");
  await page.getByTestId("create-skill-menu").first().click();
  await page.getByTestId("create-skill-editor").click();
  await expect(page.getByTestId("create-entity-submit")).toBeEnabled();
}

test("a team admin can create team skills when their role cannot", async ({
  browser,
  mail,
}) => {
  test.setTimeout(120_000);
  const key = randomUUID().slice(0, 8);
  const org = await createOrg(
    `team-admin-owner-${key}`,
    test.info().outputPath("team-admin-owner-org.json"),
  );
  const adminApi = await createApiContext(emptySession);
  await login(adminApi, org.admin.email, org.admin.password);
  const lead = await signIn(adminApi, mail, `owner-lead-${key}`);
  const team = await createTeam(adminApi, `Bauamt ${key}`);
  await addTeamMember(adminApi, team.id, lead.user.id);
  await setUserRolePermissions(adminApi, ["manage_skills"]);
  const leadContext = await openContext(browser, lead.api);
  try {
    const page = await leadContext.newPage();
    await openCreateSkillDialog(page);
    const ownerSelect = page.getByTestId("skill-create-owner");
    await expect(ownerSelect).toHaveCount(0);

    await setTeamMemberRole(adminApi, team.id, lead.user.id, "admin");

    await openCreateSkillDialog(page);
    await ownerSelect.click();
    await expect(
      page.getByTestId(`skill-create-owner-option-team:${team.id}`),
    ).toBeVisible();
    await expect(page.getByTestId("skill-create-owner-option-org")).toHaveCount(
      0,
    );
    expect(
      (
        await requestSkillCreation(
          lead.api,
          { ownerType: "team", teamId: team.id },
          `Bauantrag ${key}`,
        )
      ).status(),
    ).toBe(201);
  } finally {
    await leadContext.close();
    await Promise.all([adminApi, lead.api].map((api) => api.dispose()));
  }
});
