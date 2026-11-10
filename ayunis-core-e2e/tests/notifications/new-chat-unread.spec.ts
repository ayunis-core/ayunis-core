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
  unreadNotificationItem,
  unreadNotificationsTab,
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
test("unread notifications show in tabs per type under the new chat input, open from there and disappear once read", async ({
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
    const tabs = page.getByTestId("new-chat-unread-notifications-tab");
    await expect(tabs).toHaveCount(2);
    const routineTab = unreadNotificationsTab(page, "routine");
    const errorTab = unreadNotificationsTab(page, "routine_error");
    await expect(tabs.first()).toHaveAttribute("data-type", "routine_error");
    await expect(errorTab).toHaveAttribute("aria-expanded", "false");
    await expect(
      routineTab.getByTestId("new-chat-unread-notifications-count"),
    ).toHaveText("1");
    await expect(
      errorTab.getByTestId("new-chat-unread-notifications-count"),
    ).toHaveText("2");
    await expect(page.getByTestId("sidebar-inbox-unread-count")).toHaveText(
      "3",
    );
    const items = page.getByTestId("new-chat-unread-notification");
    await expect(items).toHaveCount(0);
    await errorTab.click();
    await expect(errorTab).toHaveAttribute("aria-expanded", "true");
    await expect(items).toHaveCount(2);
    for (const item of await items.all()) {
      await expect(item).toHaveAttribute("data-type", "routine_error");
    }

    await page.getByTestId("new-chat-unread-notifications-inbox-link").click();
    await expect(page).toHaveURL(/\/inbox\?type=routine_error$/);
    await expect(page.getByTestId("inbox-type-filter")).toHaveAttribute(
      "data-type",
      "routine_error",
    );
    const inboxItems = page.getByTestId("notification-item");
    await expect(inboxItems).toHaveCount(2);
    await inboxItems.first().getByTestId("notification-mark-read").click();
    await expect(inboxItems.first()).toHaveAttribute("data-unread", "false");

    // Read notifications leave the panel's list, not only its count.
    await page.getByTestId("sidebar-navigation-new-chat").click();
    await expect(
      errorTab.getByTestId("new-chat-unread-notifications-count"),
    ).toHaveText("1");
    await errorTab.click();
    await expect(items).toHaveCount(1);
    await expect(page.getByTestId("sidebar-inbox-unread-count")).toHaveText(
      "2",
    );

    await routineTab.click();
    await expect(routineTab).toHaveAttribute("aria-expanded", "true");
    await expect(errorTab).toHaveAttribute("aria-expanded", "false");
    await expect(items).toHaveCount(1);
    await unreadNotificationItem(page, headline).click();
    await expect(page).toHaveURL(/\/inbox\/[0-9a-f-]{36}$/);
    await expect(page.getByTestId("notification-detail-headline")).toContainText(
      headline,
    );

    await page.getByTestId("sidebar-navigation-new-chat").click();
    await expect(errorTab).toBeVisible();
    await expect(routineTab).toHaveCount(0);
    await expect(page.getByTestId("sidebar-inbox-unread-count")).toHaveText(
      "1",
    );

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

test("another user's unread notifications never show in a user's tabs, counts, list or filtered inbox", async ({
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
      page.getByTestId("new-chat-unread-notifications-tab"),
    ).toHaveCount(1);
    const routineTab = unreadNotificationsTab(page, "routine");
    await expect(
      routineTab.getByTestId("new-chat-unread-notifications-count"),
    ).toHaveText("1");
    await expect(page.getByTestId("sidebar-inbox-unread-count")).toHaveText(
      "1",
    );
    await routineTab.click();
    await expect(unreadNotificationItem(page, headline)).toBeVisible();
    await expect(page.getByTestId("new-chat-unread-notification")).toHaveCount(
      1,
    );
    await expect(unreadNotificationItem(page, otherHeadline)).toHaveCount(0);
    await page.getByTestId("new-chat-unread-notifications-inbox-link").click();
    await expect(page).toHaveURL(/\/inbox\?type=routine$/);
    await expect(inboxItem(page, headline)).toBeVisible();
    await expect(page.getByTestId("notification-item")).toHaveCount(1);
    await expect(inboxItem(page, otherHeadline)).toHaveCount(0);
  } finally {
    await context.close();
    await userApi.dispose();
  }
});
