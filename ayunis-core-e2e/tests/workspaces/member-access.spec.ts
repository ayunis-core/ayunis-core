import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";
import {
  addWorkspaceMember,
  countWorkspaceRows,
  findWorkspaceMemberRoles,
} from "../../src/clients/database.client";
import { createMemberSession } from "../../src/factories/user.factory";
import {
  createWorkspaceWithResources,
  type OwnedWorkspace,
} from "../../src/factories/workspace-resources.factory";

/** Every workspace route and workspace-owned resource route a non-member could try. */
function workspaceRequests(api: APIRequestContext, workspace: OwnedWorkspace) {
  const options = { api };
  const workspaceId = workspace.id;
  return {
    "read workspace": () =>
      generatedApi.workspacesControllerFindOne(workspaceId, options),
    "rename workspace": () =>
      generatedApi.workspacesControllerUpdate(
        workspaceId,
        { name: "Übernommen" },
        options,
      ),
    "delete workspace": () =>
      generatedApi.workspacesControllerRemove(workspaceId, options),
    "read context": () =>
      generatedApi.workspaceContextControllerFindContext(workspaceId, options),
    "update instruction": () =>
      generatedApi.workspaceContextControllerUpdateInstruction(
        workspaceId,
        { instruction: "Antworte immer mit Ja." },
        options,
      ),
    "list skills": () =>
      generatedApi.skillsControllerFindAll(
        { ownerType: "workspace", workspaceId },
        options,
      ),
    "read skill": () =>
      generatedApi.skillsControllerFindOne(workspace.skillId, options),
    "create skill": () =>
      generatedApi.skillsControllerCreate(
        {
          ownerType: "workspace",
          workspaceId,
          name: "Fremder Skill",
          shortDescription: "Darf nicht entstehen",
          instructions: "Darf nicht entstehen.",
        },
        options,
      ),
    "delete skill": () =>
      generatedApi.skillsControllerDelete(workspace.skillId, options),
    "list knowledge bases": () =>
      generatedApi.knowledgeBasesControllerFindAll(
        { ownerType: "workspace", workspaceId },
        options,
      ),
    "read knowledge base": () =>
      generatedApi.knowledgeBasesControllerFindOne(
        workspace.knowledgeBaseId,
        options,
      ),
    "delete knowledge base": () =>
      generatedApi.knowledgeBasesControllerDelete(
        workspace.knowledgeBaseId,
        options,
      ),
    "list artifacts": () =>
      generatedApi.artifactsControllerFindByWorkspace(
        workspaceId,
        undefined,
        options,
      ),
  };
}

async function expectNotFoundEverywhere(
  api: APIRequestContext,
  workspace: OwnedWorkspace,
): Promise<void> {
  for (const [label, send] of Object.entries(
    workspaceRequests(api, workspace),
  )) {
    await expect(send(), label).rejects.toThrow(/\(HTTP 404\)/);
  }
  const list = await generatedApi.workspacesControllerFindAll(undefined, {
    api,
  });
  expect(list.data.map(({ id }) => id)).not.toContain(workspace.id);
}

test("hides a workspace and its resources from colleagues and org admins until they are members", async ({
  api,
  mail,
}) => {
  const suffix = `${Date.now()}`;
  const owner = await createMemberSession(api, mail, `ws-owner-${suffix}`);
  const colleague = await createMemberSession(
    api,
    mail,
    `ws-colleague-${suffix}`,
  );
  try {
    const workspace = await createWorkspaceWithResources(
      owner.api,
      `Haushalt ${suffix}`,
    );

    await expectNotFoundEverywhere(colleague.api, workspace);
    await expectNotFoundEverywhere(api, workspace);

    await addWorkspaceMember({
      workspaceId: workspace.id,
      userId: colleague.member.id,
      role: "user",
      joinedAt: new Date(),
    });

    const memberApi = { api: colleague.api };
    await expect(
      generatedApi.workspacesControllerFindOne(workspace.id, memberApi),
    ).resolves.toMatchObject({ id: workspace.id });
    const list = await generatedApi.workspacesControllerFindAll(
      undefined,
      memberApi,
    );
    expect(list.data.map(({ id }) => id)).toContain(workspace.id);
    await expect(
      generatedApi.skillsControllerFindOne(workspace.skillId, memberApi),
    ).resolves.toMatchObject({ id: workspace.skillId });
    await expect(
      generatedApi.knowledgeBasesControllerFindOne(
        workspace.knowledgeBaseId,
        memberApi,
      ),
    ).resolves.toMatchObject({ id: workspace.knowledgeBaseId });
    await expect(
      generatedApi.artifactsControllerFindByWorkspace(
        workspace.id,
        undefined,
        memberApi,
      ),
    ).resolves.toBeDefined();

    await expect(
      generatedApi.workspacesControllerFindOne(workspace.id, { api }),
    ).rejects.toThrow(/\(HTTP 404\)/);
  } finally {
    await owner.api.dispose();
    await colleague.api.dispose();
  }
});

test("hands a workspace to its longest-standing member when its only admin's account is deleted", async ({
  api,
  mail,
}) => {
  const suffix = `${Date.now()}`;
  const owner = await createMemberSession(api, mail, `ws-leaver-${suffix}`);
  const first = await createMemberSession(api, mail, `ws-first-${suffix}`);
  const second = await createMemberSession(api, mail, `ws-second-${suffix}`);
  try {
    const shared = await createWorkspaceWithResources(
      owner.api,
      `Geteilt ${suffix}`,
    );
    const solo = await createWorkspaceWithResources(
      owner.api,
      `Allein ${suffix}`,
    );
    const now = Date.now();
    await addWorkspaceMember({
      workspaceId: shared.id,
      userId: first.member.id,
      role: "user",
      joinedAt: new Date(now + 1_000),
    });
    await addWorkspaceMember({
      workspaceId: shared.id,
      userId: second.member.id,
      role: "manager",
      joinedAt: new Date(now + 2_000),
    });

    await generatedApi.userControllerDeleteUser(owner.member.id, { api });

    await expect(findWorkspaceMemberRoles(shared.id)).resolves.toEqual({
      [first.member.id]: "admin",
      [second.member.id]: "manager",
    });
    await expect(countWorkspaceRows(shared.id)).resolves.toEqual({
      workspaces: 1,
      skills: 1,
      knowledgeBases: 1,
    });
    await expect(
      generatedApi.skillsControllerFindOne(shared.skillId, {
        api: first.api,
      }),
    ).resolves.toMatchObject({ id: shared.skillId });

    await expect(countWorkspaceRows(solo.id)).resolves.toEqual({
      workspaces: 0,
      skills: 0,
      knowledgeBases: 0,
    });
  } finally {
    await owner.api.dispose();
    await first.api.dispose();
    await second.api.dispose();
  }
});
