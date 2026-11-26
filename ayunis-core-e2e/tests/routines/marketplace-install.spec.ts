import { randomUUID } from "node:crypto";
import type { APIRequestContext, BrowserContext, Page } from "@playwright/test";
import { login } from "../../src/clients/api/auth.client";
import {
  installMarketplaceRoutine,
  requestMarketplaceRoutine,
  requestMarketplaceRoutineInstall,
} from "../../src/clients/api/marketplace.client";
import { dismissWelcomeVideo } from "../../src/clients/api/onboarding.client";
import {
  getRolePermissions,
  getUserRolePermissions,
  setUserRolePermissions,
} from "../../src/clients/api/role-permissions.client";
import { getRoutine, listRoutines } from "../../src/clients/api/routines.client";
import type { UpdateRolePermissionsDtoPermissionsItem } from "../../src/clients/generated/ayunisCoreAPI.schemas";
import { createApiContext } from "../../src/factories/api-context.factory";
import { createOrg } from "../../src/factories/org.factory";
import { createUser } from "../../src/factories/user.factory";
import { test, expect } from "../../src/fixtures/test";

// Served by the Marketplace stand-in (src/servers/marketplace-mock.mjs).
const ROUTINE = "e2e-amtsblatt";
const ROUTINE_WITH_IP_DOMAIN = "e2e-ip-domain";
const ROUTINE_UNAVAILABLE = "e2e-marketplace-down";
const ROUTINE_PAGE_URL = /\/routines\/([0-9a-f-]{36})$/;
const emptySession = { cookies: [], origins: [] };

async function installFromInstallPage(page: Page): Promise<string> {
  await page.goto(`/install?routine=${ROUTINE}`);
  await expect(page.getByTestId("install-routine-card")).toBeVisible();
  await page.getByTestId("install-routine-confirm").click();
  await expect(page).toHaveURL(ROUTINE_PAGE_URL);
  await expect(page.getByTestId("routine-detail")).toBeVisible();
  return ROUTINE_PAGE_URL.exec(page.url())?.[1] ?? "";
}

async function marketplaceRoutineIds(
  api: APIRequestContext,
  identifier: string,
): Promise<string[]> {
  return (await listRoutines(api))
    .filter((routine) => routine.marketplaceIdentifier === identifier)
    .map((routine) => routine.id);
}

test("a marketplace routine installs as a switched-on copy with the default model, once per install", async ({
  api,
  page,
}) => {
  const before = await marketplaceRoutineIds(api, ROUTINE);

  const routineId = await installFromInstallPage(page);

  expect(await getRoutine(api, routineId)).toMatchObject({
    name: "Amtsblatt prüfen",
    prompt: "Prüfe das Amtsblatt auf neue Bekanntmachungen.",
    modelId: null,
    schedule: { frequency: "weekly", weekdays: [1, 2, 3, 4, 5, 6, 7] },
    internetAccess: "allowlist",
    allowedDomains: ["recht.nrw.de", "amtsblatt.example.de"],
    enabled: true,
    nextRunAt: expect.any(String),
    marketplaceIdentifier: ROUTINE,
  });

  const second = await installMarketplaceRoutine(api, ROUTINE);
  expect(second.id).not.toBe(routineId);
  expect((await marketplaceRoutineIds(api, ROUTINE)).sort()).toEqual(
    [...before, routineId, second.id].sort(),
  );
});

test("a marketplace routine that is missing, unreachable or invalid is not installed", async ({
  api,
  page,
}) => {
  test.setTimeout(90_000);
  const routinesBefore = (await listRoutines(api)).length;
  const missing = `e2e-missing-${randomUUID().slice(0, 8)}`;

  expect((await requestMarketplaceRoutine(api, missing)).status()).toBe(404);
  expect((await requestMarketplaceRoutineInstall(api, missing)).status()).toBe(
    404,
  );
  await page.goto(`/install?routine=${missing}`);
  await expect(page.getByTestId("install-routine-not-found")).toBeVisible();

  const unavailable = await requestMarketplaceRoutineInstall(
    api,
    ROUTINE_UNAVAILABLE,
  );
  expect(unavailable.status()).toBe(503);
  expect(await unavailable.json()).toMatchObject({
    code: "MARKETPLACE_UNAVAILABLE",
  });
  await page.goto(`/install?routine=${ROUTINE_UNAVAILABLE}`);
  // The app retries a read answered with 503 for about 30 s, as it does
  // while the backend restarts during a deploy, before showing the error.
  await expect(page.getByTestId("install-routine-unavailable")).toBeVisible({
    timeout: 45_000,
  });

  const invalid = await requestMarketplaceRoutineInstall(
    api,
    ROUTINE_WITH_IP_DOMAIN,
  );
  expect(invalid.status()).toBe(400);
  expect(await invalid.json()).toMatchObject({
    code: "ROUTINE_INVALID_ALLOWED_DOMAINS",
  });

  expect(await listRoutines(api)).toHaveLength(routinesBefore);
});

// Changes the USER role of its own organization, so it cannot affect the
// worker organization other specs share.
test("installing a marketplace routine needs both routine permissions", async ({
  browser,
  mail,
}) => {
  test.setTimeout(150_000);
  const key = randomUUID().slice(0, 8);
  const org = await createOrg(
    `routine-install-perms-${key}`,
    test.info().outputPath("routine-install-perms-org.json"),
  );
  const adminApi = await createApiContext(emptySession);
  await login(adminApi, org.admin.email, org.admin.password);
  const member = await createUser(adminApi, mail, `routine-install-${key}`);
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
      expect.arrayContaining(["manage_routines", "install_marketplace_routines"]),
    );
    expect(await getRolePermissions(adminApi, "manager")).toContain(
      "install_marketplace_routines",
    );

    const adminPage = await openPage(adminApi);
    await adminPage.goto("/admin-settings/roles");
    const userCheckbox = adminPage.getByRole("checkbox", {
      name: "install_marketplace_routines-user",
    });
    await expect(userCheckbox).toBeChecked();
    await userCheckbox.click();
    await adminPage.getByTestId("roles-settings-save").click();
    await expect
      .poll(() => getUserRolePermissions(adminApi))
      .not.toContain("install_marketplace_routines");

    expect(
      (await requestMarketplaceRoutineInstall(memberApi, ROUTINE)).status(),
    ).toBe(403);
    const memberPage = await openPage(memberApi);
    await memberPage.goto(`/install?routine=${ROUTINE}`);
    await expect(
      memberPage.getByTestId("install-routine-no-permission"),
    ).toBeVisible();
    await expect(memberPage.getByTestId("install-routine-confirm")).toHaveCount(
      0,
    );
    await memberPage.getByTestId("sidebar-navigation-routines").click();
    await memberPage.getByTestId("create-routine-menu").last().click();
    await expect(memberPage.getByTestId("create-routine-blank")).toBeVisible();
    await expect(
      memberPage.getByTestId("create-routine-marketplace"),
    ).toHaveCount(0);

    await setUserRolePermissions(adminApi, [
      ...(defaults.filter(
        (permission) => permission !== "manage_routines",
      ) as UpdateRolePermissionsDtoPermissionsItem[]),
    ]);
    expect(
      (await requestMarketplaceRoutineInstall(memberApi, ROUTINE)).status(),
    ).toBe(403);

    await installFromInstallPage(adminPage);

    await setUserRolePermissions(
      adminApi,
      defaults as UpdateRolePermissionsDtoPermissionsItem[],
    );
    expect(await marketplaceRoutineIds(memberApi, ROUTINE)).toEqual([]);

    const routineId = await installFromInstallPage(memberPage);
    expect(await getRoutine(memberApi, routineId)).toMatchObject({
      marketplaceIdentifier: ROUTINE,
    });
    await memberPage.getByTestId("sidebar-navigation-routines").click();
    await memberPage.getByTestId("create-routine-menu").last().click();
    await expect(memberPage.getByTestId("create-routine-marketplace")).toBeVisible();
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    await memberApi.dispose();
    await adminApi.dispose();
  }
});
