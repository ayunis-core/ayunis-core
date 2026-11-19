import { randomUUID } from "node:crypto";
import { requestReleaseNotes } from "../../src/clients/api/release-notes.client";
import { requestFeatureToggles } from "../../src/clients/api/routines.client";
import { createMemberSession } from "../../src/factories/user.factory";
import { sidebarInbox } from "../../src/flows/notifications.flow";
import { test, expect } from "../../src/fixtures/test";

// Same database and frontend build, served by a backend started with routines
// on but without ANNOUNCABLE_ORG_ID (see .github/workflows/e2e-tests.yml).
const disabledBaseUrl =
  process.env.E2E_RELEASE_NOTES_DISABLED_BASE_URL ?? "http://localhost:3004";
// Locally the dev frontend and backend listen on different ports.
const disabledApiUrl =
  process.env.E2E_RELEASE_NOTES_DISABLED_API_URL ?? disabledBaseUrl;

test("without an Announcable org ID there is no bell, no product updates page and no release-notes API, while the inbox stays", async ({
  api,
  browser,
  mail,
}) => {
  const toggles = await requestFeatureToggles(api, disabledApiUrl);
  expect(await toggles.json()).toMatchObject({
    routinesEnabled: true,
    releaseNotesEnabled: false,
  });

  const key = `release-off-${randomUUID().slice(0, 8)}`;
  const { api: userApi } = await createMemberSession(api, mail, key);
  const context = await browser.newContext({
    storageState: await userApi.storageState(),
  });
  try {
    expect((await requestReleaseNotes(userApi, disabledApiUrl)).status()).toBe(
      404,
    );
    const page = await context.newPage();

    await page.goto(`${disabledBaseUrl}/news`);

    await expect(page).toHaveURL(/\/chat$/);
    await expect(sidebarInbox(page)).toBeVisible();
    await expect(page.getByTestId("sidebar-product-updates")).toHaveCount(0);
  } finally {
    await context.close();
    await userApi.dispose();
  }
});
