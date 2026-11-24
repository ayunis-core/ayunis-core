import { randomUUID } from "node:crypto";
import type { APIRequestContext, BrowserContext, Page } from "@playwright/test";
import { login } from "../../src/clients/api/auth.client";
import { dismissWelcomeVideo } from "../../src/clients/api/onboarding.client";
import {
  getUserRolePermissions,
  setUserRolePermissions,
} from "../../src/clients/api/role-permissions.client";
import type { UpdateRolePermissionsDtoPermissionsItem } from "../../src/clients/generated/ayunisCoreAPI.schemas";
import { createApiContext } from "../../src/factories/api-context.factory";
import { createOrg } from "../../src/factories/org.factory";
import { createUser } from "../../src/factories/user.factory";
import { test, expect } from "../../src/fixtures/test";
import { searchMarketplaceInNewChat } from "../../src/flows/marketplace-search.flow";

// Served by the Marketplace stand-in (src/servers/marketplace-mock.mjs).
const SKILL_INSTALL_LINK = "/install?skill=e2e-sitzungsprotokoll";
const ROUTINE_INSTALL_LINK = "/install?routine=e2e-amtsblatt";
const ONLY_ROUTINES = { type: "routine" } as const;
const emptySession = { cookies: [], origins: [] };

// Changes the USER role of its own organization, so it cannot affect the
// worker organization other specs share.
test("the chat's marketplace search lists routines only for users who may install them", async ({
  browser,
  mail,
}) => {
  test.setTimeout(150_000);
  const key = randomUUID().slice(0, 8);
  const org = await createOrg(
    `routine-search-perms-${key}`,
    test.info().outputPath("routine-search-perms-org.json"),
  );
  const adminApi = await createApiContext(emptySession);
  await login(adminApi, org.admin.email, org.admin.password);
  const member = await createUser(adminApi, mail, `routine-search-${key}`);
  const memberApi = await createApiContext(emptySession);
  await login(memberApi, member.email, member.password);
  await dismissWelcomeVideo(memberApi);
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
    expect(defaults).toEqual(
      expect.arrayContaining([
        "manage_routines",
        "install_marketplace_routines",
      ]),
    );
    const without = (permission: string) =>
      defaults.filter(
        (granted) => granted !== permission,
      ) as UpdateRolePermissionsDtoPermissionsItem[];
    const adminPage = await openPage(adminApi);
    const memberPage = await openPage(memberApi);

    await setUserRolePermissions(
      adminApi,
      without("install_marketplace_routines"),
    );
    const withoutInstall = await searchMarketplaceInNewChat(
      memberPage,
      memberApi,
      ONLY_ROUTINES,
    );
    await expect(withoutInstall).toContainText("marketplace-search::0");
    const allWithoutInstall = await searchMarketplaceInNewChat(
      memberPage,
      memberApi,
    );
    await expect(allWithoutInstall).toContainText(SKILL_INSTALL_LINK);
    await expect(allWithoutInstall).not.toContainText(ROUTINE_INSTALL_LINK);
    const forAdmin = await searchMarketplaceInNewChat(
      adminPage,
      adminApi,
      ONLY_ROUTINES,
    );
    await expect(forAdmin).toContainText(ROUTINE_INSTALL_LINK);

    await setUserRolePermissions(adminApi, without("manage_routines"));
    const withoutManage = await searchMarketplaceInNewChat(
      memberPage,
      memberApi,
      ONLY_ROUTINES,
    );
    await expect(withoutManage).toContainText("marketplace-search::0");

    await setUserRolePermissions(
      adminApi,
      defaults as UpdateRolePermissionsDtoPermissionsItem[],
    );
    const routines = await searchMarketplaceInNewChat(
      memberPage,
      memberApi,
      ONLY_ROUTINES,
    );
    await expect(routines).toContainText("routine e2e-amtsblatt");
    await expect(routines).toContainText(ROUTINE_INSTALL_LINK);
    await expect(routines).not.toContainText(SKILL_INSTALL_LINK);
    const all = await searchMarketplaceInNewChat(memberPage, memberApi);
    await expect(all).toContainText(SKILL_INSTALL_LINK);
    await expect(all).toContainText(ROUTINE_INSTALL_LINK);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    await memberApi.dispose();
    await adminApi.dispose();
  }
});
