import { randomUUID } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import {
  getNotification,
  listRoutineNotifications,
  notifyingRoutine,
} from "../../src/clients/api/notifications.client";
import {
  createRoutine,
  failingRoutine,
  getRoutine,
  listRoutineThreads,
  runRoutineNow,
  updateRoutine,
} from "../../src/clients/api/routines.client";
import { routineCard } from "../../src/flows/routines.flow";
import { test, expect } from "../../src/fixtures/test";

async function runToEnd(
  api: APIRequestContext,
  routineId: string,
  status: "succeeded" | "failed",
): Promise<void> {
  await runRoutineNow(api, routineId);
  await expect
    .poll(async () => (await getRoutine(api, routineId)).lastRunStatus, {
      timeout: 30_000,
    })
    .toBe(status);
}

test("a routine's page shows its configuration, notifications and chats, and its notifications lead back to it", async ({
  api,
  page,
}) => {
  test.setTimeout(120_000);
  const key = randomUUID().slice(0, 8);
  const subject = `Grundsteuer ${key}`;
  const routine = await createRoutine(
    api,
    notifyingRoutine(`Amtsblatt ${key}`, subject),
  );
  await runToEnd(api, routine.id, "succeeded");
  // The same routine's next run fails and posts an error notification.
  await updateRoutine(api, routine.id, {
    prompt: failingRoutine(routine.name).prompt,
  });
  await runToEnd(api, routine.id, "failed");
  const other = await createRoutine(
    api,
    notifyingRoutine(`Abfallkalender ${key}`, `Abfall ${key}`),
  );
  await runToEnd(api, other.id, "succeeded");
  const [errorNotification, finding] = await listRoutineNotifications(
    api,
    routine.id,
  );
  expect(errorNotification).toMatchObject({ type: "routine_error" });
  expect(finding).toMatchObject({ headline: `Neue Verordnung: ${subject}` });
  const threads = await listRoutineThreads(api, routine.id);
  expect(threads).toHaveLength(2);

  await page.goto("/routines");
  // The row is a real link, so the keyboard opens it too.
  await routineCard(page, routine.name).getByRole("link").press("Enter");
  await expect(page).toHaveURL(new RegExp(`/routines/${routine.id}$`));
  const detail = page.getByTestId("routine-detail");
  await expect(detail.getByTestId("routine-status")).toHaveAttribute(
    "data-status",
    "failed",
  );
  await expect(page.getByTestId("routine-detail-run-now")).toBeEnabled();
  await expect(page.getByTestId("routine-detail-enabled")).toBeChecked();

  const renamed = `Gesetzblatt ${key}`;
  await page.getByTestId("routine-form-name").fill(renamed);
  await page.getByTestId("routine-form-time").fill("06:15");
  // Unsaved edits survive a look at another tab.
  await page.getByTestId("routine-tab-chats").click();
  await expect(page.getByTestId("routine-chat-item")).toHaveCount(2);
  await expect(page.getByTestId("routine-form")).toBeHidden();
  await page.getByTestId("routine-tab-configuration").click();
  await expect(page.getByTestId("routine-form-name")).toHaveValue(renamed);
  await page.getByTestId("routine-form-submit").click();
  await expect
    .poll(async () => getRoutine(api, routine.id))
    .toMatchObject({ name: renamed, dailyTime: "06:15" });

  await page.getByTestId("routine-tab-notifications").click();
  // The last run status stays in the header outside the Configuration tab.
  await expect(page.getByTestId("routine-header-status")).toHaveAttribute(
    "data-status",
    "failed",
  );
  const notificationItems = page
    .getByTestId("routine-notifications-list")
    .getByTestId("notification-item");
  await expect(notificationItems).toHaveCount(2);
  await expect(notificationItems.first()).toHaveAttribute(
    "data-type",
    "routine_error",
  );
  await expect(
    notificationItems.nth(1).getByTestId("notification-item-headline"),
  ).toHaveText(finding.headline);

  await page.getByTestId("routine-tab-chats").click();
  const chatItems = page.getByTestId("routine-chat-item");
  await expect(chatItems).toHaveCount(2);
  await chatItems.first().click();
  await expect(page).toHaveURL(new RegExp(`/chats/${threads[0].id}`));

  await page.goto(`/routines/${routine.id}?tab=notifications`);
  await notificationItems.nth(1).click();
  await expect(page).toHaveURL(new RegExp(`/inbox/${finding.id}`));
  await page.getByTestId("notification-open-routine").click();
  await expect(page).toHaveURL(new RegExp(`/routines/${routine.id}$`));

  await page.getByTestId("routine-detail-delete").click();
  await page.getByTestId("confirmation-confirm").click();
  await expect(page).toHaveURL(/\/routines$/);
  await expect(routineCard(page, renamed)).toHaveCount(0);
  await expect(routineCard(page, other.name)).toBeVisible();

  await expect
    .poll(async () => (await getNotification(api, finding.id)).routineId)
    .toBeNull();
  await page.goto(`/inbox/${finding.id}`);
  await expect(page.getByTestId("notification-chat-starter")).toBeVisible();
  await expect(page.getByTestId("notification-open-routine")).toHaveCount(0);
});
