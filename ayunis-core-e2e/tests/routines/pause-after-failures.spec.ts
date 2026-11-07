import {
  createRoutine,
  failingRoutine,
  getRoutine,
  runRoutineNow,
} from "../../src/clients/api/routines.client";
import { notificationsOfRoutine } from "../../src/clients/api/notifications.client";
import { routineCard } from "../../src/flows/routines.flow";
import { test, expect } from "../../src/fixtures/test";

test("a routine paused after three failed runs says so in the inbox and resumes its daily run when switched back on", async ({
  api,
  page,
}) => {
  const name = `Amtsblatt ${Date.now()}`;
  const routine = await createRoutine(api, failingRoutine(name));

  // Each run waits for the previous one to be recorded, so the failures are
  // consecutive runs, not one deduplicated Run now.
  for (let failures = 1; failures <= 3; failures++) {
    await runRoutineNow(api, routine.id);
    await expect
      .poll(
        async () => (await getRoutine(api, routine.id)).consecutiveFailureCount,
        { timeout: 30_000 },
      )
      .toBe(failures);
  }

  // Newest first: each failure posted an error notification linking its
  // routine thread, and the third one says the routine is paused.
  const notifications = await notificationsOfRoutine(api, routine.id);
  expect(notifications).toHaveLength(3);
  for (const notification of notifications) {
    expect(notification).toMatchObject({
      type: "routine_error",
      routineThreadId: expect.any(String),
    });
  }
  expect(notifications[0].headline).toContain("pausiert");
  expect(notifications[0].body).toContain("wieder ein");
  expect(notifications[1].headline).toContain("fehlgeschlagen");

  await page.goto(`/inbox/${notifications[0].id}`);
  await expect(page.getByTestId("notification-detail")).toHaveAttribute(
    "data-type",
    "routine_error",
  );
  await expect(page.getByTestId("notification-error-icon")).toBeVisible();

  await page.goto("/routines");
  const card = routineCard(page, name);
  const enabledSwitch = card.getByTestId("routine-card-enabled");
  await expect(card.getByTestId("routine-paused")).toBeVisible();
  await expect(card.getByTestId("routine-next-run")).toHaveCount(0);
  await expect(enabledSwitch).not.toBeChecked();

  await enabledSwitch.click();

  await expect(card.getByTestId("routine-paused")).toHaveCount(0);
  await expect(card.getByTestId("routine-next-run")).toBeVisible();
  await expect(enabledSwitch).toBeChecked();
  expect(await getRoutine(api, routine.id)).toMatchObject({
    enabled: true,
    pausedAt: null,
    consecutiveFailureCount: 0,
    nextRunAt: expect.any(String),
  });
});
