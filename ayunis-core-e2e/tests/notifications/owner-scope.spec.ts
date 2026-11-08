import { randomUUID } from "node:crypto";
import { login } from "../../src/clients/api/auth.client";
import { skipChatPersonalization } from "../../src/clients/api/chat-settings.client";
import {
  getNotification,
  listNotifications,
  notificationsOfRoutine,
  notifyingRoutine,
  requestNotification,
  requestNotificationRead,
  requestThreadAboutNotification,
} from "../../src/clients/api/notifications.client";
import { getDefaultModelSelection } from "../../src/clients/api/model-modes.client";
import { dismissWelcomeVideo } from "../../src/clients/api/onboarding.client";
import {
  createRoutine,
  getRoutine,
  runRoutineNow,
} from "../../src/clients/api/routines.client";
import { createApiContext } from "../../src/factories/api-context.factory";
import { createUser } from "../../src/factories/user.factory";
import { inboxItem } from "../../src/flows/notifications.flow";
import { test, expect } from "../../src/fixtures/test";

const emptySession = { cookies: [], origins: [] };

test("another member of the organization can neither see nor read a user's notification, while its owner can", async ({
  api,
  browser,
  mail,
}) => {
  const key = `inbox-${randomUUID().slice(0, 8)}`;
  const subject = `Gewerberecht ${key}`;
  const headline = `Neue Verordnung: ${subject}`;
  const routine = await createRoutine(
    api,
    notifyingRoutine(`Amtsblatt ${key}`, subject),
  );
  await runRoutineNow(api, routine.id);
  await expect
    .poll(async () => (await getRoutine(api, routine.id)).lastRunStatus, {
      timeout: 30_000,
    })
    .toBe("succeeded");
  const [notification] = await notificationsOfRoutine(api, routine.id);
  expect(notification).toBeDefined();

  const member = await createUser(api, mail, key);
  const memberApi = await createApiContext(emptySession);
  await login(memberApi, member.email, member.password);
  await dismissWelcomeVideo(memberApi);
  await skipChatPersonalization(memberApi);
  const memberModel = await getDefaultModelSelection(memberApi);

  expect((await listNotifications(memberApi)).map((n) => n.id)).not.toContain(
    notification.id,
  );
  expect(
    (await requestNotification(memberApi, notification.id)).status(),
  ).toBe(404);
  expect(
    (await requestNotificationRead(memberApi, notification.id)).status(),
  ).toBe(404);
  expect(
    (
      await requestThreadAboutNotification(
        memberApi,
        memberModel.permittedModelId,
        notification.id,
      )
    ).status(),
  ).toBe(404);

  const memberContext = await browser.newContext({
    storageState: await memberApi.storageState(),
  });
  const memberPage = await memberContext.newPage();
  await memberPage.goto("/inbox");
  await expect(memberPage.getByTestId("sidebar-footer-inbox")).toBeVisible();
  await expect(inboxItem(memberPage, headline)).toHaveCount(0);
  await memberPage.goto(`/inbox/${notification.id}`);
  await expect(memberPage.getByTestId("error-fallback")).toBeVisible();
  await expect(memberPage.getByTestId("notification-chat-starter")).toHaveCount(
    0,
  );
  await memberContext.close();
  await memberApi.dispose();

  // The member's attempts changed nothing; the owner still reads it.
  expect(await getNotification(api, notification.id)).toMatchObject({
    id: notification.id,
    readAt: null,
  });
  const read = await requestNotificationRead(api, notification.id);
  expect(read.status()).toBe(201);
  expect((await read.json()) as { readAt: string | null }).toMatchObject({
    readAt: expect.any(String),
  });
});
