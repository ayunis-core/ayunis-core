import { randomUUID } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import {
  listNotifications,
  notifyingRoutine,
  unreadNotificationCount,
} from "../../src/clients/api/notifications.client";
import {
  createRoutine,
  failingRoutine,
  getRoutine,
  runRoutineNow,
} from "../../src/clients/api/routines.client";
import { createMemberSession } from "../../src/factories/user.factory";
import {
  inboxItem,
  sidebarInbox,
  unreadNotificationsButton,
} from "../../src/flows/notifications.flow";
import { test, expect } from "../../src/fixtures/test";

/** Runs a routine whose run sends one notification and waits for it. */
async function sendRoutineNotification(
  api: APIRequestContext,
  subject: string,
): Promise<string> {
  const routine = await createRoutine(
    api,
    notifyingRoutine(`Amtsblatt ${subject}`, subject),
  );
  await runRoutineNow(api, routine.id);
  await expect
    .poll(async () => (await getRoutine(api, routine.id)).lastRunStatus, {
      timeout: 30_000,
    })
    .toBe("succeeded");
  return `Neue Verordnung: ${subject}`;
}

/** Fails a routine's run `times` times; each failure posts an error notification. */
async function sendRoutineErrors(
  api: APIRequestContext,
  name: string,
  times: number,
): Promise<void> {
  const routine = await createRoutine(api, failingRoutine(name));
  for (let failures = 1; failures <= times; failures++) {
    await runRoutineNow(api, routine.id);
    await expect
      .poll(
        async () => (await getRoutine(api, routine.id)).consecutiveFailureCount,
        { timeout: 30_000 },
      )
      .toBe(failures);
  }
}

// A new member, so no other spec's notifications change the counts.
test("unread notifications show per type on the new chat page, open the filtered inbox and disappear once read", async ({
  api,
  browser,
  mail,
}) => {
  test.setTimeout(180_000);
  const key = `unread-${randomUUID().slice(0, 8)}`;
  const { api: userApi } = await createMemberSession(api, mail, key);
  const context = await browser.newContext({
    storageState: await userApi.storageState(),
  });
  try {
    const headline = await sendRoutineNotification(userApi, `Hundesteuer ${key}`);
    await sendRoutineErrors(userApi, `Amtsblatt Fehler ${key}`, 2);
    const page = await context.newPage();

    await page.goto("/chat");
    const buttons = page.getByTestId("new-chat-unread-notifications-button");
    await expect(buttons).toHaveCount(2);
    const routineButton = unreadNotificationsButton(page, "routine");
    const errorButton = unreadNotificationsButton(page, "routine_error");
    await expect(
      routineButton.getByTestId("new-chat-unread-notifications-count"),
    ).toHaveText("1");
    await expect(
      errorButton.getByTestId("new-chat-unread-notifications-count"),
    ).toHaveText("2");
    await expect(page.getByTestId("sidebar-inbox-unread-count")).toHaveText(
      "3",
    );
    // The row starts where the composer's text starts, on desktop and mobile.
    for (const viewport of [
      { width: 1280, height: 800 },
      { width: 375, height: 812 },
    ]) {
      await page.setViewportSize(viewport);
      await expect
        .poll(async () => {
          const button = await buttons.first().boundingBox();
          const text = await page.getByTestId("input").boundingBox();
          return Math.round((button?.x ?? 0) - (text?.x ?? 0));
        })
        .toBe(0);
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    await errorButton.hover();
    await expect(page.getByRole("tooltip")).toBeVisible();

    await errorButton.click();
    await expect(page).toHaveURL(/\/inbox\?type=routine_error$/);
    await expect(page.getByTestId("inbox-type-filter")).toHaveAttribute(
      "data-type",
      "routine_error",
    );
    const items = page.getByTestId("notification-item");
    await expect(items).toHaveCount(2);
    for (const item of await items.all()) {
      await expect(item).toHaveAttribute("data-type", "routine_error");
    }
    await items.first().getByTestId("notification-mark-read").click();
    await expect(items.first()).toHaveAttribute("data-unread", "false");

    await page.getByTestId("inbox-type-filter-clear").click();
    await expect(page).toHaveURL(/\/inbox$/);
    await expect(page.getByTestId("inbox-type-filter")).toHaveCount(0);
    await expect(items).toHaveCount(3);

    await page.getByTestId("sidebar-navigation-new-chat").click();
    await expect(
      errorButton.getByTestId("new-chat-unread-notifications-count"),
    ).toHaveText("1");
    await expect(page.getByTestId("sidebar-inbox-unread-count")).toHaveText(
      "2",
    );

    await routineButton.click();
    await expect(page).toHaveURL(/\/inbox\?type=routine$/);
    await expect(items).toHaveCount(1);
    await inboxItem(page, headline).click();
    await expect(page.getByTestId("notification-detail-headline")).toContainText(
      headline,
    );

    await page.getByTestId("sidebar-navigation-new-chat").click();
    await expect(errorButton).toBeVisible();
    await expect(routineButton).toHaveCount(0);
    await expect(page.getByTestId("sidebar-inbox-unread-count")).toHaveText(
      "1",
    );

    await expect(page.getByTestId("sidebar-navigation-inbox")).toHaveCount(0);
    await sidebarInbox(page).click();
    await expect(page).toHaveURL(/\/inbox$/);
    await page.getByTestId("inbox-mark-all-read").click();
    await expect(page.getByTestId("sidebar-inbox-unread-count")).toHaveCount(0);
    await page.getByTestId("sidebar-navigation-new-chat").click();
    await expect(page.getByTestId("input")).toBeVisible();
    await expect(page.getByTestId("new-chat-unread-notifications")).toHaveCount(
      0,
    );
  } finally {
    await context.close();
    await userApi.dispose();
  }
});

test("another user's unread notifications never show in a user's buttons, counts or filtered inbox", async ({
  api,
  browser,
  mail,
}) => {
  test.setTimeout(180_000);
  const key = `unread-scope-${randomUUID().slice(0, 8)}`;
  const otherHeadline = await sendRoutineNotification(api, `Marktordnung ${key}`);
  await sendRoutineErrors(api, `Amtsblatt Fehler ${key}`, 1);
  const otherCounts = await unreadNotificationCount(api);
  expect(otherCounts.byType.map(({ type }) => type)).toEqual([
    "routine",
    "routine_error",
  ]);

  const { api: userApi } = await createMemberSession(api, mail, key);
  const context = await browser.newContext({
    storageState: await userApi.storageState(),
  });
  try {
    expect(await unreadNotificationCount(userApi)).toEqual({
      count: 0,
      byType: [],
    });
    const page = await context.newPage();
    await page.goto("/chat");
    await expect(page.getByTestId("input")).toBeVisible();
    await expect(page.getByTestId("new-chat-unread-notifications")).toHaveCount(
      0,
    );
    await expect(page.getByTestId("sidebar-inbox-unread-count")).toHaveCount(0);

    const headline = await sendRoutineNotification(userApi, `Friedhofssatzung ${key}`);
    expect(await unreadNotificationCount(userApi)).toEqual({
      count: 1,
      byType: [{ type: "routine", count: 1 }],
    });
    expect(
      (await listNotifications(userApi, "routine")).map((n) => n.headline),
    ).toEqual([headline]);
    expect(await listNotifications(userApi, "routine_error")).toEqual([]);

    await page.reload();
    await expect(
      page.getByTestId("new-chat-unread-notifications-button"),
    ).toHaveCount(1);
    const routineButton = unreadNotificationsButton(page, "routine");
    await expect(
      routineButton.getByTestId("new-chat-unread-notifications-count"),
    ).toHaveText("1");
    await expect(page.getByTestId("sidebar-inbox-unread-count")).toHaveText(
      "1",
    );
    await routineButton.click();
    await expect(page).toHaveURL(/\/inbox\?type=routine$/);
    await expect(inboxItem(page, headline)).toBeVisible();
    await expect(page.getByTestId("notification-item")).toHaveCount(1);
    await expect(inboxItem(page, otherHeadline)).toHaveCount(0);
  } finally {
    await context.close();
    await userApi.dispose();
  }
});
