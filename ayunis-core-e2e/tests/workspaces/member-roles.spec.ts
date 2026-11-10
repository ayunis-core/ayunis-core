import { randomUUID } from "node:crypto";
import type { APIRequestContext, Browser, Page } from "@playwright/test";
import { test, expect } from "../../src/fixtures/test";
import { login } from "../../src/clients/api/auth.client";
import { generatedApi } from "../../src/clients/api/generated-api";
import { setUserRolePermissions } from "../../src/clients/api/role-permissions.client";
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
import { sendMessage } from "../../src/flows/chat.flow";
import {
  addWorkspaceMembersThroughUi,
  changeWorkspaceRoleThroughUi,
  openWorkspaceMembers,
} from "../../src/flows/workspace-members.flow";

const emptySession = { cookies: [], origins: [] };

interface Principal {
  member: UserContext;
  api: APIRequestContext;
}

interface MemberRolesOrg {
  adminApi: APIRequestContext;
  anna: Principal;
  ben: Principal;
  clara: Principal;
  dora: Principal;
  workspace: OwnedWorkspace;
  dispose: () => Promise<void>;
}

/**
 * Anna creates the workspace; Ben, Clara and Dora are colleagues who are not
 * members yet. Every principal holds the `user` org role, which may no longer
 * manage skills of its own, so a workspace role is all that lets them edit.
 */
async function createMemberRolesOrg(
  mail: MailcatcherClient,
  key: string,
): Promise<MemberRolesOrg> {
  const org = await createOrg(
    `ws-members-${key}`,
    test.info().outputPath("ws-members-org.json"),
  );
  const adminApi = await createApiContext(emptySession);
  await login(adminApi, org.admin.email, org.admin.password);
  await setUserRolePermissions(adminApi, ["manage_routines"]);
  const anna = await createMemberSession(adminApi, mail, `ws-anna-${key}`);
  const ben = await createMemberSession(adminApi, mail, `ws-ben-${key}`);
  const clara = await createMemberSession(adminApi, mail, `ws-clara-${key}`);
  const dora = await createMemberSession(adminApi, mail, `ws-dora-${key}`);
  const workspace = await createWorkspaceWithResources(
    anna.api,
    `Haushalt ${key}`,
  );
  return {
    adminApi,
    anna,
    ben,
    clara,
    dora,
    workspace,
    dispose: async () => {
      await Promise.all(
        [adminApi, anna.api, ben.api, clara.api, dora.api].map((api) =>
          api.dispose(),
        ),
      );
    },
  };
}

const as = (principal: Principal | APIRequestContext) => ({
  api: "api" in principal ? principal.api : principal,
});

async function listedWorkspaceIds(api: APIRequestContext): Promise<string[]> {
  const page = await generatedApi.workspacesControllerFindAll(undefined, {
    api,
  });
  return page.data.map(({ id }) => id);
}

function improveText(principal: Principal, workspaceId?: string) {
  return generatedApi.skillsControllerImproveText(
    {
      field: "trigger",
      trigger: "Wenn es um den Haushalt geht",
      instructions: "Vergleiche jeden Ansatz mit dem Vorjahr.",
      workspaceId,
    },
    as(principal),
  );
}

async function candidateIds(
  principal: Principal,
  workspaceId: string,
  search?: string,
): Promise<string[]> {
  const candidates =
    await generatedApi.workspaceMembersControllerListCandidates(
      workspaceId,
      { search },
      as(principal),
    );
  return candidates.map(({ userId }) => userId);
}

async function roleOf(principal: Principal, workspaceId: string) {
  const workspace = await generatedApi.workspacesControllerFindOne(
    workspaceId,
    as(principal),
  );
  return workspace.role;
}

async function openAs(browser: Browser, principal: Principal): Promise<Page> {
  const context = await browser.newContext({
    storageState: await principal.api.storageState(),
  });
  return context.newPage();
}

test("workspace members get what their workspace role allows, never more", async ({
  api: otherOrgAdminApi,
  mail,
}) => {
  test.setTimeout(180_000);
  const org = await createMemberRolesOrg(mail, randomUUID().slice(0, 8));
  const { adminApi, anna, ben, clara, dora, workspace } = org;
  const { id } = workspace;
  try {
    await test.step("a colleague who was not added finds nothing", async () => {
      await expect(
        generatedApi.workspacesControllerFindOne(id, as(ben)),
      ).rejects.toThrow(/\(HTTP 404\)/);
      await expect(
        generatedApi.workspaceMembersControllerList(id, as(ben)),
      ).rejects.toThrow(/\(HTTP 404\)/);
      expect(await listedWorkspaceIds(ben.api)).not.toContain(id);
      await expect(candidateIds(ben, id)).rejects.toThrow(/\(HTTP 404\)/);
    });

    await test.step("an admin finds colleagues to add without org-wide user access", async () => {
      await expect(
        generatedApi.userControllerGetUsersInOrganization(undefined, as(anna)),
      ).rejects.toThrow(/\(HTTP 403\)/);
      const colleagues = await candidateIds(anna, id);
      expect(colleagues).toEqual(
        expect.arrayContaining([
          ben.member.id,
          clara.member.id,
          dora.member.id,
        ]),
      );
      expect(colleagues).not.toContain(anna.member.id);
      expect(await candidateIds(anna, id, ben.member.email)).toEqual([
        ben.member.id,
      ]);
    });

    await test.step("users of another organization cannot be added", async () => {
      const outsider = await generatedApi.authenticationControllerMe(
        as(otherOrgAdminApi),
      );
      await expect(
        generatedApi.workspaceMembersControllerAdd(
          id,
          { userIds: [ben.member.id, outsider.id] },
          as(anna),
        ),
      ).rejects.toThrow(/\(HTTP 400\)/);
      await expect(
        generatedApi.workspacesControllerFindOne(id, as(ben)),
      ).rejects.toThrow(/\(HTTP 404\)/);
    });

    await test.step("a user may use the workspace but change nothing", async () => {
      await expect(
        generatedApi.workspaceMembersControllerAdd(
          id,
          { userIds: [ben.member.id] },
          as(anna),
        ),
      ).resolves.toEqual([
        expect.objectContaining({ userId: ben.member.id, role: "user" }),
      ]);
      await expect(
        generatedApi.workspacesControllerFindOne(id, as(ben)),
      ).resolves.toMatchObject({ role: "user", permissions: [] });
      expect(await listedWorkspaceIds(ben.api)).toContain(id);
      await expect(
        generatedApi.workspaceMembersControllerList(id, as(ben)),
      ).resolves.toHaveLength(2);
      await expect(
        generatedApi.skillsControllerFindOne(workspace.skillId, as(ben)),
      ).resolves.toMatchObject({ isActive: true });
      expect(await candidateIds(anna, id)).not.toContain(ben.member.id);

      const denied = {
        rename: () =>
          generatedApi.workspacesControllerUpdate(
            id,
            { name: "Übernommen" },
            as(ben),
          ),
        "switch skill off": () =>
          generatedApi.skillsControllerActivate(
            workspace.skillId,
            { isActive: false },
            as(ben),
          ),
        "add members": () =>
          generatedApi.workspaceMembersControllerAdd(
            id,
            { userIds: [dora.member.id] },
            as(ben),
          ),
        "change roles": () =>
          generatedApi.workspaceMembersControllerUpdateRole(
            id,
            ben.member.id,
            { role: "admin" },
            as(ben),
          ),
        "search colleagues": () => candidateIds(ben, id),
        "improve skill text": () => improveText(ben, id),
        delete: () => generatedApi.workspacesControllerRemove(id, as(ben)),
      };
      for (const [label, send] of Object.entries(denied)) {
        await expect(send(), label).rejects.toThrow(/\(HTTP 403\)/);
      }
    });

    await test.step("a manager may edit and add members, but not hand out admin", async () => {
      await generatedApi.workspaceMembersControllerAdd(
        id,
        { userIds: [clara.member.id], role: "manager" },
        as(anna),
      );
      await expect(
        generatedApi.workspacesControllerUpdate(
          id,
          { name: `Haushalt geprüft ${randomUUID().slice(0, 4)}` },
          as(clara),
        ),
      ).resolves.toMatchObject({ role: "manager" });
      await expect(
        generatedApi.skillsControllerActivate(
          workspace.skillId,
          { isActive: true },
          as(clara),
        ),
      ).resolves.toBeDefined();
      // Clara's org role lacks manage_skills: only the workspace role counts.
      await expect(improveText(clara, id)).resolves.toMatchObject({
        text: expect.any(String),
      });
      await expect(improveText(clara)).rejects.toThrow(/\(HTTP 403\)/);
      expect(await candidateIds(clara, id, dora.member.email)).toEqual([
        dora.member.id,
      ]);

      await expect(
        generatedApi.workspaceMembersControllerAdd(
          id,
          { userIds: [dora.member.id], role: "admin" },
          as(clara),
        ),
      ).rejects.toThrow(/\(HTTP 403\)/);
      await expect(
        generatedApi.workspaceMembersControllerAdd(
          id,
          { userIds: [dora.member.id], role: "manager" },
          as(clara),
        ),
      ).resolves.toEqual([
        expect.objectContaining({ userId: dora.member.id, role: "manager" }),
      ]);
      // Adding an existing member again neither fails nor changes their role.
      await expect(
        generatedApi.workspaceMembersControllerAdd(
          id,
          { userIds: [anna.member.id], role: "user" },
          as(clara),
        ),
      ).resolves.toEqual([]);
      await expect(
        generatedApi.workspaceMembersControllerUpdateRole(
          id,
          dora.member.id,
          { role: "user" },
          as(clara),
        ),
      ).rejects.toThrow(/\(HTTP 403\)/);
      await expect(
        generatedApi.workspacesControllerRemove(id, as(clara)),
      ).rejects.toThrow(/\(HTTP 403\)/);
    });

    await test.step("an org admin who is not a member finds nothing", async () => {
      await expect(
        generatedApi.workspacesControllerFindOne(id, as(adminApi)),
      ).rejects.toThrow(/\(HTTP 404\)/);
      expect(await listedWorkspaceIds(adminApi)).not.toContain(id);
    });

    await test.step("members never see each other's chats or artifacts", async () => {
      const [model] =
        await generatedApi.modelsControllerGetPermittedLanguageModels(as(ben));
      const thread = await generatedApi.threadsControllerCreate(
        { workspaceId: id, modelId: model.id },
        as(ben),
      );
      await generatedApi.artifactsControllerCreate(
        {
          title: "Entwurf Haushaltsrede",
          content: "<p>Sehr geehrte Damen und Herren</p>",
          threadId: thread.id,
          authorType: "USER",
        },
        as(ben),
      );
      await expect(
        generatedApi.threadsControllerFindOne(thread.id, as(clara)),
      ).rejects.toThrow(/\(HTTP 404\)/);
      const claraChats = await generatedApi.threadsControllerFindAll(
        { workspaceId: id },
        as(clara),
      );
      expect(claraChats.data.map((chat) => chat.id)).not.toContain(thread.id);
      const claraArtifacts =
        await generatedApi.artifactsControllerFindByWorkspace(
          id,
          undefined,
          as(clara),
        );
      expect(claraArtifacts.data).toEqual([]);
      const benArtifacts =
        await generatedApi.artifactsControllerFindByWorkspace(
          id,
          undefined,
          as(ben),
        );
      expect(benArtifacts.data).toHaveLength(1);
    });

    await test.step("an admin may change roles and delete, but not leave the workspace without an admin", async () => {
      await generatedApi.workspaceMembersControllerUpdateRole(
        id,
        ben.member.id,
        { role: "admin" },
        as(anna),
      );
      await expect(
        generatedApi.workspaceMembersControllerUpdateRole(
          id,
          anna.member.id,
          { role: "manager" },
          as(ben),
        ),
      ).resolves.toMatchObject({ role: "manager" });
      await expect(
        generatedApi.workspaceMembersControllerUpdateRole(
          id,
          ben.member.id,
          { role: "manager" },
          as(ben),
        ),
      ).rejects.toThrow(/\(HTTP 409\)/);
      await generatedApi.workspacesControllerRemove(id, as(ben));
      await expect(
        generatedApi.workspacesControllerFindOne(id, as(clara)),
      ).rejects.toThrow(/\(HTTP 404\)/);
    });
  } finally {
    await org.dispose();
  }
});

test("the workspace page shows each member only the controls their role allows", async ({
  browser,
  mail,
}) => {
  test.setTimeout(180_000);
  const org = await createMemberRolesOrg(mail, randomUUID().slice(0, 8));
  const { anna, ben, clara, workspace } = org;
  const { id } = workspace;
  const annaPage = await openAs(browser, anna);
  const benPage = await openAs(browser, ben);
  const claraPage = await openAs(browser, clara);
  try {
    await test.step("before being added, Ben cannot find the workspace", async () => {
      const own = await generatedApi.workspacesControllerCreate(
        { name: `Eigene Ablage ${randomUUID().slice(0, 4)}` },
        as(ben),
      );
      await benPage.goto("/workspaces");
      await expect(benPage.getByTestId(`workspace-${own.id}`)).toBeVisible();
      await expect(benPage.getByTestId(`workspace-${id}`)).toHaveCount(0);
      await benPage.goto("/chat");
      await benPage.getByTestId("new-chat-workspace-picker").click();
      await expect(
        benPage.getByTestId(`workspace-picker-item-${own.id}`),
      ).toBeVisible();
      await expect(
        benPage.getByTestId(`workspace-picker-item-${id}`),
      ).toHaveCount(0);
      await benPage.keyboard.press("Escape");
    });

    await test.step("Anna adds Ben as user and Clara as manager", async () => {
      await openWorkspaceMembers(annaPage, id);
      await addWorkspaceMembersThroughUi(annaPage, [ben.member], "user");
      await addWorkspaceMembersThroughUi(annaPage, [clara.member], "manager");
    });

    await test.step("Ben can chat in the workspace but sees no management controls", async () => {
      await benPage.goto("/workspaces");
      await expect(benPage.getByTestId(`workspace-${id}`)).toBeVisible();
      await benPage.goto(`/workspaces/${id}`);
      await expect(benPage.getByTestId("workspace-page")).toBeVisible();
      await expect(benPage.getByTestId("workspace-actions-menu")).toHaveCount(
        0,
      );

      await benPage.getByTestId("workspace-tab-skills").click();
      await expect(
        benPage.getByTestId(`workspace-skill-${workspace.skillId}`),
      ).toBeVisible();
      await expect(benPage.getByTestId("workspace-skill-create")).toHaveCount(
        0,
      );
      await expect(
        benPage.getByTestId(`workspace-skill-active-${workspace.skillId}`),
      ).toHaveCount(0);
      await benPage.getByTestId("workspace-tab-knowledge").click();
      await expect(
        benPage.getByTestId(
          `workspace-knowledge-base-${workspace.knowledgeBaseId}`,
        ),
      ).toBeVisible();
      await expect(
        benPage.getByTestId("workspace-knowledge-create"),
      ).toHaveCount(0);
      await benPage.getByTestId("workspace-tab-instructions").click();
      await expect(
        benPage.getByTestId("workspace-instruction-save"),
      ).toHaveCount(0);

      await benPage.getByTestId("workspace-members-open").click();
      const members = benPage.getByTestId("workspace-members-dialog");
      await expect(
        members.getByTestId(`workspace-member-role-label-${anna.member.id}`),
      ).toBeVisible();
      await expect(members.getByTestId("workspace-members-add")).toHaveCount(0);
      await expect(
        members.getByTestId(`workspace-member-role-${anna.member.id}`),
      ).toHaveCount(0);
      await benPage.keyboard.press("Escape");

      await sendMessage(benPage, "Was steht im Haushaltsentwurf?");
      await expect(benPage).toHaveURL(/\/chats\/[0-9a-f-]+/);
      await expect(
        benPage.getByTestId("assistant-message").last(),
      ).toBeVisible();
    });

    await test.step("Clara may edit and add members, but not hand out admin or delete", async () => {
      await claraPage.goto(`/workspaces/${id}`);
      await claraPage.getByTestId("workspace-actions-menu").click();
      await expect(
        claraPage.getByTestId("workspace-actions-edit"),
      ).toBeVisible();
      await expect(
        claraPage.getByTestId("workspace-actions-delete"),
      ).toHaveCount(0);
      await claraPage.keyboard.press("Escape");
      await claraPage.getByTestId("workspace-tab-skills").click();
      await expect(
        claraPage.getByTestId("workspace-skill-create").first(),
      ).toBeVisible();

      await claraPage.getByTestId("workspace-members-open").click();
      const members = claraPage.getByTestId("workspace-members-dialog");
      await expect(
        members.getByTestId(`workspace-member-role-${ben.member.id}`),
      ).toHaveCount(0);
      await members.getByTestId("workspace-members-add").click();
      await members.getByTestId("workspace-members-add-role").click();
      await expect(
        claraPage.getByTestId("workspace-members-add-role-option-manager"),
      ).toBeVisible();
      await expect(
        claraPage.getByTestId("workspace-members-add-role-option-admin"),
      ).toHaveCount(0);
      await claraPage.keyboard.press("Escape");
    });

    await test.step("Anna promotes Ben, who may then change roles and delete", async () => {
      await changeWorkspaceRoleThroughUi(annaPage, ben.member.id, "admin");
      await expect.poll(() => roleOf(ben, id)).toBe("admin");

      await openWorkspaceMembers(benPage, id);
      await changeWorkspaceRoleThroughUi(benPage, anna.member.id, "manager");
      await expect.poll(() => roleOf(anna, id)).toBe("manager");
    });

    await test.step("the last admin cannot step down", async () => {
      await changeWorkspaceRoleThroughUi(benPage, ben.member.id, "user");
      await expect(
        benPage.locator('[data-sonner-toast][data-type="error"]'),
      ).toBeVisible();
      expect(await roleOf(ben, id)).toBe("admin");
      await benPage.keyboard.press("Escape");
      await benPage.getByTestId("workspace-actions-menu").click();
      await expect(
        benPage.getByTestId("workspace-actions-delete"),
      ).toBeVisible();
    });
  } finally {
    await Promise.all(
      [annaPage, benPage, claraPage].map((page) => page.context().close()),
    );
    await org.dispose();
  }
});
