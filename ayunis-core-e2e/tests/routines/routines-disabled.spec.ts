import { randomUUID } from "node:crypto";
import {
  requestFeatureToggles,
  requestRoutineRun,
  requestRoutines,
} from "../../src/clients/api/routines.client";
import { sendMessage } from "../../src/flows/chat.flow";
import { test, expect } from "../../src/fixtures/test";

// Same database and frontend build, served by a second backend started with
// FEATURE_ROUTINES_ENABLED=false (see .github/workflows/e2e-tests.yml).
const disabledBaseUrl =
  process.env.E2E_ROUTINES_DISABLED_BASE_URL ?? "http://localhost:3003";
// Locally the dev frontend and backend listen on different ports.
const disabledApiUrl =
  process.env.E2E_ROUTINES_DISABLED_API_URL ?? disabledBaseUrl;

test("with routines disabled there are no routine endpoints or UI, and chats still work", async ({
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

  await page.goto(`${disabledBaseUrl}/routines`);
  await expect(page).toHaveURL(/\/chat$/);
  await expect(page.getByTestId("sidebar")).toBeVisible();
  await expect(page.getByTestId("sidebar-navigation-routines")).toHaveCount(0);
  await expect(page.getByTestId("sidebar-chats-filter")).toHaveCount(0);

  await sendMessage(page, "Wann hat das Bürgerbüro geöffnet?");
  await expect(page.getByTestId("assistant-message").last()).toContainText(
    `${org.defaultModel.provider}::${org.defaultModel.name}`,
  );
});
