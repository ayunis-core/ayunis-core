import { stubOfficeHost } from "../../src/clients/office-host-stub";
import { expect, test } from "../../src/fixtures/outlook";
import { sendMessage } from "../../src/flows/chat.flow";
import { getEffectiveDefaultModel } from "../../src/clients/api/models.client";
import {
  openSignedInPane,
  storedRefreshToken,
} from "../../src/flows/outlook.flow";

// Outlook may frame only /outlook/taskpane.html (AYC-1899). The chat app in
// the pane keeps its routes in memory and leaves sign-in to the pane, so the
// frame never loads an app route such as /chats or /login.
test.use({ storageState: { cookies: [], origins: [] } });

const PANE_PATH = "/outlook/taskpane.html";

test.beforeEach(async ({ page, api }) => {
  await stubOfficeHost(page);
  await openSignedInPane(page, api);
});

test("loads the pane script and styles from the Outlook build", async ({
  publicApi,
}) => {
  const response = await publicApi.get(PANE_PATH);
  expect(response.ok()).toBe(true);
  const document = await response.text();
  expect(document).toMatch(/<script[^>]+src="\/outlook\/assets\/[^"]+\.js"/);
  expect(document).toMatch(/<link[^>]+href="\/outlook\/assets\/[^"]+\.css"/);
  expect(document).not.toMatch(/(?:src|href)="\/assets\//);
});

test("keeps the Web model-picker hierarchy in a narrow pane", async ({
  page,
  api,
}) => {
  const model = (await getEffectiveDefaultModel(api))!;
  await page.route("**/api/models/modes", (route) =>
    route.fulfill({
      json: [
        {
          mode: "auto",
          permittedModelId: model.id,
          anonymousPermittedModelId: model.id,
        },
      ],
    }),
  );
  await page.reload();
  await page.setViewportSize({ width: 420, height: 720 });
  await page.getByTestId("chat-model-selector").click();

  await expect(
    page.getByTestId("chat-model-selector-more-models"),
  ).toBeVisible();
  await expect(page.getByTestId("chat-model-selector-model")).toHaveCount(0);

  await page.getByTestId("chat-model-selector-more-models").hover();
  await expect(
    page.getByTestId("chat-model-selector-model").first(),
  ).toBeVisible();
});

test("keeps the chat app on the pane document through navigation and reload", async ({
  page,
}) => {
  await expect(page.getByTestId("outlook-new-chat")).toBeVisible();
  await sendMessage(page, `E2E pane chat ${Date.now()}`);
  await expect(page.getByTestId("outlook-conversation")).toBeVisible();
  await expect(page.getByTestId("assistant-message").last()).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(PANE_PATH);

  await page.getByTestId("chat-header-new-chat").click();
  await page.getByTestId("embedded-history").click();
  await expect(page.getByTestId("chat-card")).toHaveCount(1);
  expect(new URL(page.url()).pathname).toBe(PANE_PATH);

  await page.reload();
  await expect(page.getByTestId("outlook-pane-signed-in")).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(PANE_PATH);
});

test("can reach Outlook chats on an older history page", async ({ page }) => {
  await page.route("**/api/threads?**", async (route) => {
    const { searchParams } = new URL(route.request().url());
    const offset = Number(searchParams.get("offset"));
    await route.fulfill({
      json: {
        data: [
          {
            id: String(offset),
            title: offset ? "Older chat" : "Recent chat",
            createdAt: "2026-11-01T12:00:00Z",
            origin: { kind: "chat" },
            isAnonymous: false,
          },
        ],
        pagination: { limit: 20, offset, total: 21 },
      },
    });
  });
  await page.getByTestId("embedded-history").click();
  await expect(page.getByTestId("chat-card")).toHaveText("Recent chat");
  await page.getByTestId("outlook-history-next").click();
  await expect(page.getByTestId("chat-card")).toHaveText("Older chat");
  await page.getByTestId("outlook-history-previous").click();
  await expect(page.getByTestId("chat-card")).toHaveText("Recent chat");
});

test("can retry a saved Outlook chat that fails to load", async ({ page }) => {
  await sendMessage(page, "E2E conversation to load again");
  await expect(page.getByTestId("assistant-message").last()).toBeVisible();
  await page.reload();
  await page.getByTestId("embedded-history").click();
  await page.route(
    "**/api/threads/*",
    (route) => route.fulfill({ status: 503 }),
    { times: 1 },
  );
  await page.getByTestId("chat-card").click();
  await page.getByTestId("chat-thread-retry").click();
  await expect(page.getByTestId("assistant-message").last()).toBeVisible();
});

test("shows the pane sign-in when the session ends inside the chat app", async ({
  page,
}) => {
  await expect(page.getByTestId("chat-input")).toBeVisible();
  await page.route("**/api/threads?**", (route) =>
    route.fulfill({ status: 401, json: { code: "UNAUTHORIZED" } }),
  );
  await page.route("**/api/auth/refresh", (route) =>
    route.fulfill({ status: 401, json: { code: "UNAUTHORIZED" } }),
  );

  await page.getByTestId("embedded-history").click();

  await expect(page.getByTestId("outlook-pane-signed-out")).toBeVisible();
  await expect(page.getByTestId("outlook-pane-error")).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(PANE_PATH);
  expect(await storedRefreshToken(page)).toBeNull();
});
