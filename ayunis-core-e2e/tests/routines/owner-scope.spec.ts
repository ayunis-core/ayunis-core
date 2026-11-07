import { randomUUID } from "node:crypto";
import { login } from "../../src/clients/api/auth.client";
import { skipChatPersonalization } from "../../src/clients/api/chat-settings.client";
import { dismissWelcomeVideo } from "../../src/clients/api/onboarding.client";
import {
  createRoutine,
  finishingRoutine,
  listRoutines,
  requestRoutine,
  requestRoutineDeletion,
  requestRoutineRun,
  requestRoutineUpdate,
} from "../../src/clients/api/routines.client";
import { createApiContext } from "../../src/factories/api-context.factory";
import { createUser } from "../../src/factories/user.factory";
import { test, expect } from "../../src/fixtures/test";

const emptySession = { cookies: [], origins: [] };

test("another member of the organization can neither see nor change a user's routine", async ({
  api,
  browser,
  mail,
}) => {
  const key = `routine-scope-${randomUUID()}`;
  const routine = await createRoutine(api, finishingRoutine(`Amtsblatt ${key}`));

  const member = await createUser(api, mail, key);
  const memberApi = await createApiContext(emptySession);
  await login(memberApi, member.email, member.password);
  await dismissWelcomeVideo(memberApi);
  await skipChatPersonalization(memberApi);

  expect((await listRoutines(memberApi)).map((r) => r.id)).not.toContain(
    routine.id,
  );
  expect((await requestRoutine(memberApi, routine.id)).status()).toBe(404);
  expect(
    (
      await requestRoutineUpdate(memberApi, routine.id, { name: "Übernommen" })
    ).status(),
  ).toBe(404);
  expect((await requestRoutineRun(memberApi, routine.id)).status()).toBe(404);
  expect((await requestRoutineDeletion(memberApi, routine.id)).status()).toBe(
    404,
  );

  const memberContext = await browser.newContext({
    storageState: await memberApi.storageState(),
  });
  const memberPage = await memberContext.newPage();
  await memberPage.goto("/routines");
  await expect(memberPage.getByTestId("create-routine-menu")).toBeVisible();
  await expect(memberPage.getByTestId("routine-card")).toHaveCount(0);
  await memberContext.close();

  const ownerView = await listRoutines(api);
  expect(ownerView.find((r) => r.id === routine.id)).toMatchObject({
    name: routine.name,
    lastRunStatus: null,
  });
  await memberApi.dispose();
});
