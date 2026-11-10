import { randomUUID } from "node:crypto";
import type { APIRequestContext, BrowserContext } from "@playwright/test";
import { login } from "../../src/clients/api/auth.client";
import { skipChatPersonalization } from "../../src/clients/api/chat-settings.client";
import { getEffectiveDefaultModel } from "../../src/clients/api/models.client";
import { dismissWelcomeVideo } from "../../src/clients/api/onboarding.client";
import {
  getUserRolePermissions,
  setUserRolePermissions,
} from "../../src/clients/api/role-permissions.client";
import {
  createRoutine,
  finishingRoutine,
  getRoutine,
  listRoutines,
} from "../../src/clients/api/routines.client";
import type { UpdateRolePermissionsDtoPermissionsItem } from "../../src/clients/generated/ayunisCoreAPI.schemas";
import { createApiContext } from "../../src/factories/api-context.factory";
import { createOrg } from "../../src/factories/org.factory";
import { createUser } from "../../src/factories/user.factory";
import { sendMessage } from "../../src/flows/chat.flow";
import { test, expect } from "../../src/fixtures/test";

const emptySession = { cookies: [], origins: [] };

async function defaultModelOf(api: APIRequestContext) {
  const model = await getEffectiveDefaultModel(api);
  if (!model) throw new Error("The worker org has no default model");
  return model;
}

test("creates the routine the assistant proposes in the chat", async ({
  api,
  page,
}) => {
  const name = `Amtsblatt ${randomUUID().slice(0, 8)}`;
  await page.goto("/chat");
  await sendMessage(page, `E2E create routine: ${name}`);

  const widget = page.getByTestId("create-routine-widget");
  await expect(widget.getByTestId("routine-form-name")).toHaveValue(name);
  await widget.getByTestId("create-routine-widget-submit").click();

  await expect
    .poll(async () => (await listRoutines(api)).find((r) => r.name === name))
    .toMatchObject({
      dailyTime: "06:45",
      internetEnabled: true,
      modelId: null,
      enabled: true,
    });
});

test("edits a routine from the chat and keeps what the edit leaves unchanged", async ({
  api,
  page,
}) => {
  const model = await defaultModelOf(api);
  const routine = await createRoutine(api, {
    ...finishingRoutine(`Bebauungspläne ${randomUUID().slice(0, 8)}`),
    modelId: model.id,
    internetEnabled: true,
  });
  await page.goto("/chat");
  await sendMessage(page, `E2E edit routine: ${routine.id}`);

  const widget = page.getByTestId("edit-routine-widget");
  await expect(widget.getByTestId("routine-form-name")).toHaveValue(
    routine.name,
  );
  await widget.getByTestId("edit-routine-widget-submit").click();

  await expect
    .poll(() => getRoutine(api, routine.id))
    .toMatchObject({
      name: routine.name,
      prompt: routine.prompt,
      modelId: model.id,
      dailyTime: "08:15",
      internetEnabled: false,
    });
});

// Changes the USER role of its own organization, so it cannot affect the
// worker organization other specs share.
test("offers the routine widgets only to members who may manage routines", async ({
  browser,
  mail,
}) => {
  test.setTimeout(120_000);
  const key = randomUUID().slice(0, 8);
  const org = await createOrg(
    `routine-widget-${key}`,
    test.info().outputPath("routine-widget-org.json"),
  );
  const adminApi = await createApiContext(emptySession);
  await login(adminApi, org.admin.email, org.admin.password);
  const member = await createUser(adminApi, mail, `routine-widget-${key}`);
  const memberApi = await createApiContext(emptySession);
  await login(memberApi, member.email, member.password);
  await dismissWelcomeVideo(memberApi);
  await skipChatPersonalization(memberApi);
  const contexts: BrowserContext[] = [];
  try {
    const defaults = await getUserRolePermissions(adminApi);
    await setUserRolePermissions(
      adminApi,
      defaults.filter(
        (permission) => permission !== "manage_routines",
      ) as UpdateRolePermissionsDtoPermissionsItem[],
    );
    const memberContext = await browser.newContext({
      storageState: await memberApi.storageState(),
    });
    contexts.push(memberContext);
    const memberPage = await memberContext.newPage();

    await memberPage.goto("/chat");
    await sendMessage(memberPage, `E2E create routine: Amtsblatt ${key}`);
    // The mock's default reply names the model; it answers so only without the widget.
    await expect(
      memberPage.getByTestId("assistant-message").last(),
    ).toContainText("::");
    await expect(memberPage.getByTestId("create-routine-widget")).toHaveCount(0);

    await setUserRolePermissions(
      adminApi,
      defaults as UpdateRolePermissionsDtoPermissionsItem[],
    );

    await memberPage.goto("/chat");
    await sendMessage(memberPage, `E2E create routine: Amtsblatt ${key}`);
    await expect(memberPage.getByTestId("create-routine-widget")).toBeVisible();
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    await memberApi.dispose();
    await adminApi.dispose();
  }
});
