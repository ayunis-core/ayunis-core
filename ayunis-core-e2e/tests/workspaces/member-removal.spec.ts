import { randomUUID } from "node:crypto";
import type { APIRequestContext, Browser, Page } from "@playwright/test";
import { test, expect } from "../../src/fixtures/test";
import { login } from "../../src/clients/api/auth.client";
import { generatedApi } from "../../src/clients/api/generated-api";
import type { MailcatcherClient } from "../../src/clients/mailcatcher.client";
import { createApiContext } from "../../src/factories/api-context.factory";
import { createOrg } from "../../src/factories/org.factory";
import {
  createMemberSession,
  type UserContext,
} from "../../src/factories/user.factory";
import {
  createWorkspaceWithResources,
  type OwnedWorkspace,
} from "../../src/factories/workspace-resources.factory";
import {
  leaveWorkspaceThroughUi,
  openWorkspaceMembers,
  removeWorkspaceMemberThroughUi,
} from "../../src/flows/workspace-members.flow";

const emptySession = { cookies: [], origins: [] };

interface Principal {
  member: UserContext;
  api: APIRequestContext;
}

interface RemovalOrg {
  anna: Principal;
  ben: Principal;
  clara: Principal;
  workspace: OwnedWorkspace;
  workspaceName: string;
  dispose: () => Promise<void>;
}

/**
 * Anna creates the workspace and adds Ben as user and Clara as manager. All
 * three hold the `user` org role: only their workspace role counts.
 */
async function createRemovalOrg(
  mail: MailcatcherClient,
  key: string,
): Promise<RemovalOrg> {
  const org = await createOrg(
    `ws-removal-${key}`,
    test.info().outputPath("ws-removal-org.json"),
  );
  const adminApi = await createApiContext(emptySession);
  await login(adminApi, org.admin.email, org.admin.password);
  const anna = await createMemberSession(adminApi, mail, `ws-anna-${key}`);
  const ben = await createMemberSession(adminApi, mail, `ws-ben-${key}`);
  const clara = await createMemberSession(adminApi, mail, `ws-clara-${key}`);
  const workspaceName = `Bauamt ${key}`;
  const workspace = await createWorkspaceWithResources(
    anna.api,
    workspaceName,
  );
  await generatedApi.workspaceMembersControllerAdd(
    workspace.id,
    { userIds: [ben.member.id] },
    { api: anna.api },
  );
  await generatedApi.workspaceMembersControllerAdd(
    workspace.id,
    { userIds: [clara.member.id], role: "manager" },
    { api: anna.api },
  );
  return {
    anna,
    ben,
    clara,
    workspace,
    workspaceName,
    dispose: async () => {
      await Promise.all(
        [adminApi, anna.api, ben.api, clara.api].map((api) => api.dispose()),
      );
    },
  };
}

async function openAs(browser: Browser, principal: Principal): Promise<Page> {
  const context = await browser.newContext({
    storageState: await principal.api.storageState(),
  });
  return context.newPage();
}

async function createChat(principal: Principal, workspaceId: string) {
  const [model] = await generatedApi.modelsControllerGetPermittedLanguageModels(
    { api: principal.api },
  );
  return generatedApi.threadsControllerCreate(
    { workspaceId, modelId: model.id },
    { api: principal.api },
  );
}

async function favoriteWorkspace(principal: Principal, workspaceId: string) {
  await generatedApi.favoritesControllerToggle(
    { referenceType: "workspace", referenceId: workspaceId },
    { api: principal.api },
  );
}

/** What a principal can reach of the workspace and their chat in it. */
async function reachOf(principal: Principal, workspaceId: string, chatId: string) {
  const options = { api: principal.api };
  const status = (request: Promise<unknown>) =>
    request.then(
      () => 200,
      (error: Error) => Number(/\(HTTP (\d+)\)/.exec(error.message)?.[1]),
    );
  const [workspaces, chats, favorites] = await Promise.all([
    generatedApi.workspacesControllerFindAll(undefined, options),
    generatedApi.threadsControllerFindAll({ limit: 100 }, options),
    generatedApi.favoritesControllerFindAll(options),
  ]);
  return {
    workspace: await status(
      generatedApi.workspacesControllerFindOne(workspaceId, options),
    ),
    chat: await status(generatedApi.threadsControllerFindOne(chatId, options)),
    listedWorkspace: workspaces.data.some(({ id }) => id === workspaceId),
    listedChat: chats.data.some(({ id }) => id === chatId),
    favorite: favorites.some(
      ({ referenceId }) => referenceId === workspaceId,
    ),
  };
}

test("a removed member loses the workspace and their chat in it until added again", async ({
  browser,
  mail,
}) => {
  test.setTimeout(180_000);
  const org = await createRemovalOrg(mail, randomUUID().slice(0, 8));
  const { anna, ben, clara, workspace, workspaceName } = org;
  const { id } = workspace;
  const annaPage = await openAs(browser, anna);
  const benPage = await openAs(browser, ben);
  const claraPage = await openAs(browser, clara);
  try {
    const benChat = await createChat(ben, id);
    const annaChat = await createChat(anna, id);
    await favoriteWorkspace(ben, id);
    await favoriteWorkspace(anna, id);

    await test.step("as a member, Ben reaches the workspace and his chat", async () => {
      await expect(reachOf(ben, id, benChat.id)).resolves.toEqual({
        workspace: 200,
        chat: 200,
        listedWorkspace: true,
        listedChat: true,
        favorite: true,
      });
    });

    await test.step("Clara, a manager, may remove users but not admins", async () => {
      await openWorkspaceMembers(claraPage, id);
      const members = claraPage.getByTestId("workspace-members-page");
      await expect(
        members.getByTestId(`workspace-member-remove-${ben.member.id}`),
      ).toBeVisible();
      await expect(
        members.getByTestId(`workspace-member-remove-${anna.member.id}`),
      ).toHaveCount(0);
      await expect(
        generatedApi.workspaceMembersControllerRemove(id, anna.member.id, {
          api: clara.api,
        }),
      ).rejects.toThrow(/\(HTTP 403\)/);
    });

    await test.step("Anna removes Ben on the members page", async () => {
      await openWorkspaceMembers(annaPage, id);
      await removeWorkspaceMemberThroughUi(annaPage, ben.member.id);
    });

    await test.step("Ben loses the workspace, its favourite and his chat in it", async () => {
      await expect(reachOf(ben, id, benChat.id)).resolves.toEqual({
        workspace: 404,
        chat: 404,
        listedWorkspace: false,
        listedChat: false,
        favorite: false,
      });
      await benPage.goto("/workspaces");
      await expect(benPage.getByTestId(`workspace-${id}`)).toHaveCount(0);
      await expect(
        benPage
          .getByTestId("sidebar")
          .getByRole("link", { name: workspaceName, exact: true }),
      ).toHaveCount(0);
      await benPage.goto("/chat");
      await benPage.getByTestId("new-chat-workspace-picker").click();
      await expect(
        benPage.getByTestId(`workspace-picker-item-${id}`),
      ).toHaveCount(0);
      await benPage.keyboard.press("Escape");
    });

    await test.step("Anna keeps her favourite, her chat and the workspace content", async () => {
      await expect(reachOf(anna, id, annaChat.id)).resolves.toEqual({
        workspace: 200,
        chat: 200,
        listedWorkspace: true,
        listedChat: true,
        favorite: true,
      });
      await expect(
        generatedApi.skillsControllerFindOne(workspace.skillId, {
          api: anna.api,
        }),
      ).resolves.toMatchObject({ isActive: true });
      await expect(
        generatedApi.knowledgeBasesControllerFindOne(
          workspace.knowledgeBaseId,
          { api: anna.api },
        ),
      ).resolves.toBeDefined();
    });

    await test.step("added again, Ben sees the workspace and his earlier chat", async () => {
      await generatedApi.workspaceMembersControllerAdd(
        id,
        { userIds: [ben.member.id] },
        { api: anna.api },
      );
      await expect(reachOf(ben, id, benChat.id)).resolves.toMatchObject({
        workspace: 200,
        chat: 200,
        listedWorkspace: true,
        listedChat: true,
      });
      await benPage.goto(`/chats/${benChat.id}`);
      await expect(benPage.getByTestId("chat-input")).toBeVisible();
    });
  } finally {
    await Promise.all(
      [annaPage, benPage, claraPage].map((page) => page.context().close()),
    );
    await org.dispose();
  }
});

test("any member may leave a workspace, except its last admin", async ({
  browser,
  mail,
}) => {
  test.setTimeout(180_000);
  const org = await createRemovalOrg(mail, randomUUID().slice(0, 8));
  const { anna, ben, clara, workspace } = org;
  const { id } = workspace;
  const annaPage = await openAs(browser, anna);
  const benPage = await openAs(browser, ben);
  try {
    await test.step("Ben, a user, leaves and lands on his workspace list", async () => {
      await openWorkspaceMembers(benPage, id);
      await leaveWorkspaceThroughUi(benPage);
      await expect(benPage).toHaveURL(/\/workspaces\/?(?:\?.*)?$/);
      await expect(benPage.getByTestId(`workspace-${id}`)).toHaveCount(0);
      await expect(
        generatedApi.workspacesControllerFindOne(id, { api: ben.api }),
      ).rejects.toThrow(/\(HTTP 404\)/);
    });

    await test.step("Anna, the last admin, is told she cannot leave", async () => {
      await openWorkspaceMembers(annaPage, id);
      await leaveWorkspaceThroughUi(annaPage);
      await expect(
        annaPage.locator('[data-sonner-toast][data-type="error"]'),
      ).toBeVisible();
      await expect(annaPage).toHaveURL(new RegExp(`/workspaces/${id}/members$`));
      await expect(
        generatedApi.workspaceMembersControllerLeave(id, { api: anna.api }),
      ).rejects.toThrow(/\(HTTP 409\)/);
      await expect(
        generatedApi.workspacesControllerFindOne(id, { api: anna.api }),
      ).resolves.toMatchObject({ role: "admin" });
    });

    await test.step("with a second admin, Anna may leave and Clara keeps the workspace", async () => {
      await generatedApi.workspaceMembersControllerUpdateRole(
        id,
        clara.member.id,
        { role: "admin" },
        { api: anna.api },
      );
      await annaPage.reload();
      await leaveWorkspaceThroughUi(annaPage);
      await expect(annaPage).toHaveURL(/\/workspaces\/?(?:\?.*)?$/);
      await expect(
        generatedApi.workspacesControllerFindOne(id, { api: anna.api }),
      ).rejects.toThrow(/\(HTTP 404\)/);
      const members = await generatedApi.workspaceMembersControllerList(id, {
        api: clara.api,
      });
      expect(members.map(({ userId, role }) => ({ userId, role }))).toEqual([
        { userId: clara.member.id, role: "admin" },
      ]);
      await expect(
        generatedApi.skillsControllerFindOne(workspace.skillId, {
          api: clara.api,
        }),
      ).resolves.toMatchObject({ isActive: true });
    });
  } finally {
    await Promise.all(
      [annaPage, benPage].map((page) => page.context().close()),
    );
    await org.dispose();
  }
});
