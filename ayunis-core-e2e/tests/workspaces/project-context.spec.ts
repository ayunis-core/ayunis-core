import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";
import {
  createProjectContextFixture,
  createProjectThread,
} from "../../src/factories/workspace-context.factory";

function uniqueSuffix(): string {
  return `${Date.now()}`;
}

test("adds skills, knowledge bases, and instructions to a project", async ({
  page,
  api,
}) => {
  const fixture = await createProjectContextFixture(api, uniqueSuffix());

  await page.goto(`/workspaces/${fixture.workspace.id}`);
  await expect(page.getByTestId("workspace-page")).toBeVisible();
  await expect(page.getByTestId("workspace-chats-empty")).toBeVisible();
  await expect(page.getByTestId("workspace-chats-search")).toHaveCount(0);

  await expect
    .poll(() =>
      page
        .getByRole("tab")
        .evaluateAll((tabs) =>
          tabs.map((tab) => tab.getAttribute("data-testid")),
        ),
    )
    .toEqual([
      "workspace-tab-chats",
      "workspace-tab-artifacts",
      "workspace-tab-knowledge",
      "workspace-tab-skills",
      "workspace-tab-instructions",
    ]);
  await expect(page.getByTestId("workspace-tab-artifacts")).toContainText(
    "Erstellte Inhalte",
  );
  await page.getByTestId("workspace-tab-artifacts").click();
  await expect(page.getByTestId("workspace-artifacts-search")).toHaveCount(0);

  await page.getByTestId("workspace-tab-skills").click();
  await expect(page.getByTestId("workspace-skills-search")).toHaveCount(0);
  await page.getByTestId("workspace-skill-create").first().click();
  const createSkillDialog = page.getByRole("dialog");
  await expect(createSkillDialog).toBeVisible();
  await createSkillDialog.getByRole("textbox").nth(0).fill(fixture.skill.name);
  await createSkillDialog
    .getByRole("textbox")
    .nth(1)
    .fill("Prüft Bauanträge gegen lokale Vorgaben");
  await createSkillDialog
    .getByRole("textbox")
    .nth(2)
    .fill("Prüfe Bauanträge anhand der Projektvorgaben.");
  await createSkillDialog
    .getByRole("button", { name: "Fähigkeit erstellen" })
    .click();
  let createdSkillId: string | undefined;
  await expect
    .poll(async () => {
      const workspaceSkills =
        await generatedApi.workspaceContextControllerListSkills(
          fixture.workspace.id,
          undefined,
          { api },
        );
      createdSkillId = workspaceSkills.data.find(
        ({ name }) => name === fixture.skill.name,
      )?.id;
      return createdSkillId;
    })
    .toBeTruthy();
  await expect(page.getByTestId(`workspace-skill-${createdSkillId}`)).toBeVisible();

  await page.getByTestId("workspace-tab-knowledge").click();
  await expect(page.getByTestId("workspace-knowledge-search")).toHaveCount(0);
  await expect(page.getByTestId("workspace-documents-search")).toHaveCount(0);
  await page.getByTestId("workspace-knowledge-create").first().click();
  const createKnowledgeBaseDialog = page.getByRole("dialog");
  await expect(createKnowledgeBaseDialog).toBeVisible();
  await createKnowledgeBaseDialog
    .getByRole("textbox")
    .nth(0)
    .fill(fixture.knowledgeBase.name);
  await createKnowledgeBaseDialog
    .getByRole("textbox")
    .nth(1)
    .fill("Projektbezogene Bauordnung");
  await createKnowledgeBaseDialog
    .getByRole("button", { name: "Wissensdatenbank erstellen" })
    .click();
  let createdKnowledgeBaseId: string | undefined;
  await expect
    .poll(async () => {
      const workspaceKnowledgeBases =
        await generatedApi.workspaceContextControllerListKnowledgeBases(
          fixture.workspace.id,
          undefined,
          { api },
        );
      createdKnowledgeBaseId = workspaceKnowledgeBases.data.find(
        ({ name }) => name === fixture.knowledgeBase.name,
      )?.id;
      return createdKnowledgeBaseId;
    })
    .toBeTruthy();
  await expect(
    page.getByTestId(`workspace-knowledge-base-${createdKnowledgeBaseId}`),
  ).toBeVisible();

  await page.getByTestId("workspace-tab-instructions").click();
  await page
    .getByTestId("workspace-instruction-input")
    .fill(fixture.instruction);
  await page.getByTestId("workspace-instruction-save").click();

  await expect
    .poll(async () => {
      const context = await generatedApi.workspaceContextControllerFindContext(
        fixture.workspace.id,
        { api },
      );
      return {
        instruction: context.instruction,
        skillCount: context.skills.length,
        knowledgeBaseCount: context.knowledgeBases.length,
      };
    })
    .toEqual({
      instruction: fixture.instruction,
      skillCount: 1,
      knowledgeBaseCount: 1,
    });
});

test("resets project page state when switching projects", async ({
  page,
  api,
}) => {
  const firstFixture = await createProjectContextFixture(api, uniqueSuffix(), {
    attach: true,
  });
  const secondFixture = await createProjectContextFixture(api, uniqueSuffix(), {
    attach: true,
  });

  await page.goto(`/workspaces/${firstFixture.workspace.id}`);
  await expect(page.getByTestId("workspace-page")).toBeVisible();
  await page.getByTestId("workspace-tab-instructions").click();
  await expect(page.getByTestId("workspace-instruction-input")).toHaveValue(
    firstFixture.instruction,
  );

  await page
    .getByRole("link", { name: secondFixture.workspace.name, exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/workspaces/${secondFixture.workspace.id}$`),
  );
  await expect(page.getByTestId("workspace-page")).toBeVisible();
  await expect(page.getByTestId("workspace-tab-chats")).toHaveAttribute(
    "data-state",
    "active",
  );

  await page.getByTestId("workspace-tab-instructions").click();
  await expect(page.getByTestId("workspace-instruction-input")).toHaveValue(
    secondFixture.instruction,
  );
});

test("shows project context in the chat side dock", async ({ page, api }) => {
  const fixture = await createProjectContextFixture(api, uniqueSuffix(), {
    attach: true,
  });
  const thread = await createProjectThread(api, fixture.workspace.id);

  await page.goto(`/chats/${thread.id}`);
  await expect(page.getByTestId("input")).toBeVisible();

  await page.getByTestId("workspace-context-toggle-instructions").click();
  await expect(page.getByTestId("workspace-context-side-panel")).toBeVisible();
  await expect(
    page.getByTestId("workspace-context-instruction-text"),
  ).toContainText(fixture.instruction);

  await page.getByTestId("workspace-context-toggle-skills").click();
  await expect(page.getByTestId("workspace-context-panel-item")).toHaveCount(1);

  await page.getByTestId("workspace-context-toggle-knowledge").click();
  await expect(page.getByTestId("workspace-context-panel-item")).toHaveCount(1);
});

test("recovers from a missing artifact deep link", async ({ page, api }) => {
  const fixture = await createProjectContextFixture(api, uniqueSuffix());
  const thread = await createProjectThread(api, fixture.workspace.id);
  const missingArtifactId = "00000000-0000-4000-8000-000000000000";

  await page.route(`**/api/artifacts/${missingArtifactId}`, (route) =>
    route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ code: "ARTIFACT_NOT_FOUND" }),
    }),
  );

  await page.goto(`/chats/${thread.id}?artifactId=${missingArtifactId}`);
  await expect(page.getByTestId("artifact-side-panel-error")).toBeVisible();
  await expect(page.getByTestId("artifact-side-panel-not-found")).toBeVisible();
  await expect(page.getByTestId("artifact-side-panel-retry")).toHaveCount(0);

  await page.getByTestId("artifact-side-panel-close").click();
  await expect(page).toHaveURL(new RegExp(`/chats/${thread.id}$`));
  await expect(page.getByTestId("artifact-side-panel-error")).toHaveCount(0);
});
