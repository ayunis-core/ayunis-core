import { randomUUID } from "node:crypto";
import type { APIRequestContext, BrowserContext } from "@playwright/test";
import { login } from "../../src/clients/api/auth.client";
import { skipChatPersonalization } from "../../src/clients/api/chat-settings.client";
import { dismissWelcomeVideo } from "../../src/clients/api/onboarding.client";
import {
  getRolePermissions,
  getUserRolePermissions,
  setUserRolePermissions,
} from "../../src/clients/api/role-permissions.client";
import {
  createRoutine,
  findRoutineThread,
  finishingRoutine,
  getRoutine,
  requestRoutine,
  requestRoutineCreation,
  requestRoutineDeletion,
  requestRoutineRun,
  requestRoutineUpdate,
  requestRoutines,
  runRoutineNow,
} from "../../src/clients/api/routines.client";
import { getThread } from "../../src/clients/api/threads.client";
import type { UpdateRolePermissionsDtoPermissionsItem } from "../../src/clients/generated/ayunisCoreAPI.schemas";
import { createApiContext } from "../../src/factories/api-context.factory";
import { createOrg } from "../../src/factories/org.factory";
import { createUser } from "../../src/factories/user.factory";
import { sidebarThreadItem } from "../../src/flows/chat.flow";
import { createBlankRoutine, routineCard } from "../../src/flows/routines.flow";
import { test, expect } from "../../src/fixtures/test";

const emptySession = { cookies: [], origins: [] };

async function runToCompletion(
  api: APIRequestContext,
  routineId: string,
): Promise<void> {
  await runRoutineNow(api, routineId);
  await expect
    .poll(async () => (await getRoutine(api, routineId)).lastRunStatus, {
      timeout: 30_000,
    })
    .toBe("succeeded");
}

async function managementStatuses(
  api: APIRequestContext,
  routineId: string,
): Promise<number[]> {
  const responses = await Promise.all([
    requestRoutines(api),
    requestRoutine(api, routineId),
    requestRoutineCreation(api, finishingRoutine("Abfallkalender")),
    requestRoutineUpdate(api, routineId, { name: "Abfallkalender" }),
    requestRoutineRun(api, routineId),
    requestRoutineDeletion(api, routineId),
  ]);
  return responses.map((response) => response.status());
}

// Changes the USER role of its own organization, so it cannot affect the
// worker organization other specs share.
test("an admin takes routine management away from users and gives it back", async ({
  browser,
  mail,
}) => {
  test.setTimeout(180_000);
  const key = randomUUID().slice(0, 8);
  const org = await createOrg(
    `routine-perms-${key}`,
    test.info().outputPath("routine-perms-org.json"),
  );
  const adminApi = await createApiContext(emptySession);
  await login(adminApi, org.admin.email, org.admin.password);
  const member = await createUser(adminApi, mail, `routine-perms-${key}`);
  const memberApi = await createApiContext(emptySession);
  await login(memberApi, member.email, member.password);
  await dismissWelcomeVideo(memberApi);
  await skipChatPersonalization(memberApi);
  const contexts: BrowserContext[] = [];
  try {
    const defaults = await getUserRolePermissions(adminApi);
    expect(defaults).toContain("manage_routines");
    expect(await getRolePermissions(adminApi, "manager")).toContain(
      "manage_routines",
    );

    const routine = await createRoutine(
      memberApi,
      finishingRoutine(`Amtsblatt ${key}`),
    );
    await runToCompletion(memberApi, routine.id);
    const thread = await findRoutineThread(memberApi, routine.name);

    const adminContext = await browser.newContext({
      storageState: await adminApi.storageState(),
    });
    contexts.push(adminContext);
    const adminPage = await adminContext.newPage();
    await adminPage.goto("/admin-settings/roles");
    const userCheckbox = adminPage.getByRole("checkbox", {
      name: "manage_routines-user",
    });
    await expect(userCheckbox).toBeChecked();
    await userCheckbox.click();
    await adminPage.getByTestId("roles-settings-save").click();
    await expect
      .poll(() => getUserRolePermissions(adminApi))
      .not.toContain("manage_routines");

    expect(await managementStatuses(memberApi, routine.id)).toEqual([
      403, 403, 403, 403, 403, 403,
    ]);
    expect((await getThread(memberApi, thread.id)).id).toBe(thread.id);

    const memberContext = await browser.newContext({
      storageState: await memberApi.storageState(),
    });
    contexts.push(memberContext);
    const memberPage = await memberContext.newPage();
    await memberPage.goto("/routines");
    await expect(memberPage).toHaveURL(/\/chat$/);
    await expect(memberPage.getByTestId("sidebar")).toBeVisible();
    await expect(
      memberPage.getByTestId("sidebar-navigation-routines"),
    ).toHaveCount(0);
    const threadItem = sidebarThreadItem(memberPage, thread.id);
    await expect(threadItem).toBeVisible();
    await threadItem.getByRole("link").click();
    await expect(memberPage.getByTestId("routine-finished")).toBeVisible();

    const adminRoutine = await createRoutine(
      adminApi,
      finishingRoutine(`Amtsblatt Verwaltung ${key}`),
    );
    await runToCompletion(adminApi, adminRoutine.id);

    await setUserRolePermissions(
      adminApi,
      defaults as UpdateRolePermissionsDtoPermissionsItem[],
    );

    await memberPage.reload();
    await memberPage.getByTestId("sidebar-navigation-routines").click();
    await expect(memberPage).toHaveURL(/\/routines$/);
    await expect(routineCard(memberPage, routine.name)).toBeVisible();
    const name = `Bebauungspläne ${key}`;
    await createBlankRoutine(memberPage, {
      name,
      prompt: `E2E finish routine: ${name}`,
    });
    const card = routineCard(memberPage, name);
    await card.getByTestId("routine-card-run-now").click();
    await expect(card.getByTestId("routine-status")).toHaveAttribute(
      "data-status",
      "succeeded",
      { timeout: 30_000 },
    );
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    await memberApi.dispose();
    await adminApi.dispose();
  }
});
