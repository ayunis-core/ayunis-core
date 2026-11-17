import { randomUUID } from "node:crypto";
import type { APIRequestContext, BrowserContext, Page } from "@playwright/test";
import { login } from "../../src/clients/api/auth.client";
import { skipChatPersonalization } from "../../src/clients/api/chat-settings.client";
import { requestMarketplaceSkillInstall } from "../../src/clients/api/marketplace.client";
import { dismissWelcomeVideo } from "../../src/clients/api/onboarding.client";
import {
  getRolePermissions,
  getUserRolePermissions,
  setUserRolePermissions,
} from "../../src/clients/api/role-permissions.client";
import type { MailcatcherClient } from "../../src/clients/mailcatcher.client";
import {
  CreateInviteDtoRole,
  type UpdateRolePermissionsDtoPermissionsItem,
} from "../../src/clients/generated/ayunisCoreAPI.schemas";
import { createApiContext } from "../../src/factories/api-context.factory";
import { createOrg } from "../../src/factories/org.factory";
import { createUser } from "../../src/factories/user.factory";
import { test, expect } from "../../src/fixtures/test";

// Served by the Marketplace stand-in (src/servers/marketplace-mock.mjs).
const MARKETPLACE_SKILL = "e2e-sitzungsprotokoll";
const emptySession = { cookies: [], origins: [] };

async function signIn(
  adminApi: APIRequestContext,
  mail: MailcatcherClient,
  key: string,
  role: CreateInviteDtoRole,
): Promise<APIRequestContext> {
  const user = await createUser(adminApi, mail, key, role);
  const api = await createApiContext(emptySession);
  await login(api, user.email, user.password);
  await dismissWelcomeVideo(api);
  await skipChatPersonalization(api);
  return api;
}

async function openInstallPage(page: Page): Promise<void> {
  const marketplaceConfig = page.waitForResponse((response) =>
    response.url().includes("/api/marketplace/config"),
  );
  await page.goto(`/install?skill=${MARKETPLACE_SKILL}`);
  await marketplaceConfig;
}

async function installFromInstallPage(page: Page): Promise<void> {
  await openInstallPage(page);
  await expect(page.getByTestId("sidebar-marketplace")).toBeVisible();
  await page.getByTestId("install-skill-confirm").click();
  await expect(page).toHaveURL(/\/skills\/[0-9a-f-]{36}$/);
}

// Changes the USER role of its own organization, so it cannot affect the
// worker organization other specs share.
test("an admin takes Marketplace installs away from users and gives them back", async ({
  browser,
  mail,
}) => {
  test.setTimeout(150_000);
  const key = randomUUID().slice(0, 8);
  const org = await createOrg(
    `marketplace-perms-${key}`,
    test.info().outputPath("marketplace-perms-org.json"),
  );
  const adminApi = await createApiContext(emptySession);
  await login(adminApi, org.admin.email, org.admin.password);
  const memberApi = await signIn(
    adminApi,
    mail,
    `marketplace-user-${key}`,
    CreateInviteDtoRole.user,
  );
  const managerApi = await signIn(
    adminApi,
    mail,
    `marketplace-manager-${key}`,
    CreateInviteDtoRole.manager,
  );
  const contexts: BrowserContext[] = [];
  const openPage = async (api: APIRequestContext): Promise<Page> => {
    const context = await browser.newContext({
      storageState: await api.storageState(),
    });
    contexts.push(context);
    return context.newPage();
  };
  try {
    const defaults = await getUserRolePermissions(adminApi);
    expect(defaults).toContain("install_marketplace_skills");
    expect(await getRolePermissions(adminApi, "manager")).toContain(
      "install_marketplace_skills",
    );

    const adminPage = await openPage(adminApi);
    await adminPage.goto("/admin-settings/roles");
    const userCheckbox = adminPage.getByRole("checkbox", {
      name: "install_marketplace_skills-user",
    });
    await expect(userCheckbox).toBeChecked();
    await userCheckbox.click();
    await adminPage.getByTestId("roles-settings-save").click();
    await expect
      .poll(() => getUserRolePermissions(adminApi))
      .not.toContain("install_marketplace_skills");

    expect(
      (await requestMarketplaceSkillInstall(memberApi, MARKETPLACE_SKILL)).status(),
    ).toBe(403);

    const memberPage = await openPage(memberApi);
    await openInstallPage(memberPage);
    await expect(memberPage.getByTestId("install-no-permission")).toBeVisible();
    await expect(memberPage.getByTestId("install-skill-confirm")).toHaveCount(0);
    await expect(memberPage.getByTestId("sidebar-marketplace")).toHaveCount(0);

    // Client-side navigation keeps the loaded permissions and Marketplace
    // config, so a missing entry point is hidden, not still loading.
    await memberPage.getByTestId("sidebar-navigation-skills").click();
    const createMenu = memberPage.getByTestId("create-skill-menu").last();
    await expect(createMenu).toBeVisible();
    await expect(memberPage.getByTestId("skills-empty-marketplace")).toHaveCount(
      0,
    );
    await createMenu.click();
    await expect(memberPage.getByTestId("create-skill-editor")).toBeVisible();
    await expect(memberPage.getByTestId("create-skill-marketplace")).toHaveCount(
      0,
    );
    await memberPage.getByTestId("create-skill-editor").click();
    await expect(memberPage.getByRole("dialog")).toBeVisible();
    await expect(
      memberPage.getByTestId("create-entity-footer-hint"),
    ).toHaveCount(0);

    await installFromInstallPage(await openPage(managerApi));

    await setUserRolePermissions(
      adminApi,
      defaults as UpdateRolePermissionsDtoPermissionsItem[],
    );

    await installFromInstallPage(memberPage);
    await memberPage.getByTestId("sidebar-navigation-skills").click();
    await expect(memberPage.getByTestId("skills-marketplace-banner")).toBeVisible();
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    await Promise.all([
      adminApi.dispose(),
      memberApi.dispose(),
      managerApi.dispose(),
    ]);
  }
});
