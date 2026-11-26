import { randomUUID } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";
import { listNotifications } from "../../src/clients/api/notifications.client";
import { createMemberSession } from "../../src/factories/user.factory";
import {
  inboxItem,
  unreadNotificationsTab,
} from "../../src/flows/notifications.flow";
import {
  addWorkspaceMembersThroughUi,
  openWorkspaceMembers,
} from "../../src/flows/workspace-members.flow";

const headline = "Sie wurden zu einem Arbeitsbereich hinzugefügt";

async function notificationsAbout(
  api: APIRequestContext,
  workspaceId: string,
) {
  return (await listNotifications(api, "organization")).filter(
    (notification) => notification.workspaceId === workspaceId,
  );
}

test("a user added to a workspace finds it in their inbox and opens the workspace from there", async ({
  api,
  page,
  browser,
  mail,
}) => {
  const key = randomUUID().slice(0, 8);
  const name = `Bauamt ${key}`;
  const workspace = await generatedApi.workspacesControllerCreate(
    { name, icon: "building-2" },
    { api },
  );
  const added = await createMemberSession(api, mail, `ws-added-${key}`);
  const context = await browser.newContext({
    storageState: await added.api.storageState(),
  });
  try {
    expect(await notificationsAbout(added.api, workspace.id)).toEqual([]);

    await openWorkspaceMembers(page, workspace.id);
    await addWorkspaceMembersThroughUi(page, [added.member], "user");

    expect(await notificationsAbout(added.api, workspace.id)).toHaveLength(1);
    // The admin who added the member is not notified.
    expect(await notificationsAbout(api, workspace.id)).toEqual([]);

    const addedPage = await context.newPage();
    await addedPage.goto("/chat");
    await expect(unreadNotificationsTab(addedPage, "organization")).toBeVisible();

    await addedPage.goto("/inbox");
    await inboxItem(addedPage, headline).click();
    await expect(
      addedPage.getByTestId("notification-detail-subheadline"),
    ).toHaveText(name);
    await addedPage.getByTestId("notification-open-workspace").click();
    await expect(addedPage).toHaveURL(
      new RegExp(`/workspaces/${workspace.id}$`),
    );
    await expect(addedPage.getByTestId("workspace-page")).toBeVisible();

    await generatedApi.workspacesControllerRemove(workspace.id, { api });
    expect(await notificationsAbout(added.api, workspace.id)).toEqual([]);
  } finally {
    await context.close();
    await added.api.dispose();
  }
});
