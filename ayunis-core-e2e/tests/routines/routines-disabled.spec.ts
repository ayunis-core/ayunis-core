import { randomUUID } from "node:crypto";
import { login } from "../../src/clients/api/auth.client";
import {
  requestFavoriteToggle,
  requestFavorites,
  toggleFavorite,
} from "../../src/clients/api/favorites.client";
import { generatedApi } from "../../src/clients/api/generated-api";
import {
  requestMarketplaceRoutine,
  requestMarketplaceRoutineInstall,
} from "../../src/clients/api/marketplace.client";
import { getRolePermissions } from "../../src/clients/api/role-permissions.client";
import {
  createRoutine,
  finishingRoutine,
  requestFeatureToggles,
  requestRoutineLinkAdd,
  requestRoutineLinkRemoval,
  requestRoutineLinks,
  requestRoutineRun,
  requestRoutines,
} from "../../src/clients/api/routines.client";
import {
  requestNotifications,
  requestUnreadNotificationCount,
} from "../../src/clients/api/notifications.client";
import { createApiContext } from "../../src/factories/api-context.factory";
import { createOrg } from "../../src/factories/org.factory";
import { sendMessage } from "../../src/flows/chat.flow";
import { searchMarketplaceInNewChat } from "../../src/flows/marketplace-search.flow";
import { test, expect } from "../../src/fixtures/test";

// Same database and frontend build, served by a second backend started with
// FEATURE_ROUTINES_ENABLED=false (see .github/workflows/e2e-tests.yml).
const disabledBaseUrl =
  process.env.E2E_ROUTINES_DISABLED_BASE_URL ?? "http://localhost:3003";
// Locally the dev frontend and backend listen on different ports.
const disabledApiUrl =
  process.env.E2E_ROUTINES_DISABLED_API_URL ?? disabledBaseUrl;

test("with routines disabled there are no routine or inbox endpoints or UI, and chats still work", async ({
  api,
  org,
  page,
}) => {
  const toggles = await requestFeatureToggles(api, disabledApiUrl);
  expect(await toggles.json()).toMatchObject({ routinesEnabled: false });
  expect((await requestRoutines(api, disabledApiUrl)).status()).toBe(404);
  expect(
    (await requestRoutineRun(api, randomUUID(), disabledApiUrl)).status(),
  ).toBe(404);
  for (const kind of ["mcp-integrations", "knowledge-bases"] as const) {
    const routineId = randomUUID();
    const linkedId = randomUUID();
    const responses = await Promise.all([
      requestRoutineLinks(api, routineId, kind, disabledApiUrl),
      requestRoutineLinkAdd(api, routineId, kind, linkedId, disabledApiUrl),
      requestRoutineLinkRemoval(api, routineId, kind, linkedId, disabledApiUrl),
    ]);
    expect(responses.map((response) => response.status())).toEqual([
      404, 404, 404,
    ]);
  }
  // Served by the Marketplace stand-in (src/servers/marketplace-mock.mjs).
  const marketplaceRoutine = "e2e-amtsblatt";
  expect(
    (
      await requestMarketplaceRoutine(api, marketplaceRoutine, disabledApiUrl)
    ).status(),
  ).toBe(404);
  expect(
    (
      await requestMarketplaceRoutineInstall(
        api,
        marketplaceRoutine,
        disabledApiUrl,
      )
    ).status(),
  ).toBe(404);
  expect((await requestNotifications(api, disabledApiUrl)).status()).toBe(404);
  expect(
    (await requestUnreadNotificationCount(api, disabledApiUrl)).status(),
  ).toBe(404);

  await page.goto(`${disabledBaseUrl}/inbox`);
  await expect(page).toHaveURL(/\/chat$/);
  await page.goto(`${disabledBaseUrl}/routines`);
  await expect(page).toHaveURL(/\/chat$/);
  await page.goto(`${disabledBaseUrl}/routines/${randomUUID()}`);
  await expect(page).toHaveURL(/\/chat$/);
  await expect(page.getByTestId("sidebar")).toBeVisible();
  await expect(page.getByTestId("sidebar-navigation-routines")).toHaveCount(0);
  await expect(page.getByTestId("sidebar-chats-filter")).toHaveCount(0);
  await expect(page.getByTestId("sidebar-inbox")).toHaveCount(0);
  await expect(page.getByTestId("input")).toBeVisible();
  await expect(page.getByTestId("new-chat-unread-notifications")).toHaveCount(
    0,
  );

  await sendMessage(page, "Wann hat das Bürgerbüro geöffnet?");
  await expect(page.getByTestId("assistant-message").last()).toContainText(
    `${org.defaultModel.provider}::${org.defaultModel.name}`,
  );

  await page.goto(`${disabledBaseUrl}/install?routine=${marketplaceRoutine}`);
  await expect(page.getByTestId("install-routine-disabled")).toBeVisible();
  await expect(page.getByTestId("install-routine-card")).toHaveCount(0);
});

test("with routines disabled, routine favorites are hidden and cannot be added, and other favorites stay", async ({
  api,
}) => {
  const key = randomUUID().slice(0, 8);
  const favorited = await createRoutine(
    api,
    finishingRoutine(`Amtsblatt ${key}`),
  );
  const other = await createRoutine(api, finishingRoutine(`Gesetzblatt ${key}`));
  const workspace = await generatedApi.workspacesControllerCreate(
    { name: `Haushalt ${key}` },
    { api },
  );
  await toggleFavorite(api, "routine", favorited.id);
  await toggleFavorite(api, "workspace", workspace.id);

  const favorites = await requestFavorites(api, disabledApiUrl);
  expect(favorites.status()).toBe(200);
  const referenceIds = ((await favorites.json()) as { referenceId: string }[])
    .map((favorite) => favorite.referenceId);
  expect(referenceIds).toContain(workspace.id);
  expect(referenceIds).not.toContain(favorited.id);
  expect(
    (
      await requestFavoriteToggle(api, "routine", other.id, disabledApiUrl)
    ).status(),
  ).toBe(404);
});

test("with routines disabled the chat's marketplace search lists skills but no routines", async ({
  api,
  page,
}) => {
  // Served by the Marketplace stand-in (src/servers/marketplace-mock.mjs).
  const routines = await searchMarketplaceInNewChat(
    page,
    api,
    { type: "routine" },
    disabledBaseUrl,
  );
  await expect(routines).toContainText("marketplace-search::0");

  const all = await searchMarketplaceInNewChat(page, api, {}, disabledBaseUrl);
  await expect(all).toContainText("/install?skill=e2e-sitzungsprotokoll");
  await expect(all).not.toContainText("/install?routine=");
});

// Changes the MANAGER role of its own organization, so it cannot affect the
// worker organization other specs share.
test("with routines disabled the roles settings hide the routines permission and keep its grant", async ({
  browser,
}) => {
  const key = randomUUID().slice(0, 8);
  const org = await createOrg(
    `routines-off-roles-${key}`,
    test.info().outputPath("routines-off-roles-org.json"),
  );
  const adminApi = await createApiContext({ cookies: [], origins: [] });
  await login(adminApi, org.admin.email, org.admin.password);
  const context = await browser.newContext({
    storageState: await adminApi.storageState(),
  });
  try {
    const page = await context.newPage();
    await page.goto(`${disabledBaseUrl}/admin-settings/roles`);
    const shareWithOrg = page.getByRole("checkbox", {
      name: "share_skills_with_org-manager",
    });
    await expect(shareWithOrg).toBeChecked();
    for (const permission of [
      "manage_routines",
      "install_marketplace_routines",
    ]) {
      await expect(
        page.getByRole("checkbox", { name: `${permission}-manager` }),
      ).toHaveCount(0);
    }

    await shareWithOrg.click();
    await page.getByTestId("roles-settings-save").click();
    await expect
      .poll(() => getRolePermissions(adminApi, "manager"))
      .not.toContain("share_skills_with_org");
    expect(await getRolePermissions(adminApi, "manager")).toEqual(
      expect.arrayContaining([
        "manage_routines",
        "install_marketplace_routines",
      ]),
    );
  } finally {
    await context.close();
    await adminApi.dispose();
  }
});
