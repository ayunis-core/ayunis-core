import { randomUUID } from "node:crypto";
import { login } from "../../src/clients/api/auth.client";
import { getRolePermissions } from "../../src/clients/api/role-permissions.client";
import {
  requestFeatureToggles,
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
  await expect(page.getByTestId("sidebar-footer-inbox")).toHaveCount(0);
  await expect(page.getByTestId("input")).toBeVisible();
  await expect(page.getByTestId("new-chat-unread-notifications")).toHaveCount(
    0,
  );

  await sendMessage(page, "Wann hat das Bürgerbüro geöffnet?");
  await expect(page.getByTestId("assistant-message").last()).toContainText(
    `${org.defaultModel.provider}::${org.defaultModel.name}`,
  );
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
    await expect(
      page.getByRole("checkbox", { name: "manage_routines-manager" }),
    ).toHaveCount(0);

    await shareWithOrg.click();
    await page.getByTestId("roles-settings-save").click();
    await expect
      .poll(() => getRolePermissions(adminApi, "manager"))
      .not.toContain("share_skills_with_org");
    expect(await getRolePermissions(adminApi, "manager")).toContain(
      "manage_routines",
    );
  } finally {
    await context.close();
    await adminApi.dispose();
  }
});
