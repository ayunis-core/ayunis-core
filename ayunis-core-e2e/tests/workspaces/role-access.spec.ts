import { randomUUID } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../src/fixtures/test";
import { login } from "../../src/clients/api/auth.client";
import { generatedApi } from "../../src/clients/api/generated-api";
import { setUserRolePermissions } from "../../src/clients/api/role-permissions.client";
import { addWorkspaceMember } from "../../src/clients/database.client";
import { createApiContext } from "../../src/factories/api-context.factory";
import { createOrg } from "../../src/factories/org.factory";
import { createMemberSession } from "../../src/factories/user.factory";
import {
  createWorkspaceWithResources,
  type OwnedWorkspace,
} from "../../src/factories/workspace-resources.factory";

const emptySession = { cookies: [], origins: [] };

/** Every write a workspace member needs `manage_workspace` or admin for. */
function workspaceWrites(api: APIRequestContext, workspace: OwnedWorkspace) {
  const options = { api };
  const { id, skillId, knowledgeBaseId } = workspace;
  return {
    "rename workspace": () =>
      generatedApi.workspacesControllerUpdate(id, { name: "Neu" }, options),
    "update instruction": () =>
      generatedApi.workspaceContextControllerUpdateInstruction(
        id,
        { instruction: "Antworte förmlich." },
        options,
      ),
    "create skill": () =>
      generatedApi.skillsControllerCreate(
        {
          ownerType: "workspace",
          workspaceId: id,
          name: `Zusatz ${randomUUID().slice(0, 8)}`,
          shortDescription: "Zusätzliche Prüfung",
          instructions: "Prüfe zusätzlich.",
        },
        options,
      ),
    "update skill": () =>
      generatedApi.skillsControllerUpdate(
        skillId,
        {
          name: `Geändert ${randomUUID().slice(0, 8)}`,
          shortDescription: "Geändert",
          instructions: "Geändert.",
        },
        options,
      ),
    "switch skill off": () =>
      generatedApi.skillsControllerActivate(
        skillId,
        { isActive: false },
        options,
      ),
    "pin skill": () =>
      generatedApi.skillsControllerPin(skillId, { isPinned: true }, options),
    "link knowledge base": () =>
      generatedApi.skillKnowledgeBasesControllerAssignKnowledgeBase(
        skillId,
        knowledgeBaseId,
        options,
      ),
    "create knowledge base": () =>
      generatedApi.knowledgeBasesControllerCreate(
        {
          ownerType: "workspace",
          workspaceId: id,
          name: `Anlage ${randomUUID().slice(0, 8)}`,
        },
        options,
      ),
    "rename knowledge base": () =>
      generatedApi.knowledgeBasesControllerUpdate(
        knowledgeBaseId,
        { name: `Satzung ${randomUUID().slice(0, 8)}` },
        options,
      ),
    "switch knowledge base off": () =>
      generatedApi.knowledgeBasesControllerSetActivation(
        knowledgeBaseId,
        { isActive: false },
        options,
      ),
    "delete skill": () => generatedApi.skillsControllerDelete(skillId, options),
    "delete knowledge base": () =>
      generatedApi.knowledgeBasesControllerDelete(knowledgeBaseId, options),
    "delete workspace": () =>
      generatedApi.workspacesControllerRemove(id, options),
  };
}

// Changes the USER role of its own organization, so it cannot affect the
// worker organization other specs share.
test("workspace roles decide what members may change, whatever their org role", async ({
  mail,
}) => {
  test.setTimeout(120_000);
  const key = randomUUID().slice(0, 8);
  const org = await createOrg(
    `ws-roles-${key}`,
    test.info().outputPath("ws-roles-org.json"),
  );
  const adminApi = await createApiContext(emptySession);
  await login(adminApi, org.admin.email, org.admin.password);
  // Users may no longer manage skills or knowledge bases of their own.
  await setUserRolePermissions(adminApi, ["manage_routines"]);
  const owner = await createMemberSession(adminApi, mail, `ws-roles-o-${key}`);
  const manager = await createMemberSession(
    adminApi,
    mail,
    `ws-roles-m-${key}`,
  );
  const user = await createMemberSession(adminApi, mail, `ws-roles-u-${key}`);
  try {
    // The workspace admin needs no org-wide manage_skills or
    // manage_knowledge_bases for the workspace's own skills and knowledge.
    const workspace = await createWorkspaceWithResources(
      owner.api,
      `Haushalt ${key}`,
    );
    await expect(
      generatedApi.skillsControllerCreate(
        {
          ownerType: "personal",
          name: `Privat ${key}`,
          shortDescription: "Privat",
          instructions: "Privat.",
        },
        { api: owner.api },
      ),
    ).rejects.toThrow(/\(HTTP 403\)/);

    const joinedAt = new Date();
    await addWorkspaceMember({
      workspaceId: workspace.id,
      userId: manager.member.id,
      role: "manager",
      joinedAt,
    });
    await addWorkspaceMember({
      workspaceId: workspace.id,
      userId: user.member.id,
      role: "user",
      joinedAt,
    });

    const asUser = { api: user.api };
    await expect(
      generatedApi.workspacesControllerFindOne(workspace.id, asUser),
    ).resolves.toMatchObject({ role: "user", permissions: [] });
    await expect(
      generatedApi.workspacesControllerGetRolePermissions(workspace.id, asUser),
    ).resolves.toEqual({
      roles: [
        { role: "user", permissions: [] },
        {
          role: "manager",
          permissions: ["manage_workspace", "manage_workspace_members"],
        },
        {
          role: "admin",
          permissions: ["manage_workspace", "manage_workspace_members"],
        },
      ],
    });
    await expect(
      generatedApi.skillsControllerFindOne(workspace.skillId, asUser),
    ).resolves.toMatchObject({ id: workspace.skillId });
    for (const [label, send] of Object.entries(
      workspaceWrites(user.api, workspace),
    )) {
      await expect(send(), label).rejects.toThrow(/\(HTTP 403\)/);
    }

    const managerWrites = workspaceWrites(manager.api, workspace);
    await expect(
      generatedApi.workspacesControllerFindOne(workspace.id, {
        api: manager.api,
      }),
    ).resolves.toMatchObject({ role: "manager" });
    await expect(managerWrites["rename workspace"]()).resolves.toMatchObject({
      name: "Neu",
    });
    await expect(managerWrites["create skill"]()).resolves.toBeDefined();
    await expect(
      managerWrites["switch knowledge base off"](),
    ).resolves.toBeDefined();
    await expect(managerWrites["delete workspace"]()).rejects.toThrow(
      /\(HTTP 403\)/,
    );

    await expect(
      generatedApi.workspacesControllerFindOne(workspace.id, {
        api: adminApi,
      }),
    ).rejects.toThrow(/\(HTTP 404\)/);

    await setUserRolePermissions(adminApi, [
      "manage_routines",
      "manage_workspace",
    ]);
    await expect(
      generatedApi.workspacesControllerUpdate(
        workspace.id,
        { name: "Vom Nutzer" },
        asUser,
      ),
    ).resolves.toMatchObject({
      name: "Vom Nutzer",
      permissions: ["manage_workspace"],
    });

    await generatedApi.workspacesControllerRemove(workspace.id, {
      api: owner.api,
    });
    await expect(
      generatedApi.workspacesControllerFindOne(workspace.id, asUser),
    ).rejects.toThrow(/\(HTTP 404\)/);
  } finally {
    await owner.api.dispose();
    await manager.api.dispose();
    await user.api.dispose();
    await adminApi.dispose();
  }
});
