import { randomUUID } from "node:crypto";
import {
  getNotification,
  notificationsOfRoutine,
  notifyingRoutine,
} from "../../src/clients/api/notifications.client";
import {
  createRoutine,
  finishingRoutine,
  findRoutineThread,
  getRoutine,
  runRoutineNow,
} from "../../src/clients/api/routines.client";
import { getThread } from "../../src/clients/api/threads.client";
import { sendMessage } from "../../src/flows/chat.flow";
import { inboxItem } from "../../src/flows/notifications.flow";
import { test, expect } from "../../src/fixtures/test";

test("a routine's notification lands in the inbox, links to its routine chat and can be discussed in a chat started from its page", async ({
  api,
  page,
}) => {
  const subject = `Grundsteuer ${randomUUID().slice(0, 8)}`;
  const headline = `Neue Verordnung: ${subject}`;
  const name = `Amtsblatt ${subject}`;
  const routine = await createRoutine(api, notifyingRoutine(name, subject));
  await runRoutineNow(api, routine.id);
  await expect
    .poll(async () => (await getRoutine(api, routine.id)).lastRunStatus, {
      timeout: 30_000,
    })
    .toBe("succeeded");
  const [notification] = await notificationsOfRoutine(api, routine.id);
  expect(notification).toMatchObject({ headline, type: "routine", readAt: null });
  const routineThread = await findRoutineThread(api, name);
  expect(notification.routineThreadId).toBe(routineThread.id);

  await page.goto("/chat");
  await expect(page.getByTestId("sidebar-inbox-unread-count")).toBeVisible();
  await page.getByTestId("sidebar-footer-inbox").click();
  const item = inboxItem(page, headline);
  await expect(item).toHaveAttribute("data-unread", "true");
  await item.click();

  await expect(page.getByTestId("notification-detail-headline")).toContainText(
    headline,
  );
  const sourceLink = page
    .getByTestId("notification-detail")
    .getByRole("link", { name: "Verordnung zur Änderung der Grundsteuer" });
  await expect(sourceLink).toHaveAttribute(
    "href",
    "https://example.org/gvbl/2026/34",
  );
  await expect(sourceLink).toHaveAttribute("target", "_blank");
  await expect
    .poll(async () => (await getNotification(api, notification.id)).readAt)
    .not.toBeNull();

  await page.getByTestId("notification-open-routine-chat").click();
  await expect(page).toHaveURL(new RegExp(`/chats/${routineThread.id}`));
  await expect(page.getByTestId("routine-finished")).toBeVisible();

  await page.goBack();
  await expect(page.getByTestId("notification-chat-starter")).toBeVisible();
  await sendMessage(page, "E2E quote notification");
  await expect(page).toHaveURL(/\/chats\/[0-9a-f-]+/);
  await expect(page.getByTestId("assistant-message").last()).toContainText(
    `notification::${headline}`,
  );
  const chatId = /\/chats\/([0-9a-f-]+)/.exec(page.url())?.[1] ?? "";
  const chat = await getThread(api, chatId);
  expect(chat).toMatchObject({
    type: "chat",
    sourceNotificationId: notification.id,
    workspaceId: null,
  });

  await page.getByTestId("chat-source-notification").click();
  await expect(page).toHaveURL(new RegExp(`/inbox/${notification.id}`));
});

test("a notification can be marked read from the inbox list without opening it", async ({
  api,
  page,
}) => {
  const subject = `Kitagebühren ${randomUUID().slice(0, 8)}`;
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
  await expect
    .poll(async () => (await notificationsOfRoutine(api, routine.id)).length)
    .toBe(1);
  const [notification] = await notificationsOfRoutine(api, routine.id);

  await page.goto("/inbox");
  const item = inboxItem(page, notification.headline);
  await expect(item).toHaveAttribute("data-unread", "true");
  await item.getByTestId("notification-mark-read").click();

  await expect(item).toHaveAttribute("data-unread", "false");
  await expect(item.getByTestId("notification-unread-dot")).toHaveCount(0);
  await expect(item.getByTestId("notification-mark-read")).toHaveCount(0);
  await expect(page).toHaveURL(/\/inbox$/);
  expect((await getNotification(api, notification.id)).readAt).not.toBeNull();
});

test("a routine that finds nothing relevant ends without a notification", async ({
  api,
}) => {
  const routine = await createRoutine(
    api,
    finishingRoutine(`Amtsblatt ${randomUUID().slice(0, 8)}`),
  );
  await runRoutineNow(api, routine.id);
  await expect
    .poll(async () => (await getRoutine(api, routine.id)).lastRunStatus, {
      timeout: 30_000,
    })
    .toBe("succeeded");

  expect(await notificationsOfRoutine(api, routine.id)).toEqual([]);
});
