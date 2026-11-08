import { randomUUID } from "node:crypto";
import { requestFeatureToggles } from "../../src/clients/api/routines.client";
import { createReleaseNoteNotification } from "../../src/factories/release-note.factory";
import { createMemberSession } from "../../src/factories/user.factory";
import { inboxItem } from "../../src/flows/notifications.flow";
import { test, expect } from "../../src/fixtures/test";

// Same database and frontend build, served by a backend started with routines
// on but without ANNOUNCABLE_ORG_ID (see .github/workflows/e2e-tests.yml).
const disabledBaseUrl =
  process.env.E2E_RELEASE_NOTES_DISABLED_BASE_URL ?? "http://localhost:3004";
// Locally the dev frontend and backend listen on different ports.
const disabledApiUrl =
  process.env.E2E_RELEASE_NOTES_DISABLED_API_URL ?? disabledBaseUrl;

test("without an Announcable org ID the inbox offers no release-note filter", async ({
  api,
  browser,
  mail,
}) => {
  const toggles = await requestFeatureToggles(api, disabledApiUrl);
  expect(await toggles.json()).toMatchObject({
    routinesEnabled: true,
    releaseNotesEnabled: false,
  });

  // A release note from before the org ID was removed stays readable.
  const key = `release-off-${randomUUID().slice(0, 8)}`;
  const { api: userApi } = await createMemberSession(api, mail, key);
  const context = await browser.newContext({
    storageState: await userApi.storageState(),
  });
  try {
    const headline = `Routinen sind da ${key}`;
    await createReleaseNoteNotification(userApi, headline, null);
    const page = await context.newPage();

    await page.goto(`${disabledBaseUrl}/inbox?type=release_note`);

    await expect(page).toHaveURL(/\/inbox$/);
    await expect(inboxItem(page, headline)).toBeVisible();
    await expect(page.getByTestId("inbox-type-filter")).toHaveCount(0);
  } finally {
    await context.close();
    await userApi.dispose();
  }
});
