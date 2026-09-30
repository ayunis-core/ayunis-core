import { request } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";
import { createUser } from "../../src/factories/user.factory";
import { login } from "../../src/clients/api/auth.client";
import { config } from "../../src/config";

const tutorialName = "So geht's | Arbeitsbereiche";

async function listTutorials(api: APIRequestContext) {
  const page = await generatedApi.workspacesControllerFindAll(
    { limit: 100 },
    { api },
  );
  return page.data.filter((workspace) => workspace.name === tutorialName);
}

// Provisioning runs from the user-created event after signup returns, so the
// first listing may race it; poll until exactly one copy exists.
async function awaitSingleTutorial(api: APIRequestContext) {
  await expect
    .poll(async () => (await listTutorials(api)).length, { timeout: 15_000 })
    .toBe(1);
  return (await listTutorials(api))[0];
}

test("provisions a private tutorial for every new user and preserves edits and deletion", async ({
  api,
  page,
  mail,
}) => {
  let workspaceId = "";
  let skillId = "";
  let knowledgeBaseId = "";

  await test.step("provisions one tutorial for the org admin without a favorite", async () => {
    const workspace = await awaitSingleTutorial(api);
    expect(workspace.chatCount).toBe(0);
    expect(workspace.icon).toBe("folder");
    expect(workspace.color).toBe("violet");
    const favorites = await generatedApi.favoritesControllerFindAll({ api });
    expect(
      favorites.some((favorite) => favorite.referenceId === workspace.id),
    ).toBe(false);
    workspaceId = workspace.id;
  });

  await test.step("links the skill and schedules the Help Center article in its knowledge collection", async () => {
    const context = await generatedApi.workspaceContextControllerFindContext(
      workspaceId,
      { api },
    );
    expect(context.skills).toHaveLength(1);
    expect(context.knowledgeBases).toHaveLength(1);
    const [skill] = context.skills;
    const [knowledgeBase] = context.knowledgeBases;
    expect(skill.name).toBe("Arbeitsbereich erklären");
    expect(knowledgeBase.name).toBe("Helpcenter: Arbeitsbereiche");
    await expect
      .poll(async () => {
        const documents =
          await generatedApi.knowledgeBasesControllerListDocuments(
            knowledgeBase.id,
            { api },
          );
        return documents.data.map((document) => document.url);
      })
      .toEqual(["https://help.ayunis.com/de/workspaces/"]);
    const assigned =
      await generatedApi.skillKnowledgeBasesControllerListSkillKnowledgeBases(
        skill.id,
        { api },
      );
    expect(assigned).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: knowledgeBase.id }),
      ]),
    );
    skillId = skill.id;
    knowledgeBaseId = knowledgeBase.id;
  });

  await test.step("renders in the workspace tabs", async () => {
    await page.goto(`/workspaces/${workspaceId}`);
    await expect(page.getByTestId("workspace-page")).toBeVisible();
    await page.getByTestId("workspace-tab-skills").click();
    await expect(page.getByTestId(`workspace-skill-${skillId}`)).toContainText(
      "Arbeitsbereich erklären",
    );
    await page.getByTestId("workspace-tab-knowledge").click();
    await expect(
      page.getByTestId(`workspace-knowledge-base-${knowledgeBaseId}`),
    ).toBeVisible();
  });

  await test.step("gives an invited user an independent private copy", async () => {
    const member = await createUser(api, mail, `tutorial-${Date.now()}`);
    const memberApi = await request.newContext({ baseURL: config.apiURL });
    try {
      await login(memberApi, member.email, member.password);
      const memberTutorial = await awaitSingleTutorial(memberApi);
      expect(memberTutorial.id).not.toBe(workspaceId);
      await expect(
        generatedApi.workspacesControllerFindOne(workspaceId, {
          api: memberApi,
        }),
      ).rejects.toThrow("404");
      await expect(
        generatedApi.skillsControllerFindOne(skillId, { api: memberApi }),
      ).rejects.toThrow("404");
      await expect(
        generatedApi.knowledgeBasesControllerFindOne(knowledgeBaseId, {
          api: memberApi,
        }),
      ).rejects.toThrow("404");
    } finally {
      await memberApi.dispose();
    }
  });

  await test.step("keeps edits and never recreates a deleted tutorial", async () => {
    await generatedApi.workspacesControllerUpdate(
      workspaceId,
      { name: "My edited introduction" },
      { api },
    );
    const edited = await generatedApi.workspacesControllerFindAll(
      { limit: 100 },
      { api },
    );
    expect(edited.data.find((item) => item.id === workspaceId)?.name).toBe(
      "My edited introduction",
    );
    expect(edited.data.some((item) => item.name === tutorialName)).toBe(false);

    await generatedApi.workspacesControllerRemove(workspaceId, { api });
    const afterDelete = await generatedApi.workspacesControllerFindAll(
      { limit: 100 },
      { api },
    );
    expect(
      afterDelete.data.some(
        (item) => item.id === workspaceId || item.name === tutorialName,
      ),
    ).toBe(false);
    await page.goto("/workspaces");
    await page.reload();
    await expect(page.getByTestId(`workspace-${workspaceId}`)).toHaveCount(0);
  });
});
