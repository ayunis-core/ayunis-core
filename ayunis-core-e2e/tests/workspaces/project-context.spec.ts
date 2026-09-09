import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";
import {
  createProjectContextFixture,
  createProjectThread,
} from "../../src/factories/workspace-context.factory";

function uniqueSuffix(): string {
  return `${Date.now()}`;
}

test("shows project actions and the searchable chat overview", async ({
  page,
  api,
}) => {
  const fixture = await createProjectContextFixture(api, uniqueSuffix());
  await createProjectThread(api, fixture.workspace.id);

  await page.goto("/workspaces");
  await expect(
    page.getByRole("button", { name: "Arbeitsbereich hinzufügen" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Projekte" })).toHaveCount(0);
  await expect(page.getByTestId("workspaces-search")).toHaveCount(0);
  await expect(page.getByTestId("workspace-sort")).toHaveCount(0);
  const workspaceRow = page.getByTestId(`workspace-${fixture.workspace.id}`);
  const starButton = workspaceRow.getByRole("button", {
    name: /Zu Favoriten hinzufügen|Aus Favoriten entfernen/,
  });
  await starButton.hover();
  await expect(page.getByRole("tooltip")).toContainText(/Favoriten/i);

  await page.goto("/chats");
  await expect(
    page.getByTestId("chats-toolbar").getByTestId("chats-search"),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileSearch = page.getByTestId("chats-search");
  await expect(mobileSearch).toBeVisible();
  await mobileSearch.fill("mobile search");
  await expect(page).toHaveURL(/search=mobile(?:%20|\+)search/);
});

test("adds skills, knowledge bases, and instructions to a project", async ({
  page,
  api,
}) => {
  const fixture = await createProjectContextFixture(api, uniqueSuffix());

  await page.goto(`/workspaces/${fixture.workspace.id}`);
  await expect(page.getByTestId("workspace-page")).toBeVisible();
  await page.getByTestId("workspace-actions-menu").click();
  await expect(
    page.getByRole("menuitem", { name: "Arbeitsbereich bearbeiten" }),
  ).toBeVisible();
  await page
    .getByRole("menuitem", { name: "Arbeitsbereich löschen" })
    .click();
  const deleteConfirmation = page.getByTestId("workspace-delete-confirmation");
  const deleteButton = page.getByTestId("workspace-delete-confirm");
  await deleteConfirmation.fill("wrong project name");
  await expect(deleteButton).toBeDisabled();
  await deleteConfirmation.fill(fixture.workspace.name);
  await expect(deleteButton).toBeEnabled();
  await page.getByRole("button", { name: "Abbrechen" }).click();
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
      "workspace-tab-skills",
      "workspace-tab-knowledge",
      "workspace-tab-instructions",
    ]);
  await expect(page.getByTestId("workspace-tab-artifacts")).toContainText(
    "Dokumente",
  );
  await page.getByTestId("workspace-tab-artifacts").click();
  await expect(page.getByTestId("workspace-artifacts-search")).toHaveCount(0);

  await page.getByTestId("workspace-tab-skills").click();
  await expect(page.getByTestId("workspace-skills-search")).toHaveCount(0);
  await page.getByTestId("workspace-skill-create").first().click();
  const createSkillDialog = page.getByRole("dialog");
  await expect(createSkillDialog).toBeVisible();
  await expect(
    createSkillDialog.getByRole("heading", {
      name: "Neue Fähigkeit hinzufügen",
    }),
  ).toBeVisible();
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
  await expect(page).toHaveURL(/\/workspaces\/[^/]+\/skills\/[^/]+$/);
  await expect(page.getByTestId("skill-properties-card")).toBeVisible();
  await expect(page.getByTestId("additional-documents-card")).toBeVisible();
  const detailSkillId = page.url().split("/").at(-1);
  expect(detailSkillId).toBeTruthy();
  await expect(
    page.getByRole("button", { name: "Quelle hinzufügen" }),
  ).toBeVisible();
  const skillSources = await generatedApi.workspaceSkillSourcesControllerList(
    fixture.workspace.id,
    detailSkillId as string,
    { api },
  );
  expect(skillSources).toEqual([]);
  await page.goto(`/workspaces/${fixture.workspace.id}`);
  await page.getByTestId("workspace-tab-skills").click();
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
  const skillRow = page.getByTestId(`workspace-skill-${createdSkillId}`);
  await expect(skillRow).toBeVisible();
  const activeSwitch = page.getByTestId(
    `workspace-skill-active-${createdSkillId}`,
  );
  await expect(activeSwitch).toBeChecked();
  await expect(activeSwitch).toHaveAttribute("data-state", "checked");
  await activeSwitch.hover();
  await expect(page.getByRole("tooltip")).toContainText(
    "Aktive Fähigkeiten können vom Assistenten bei Bedarf",
  );
  await activeSwitch.click();
  await expect
    .poll(async () => {
      const workspaceSkills =
        await generatedApi.workspaceContextControllerListSkills(
          fixture.workspace.id,
          undefined,
          { api },
        );
      return workspaceSkills.data.find(({ id }) => id === createdSkillId)
        ?.isActive;
    })
    .toBe(false);
  await activeSwitch.click();
  await expect(activeSwitch).toBeChecked();
  await page.getByTestId(`workspace-skill-pin-${createdSkillId}`).click();
  await expect
    .poll(async () => {
      const workspaceSkills =
        await generatedApi.workspaceContextControllerListSkills(
          fixture.workspace.id,
          undefined,
          { api },
        );
      return workspaceSkills.data.find(({ id }) => id === createdSkillId)
        ?.isPinned;
    })
    .toBe(true);

  await skillRow.click({ position: { x: 200, y: 20 } });
  await expect(page).toHaveURL(
    new RegExp(`/workspaces/${fixture.workspace.id}/skills/${createdSkillId}$`),
  );
  await page.goto(`/workspaces/${fixture.workspace.id}`);

  await page.getByTestId("workspace-tab-knowledge").click();
  await expect(page.getByTestId("workspace-knowledge-search")).toHaveCount(0);
  await page.getByTestId("workspace-knowledge-create").first().click();
  const createKnowledgeBaseDialog = page.getByRole("dialog");
  await expect(createKnowledgeBaseDialog).toBeVisible();
  await expect(
    createKnowledgeBaseDialog.getByRole("heading", {
      name: "Neue Wissenssammlung erstellen",
    }),
  ).toBeVisible();
  await createKnowledgeBaseDialog
    .getByRole("textbox")
    .nth(0)
    .fill(fixture.knowledgeBase.name);
  await createKnowledgeBaseDialog
    .getByRole("textbox")
    .nth(1)
    .fill("Projektbezogene Bauordnung");
  await createKnowledgeBaseDialog
    .getByRole("button", { name: "Erstellen", exact: true })
    .click();
  await expect(page).toHaveURL(/\/workspaces\/[^/]+\/knowledge-bases\/[^/]+$/);
  await expect(
    page.getByTestId("knowledge-base-properties-card"),
  ).toBeVisible();
  await expect(page.getByTestId("knowledge-base-documents-card")).toBeVisible();
  await page.goto(`/workspaces/${fixture.workspace.id}`);
  await page.getByTestId("workspace-tab-knowledge").click();
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
  const knowledgeBaseRow = page.getByTestId(
    `workspace-knowledge-base-${createdKnowledgeBaseId}`,
  );
  await expect(knowledgeBaseRow).toBeVisible();
  const knowledgeBaseActiveSwitch = page.getByTestId(
    `workspace-knowledge-base-active-${createdKnowledgeBaseId}`,
  );
  await expect(knowledgeBaseActiveSwitch).toBeChecked();
  await expect(knowledgeBaseActiveSwitch).toHaveAttribute(
    "data-state",
    "checked",
  );
  await knowledgeBaseActiveSwitch.hover();
  await expect(page.getByRole("tooltip")).toContainText(
    "Aktive Wissenssammlungen sind in jedem Chat",
  );
  await knowledgeBaseActiveSwitch.click();
  await expect
    .poll(async () => {
      const context = await generatedApi.workspaceContextControllerFindContext(
        fixture.workspace.id,
        { api },
      );
      return context.knowledgeBases.length;
    })
    .toBe(0);
  await knowledgeBaseActiveSwitch.click();
  await expect(knowledgeBaseActiveSwitch).toBeChecked();

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

test("opens a project chat from its clickable row", async ({ page, api }) => {
  const fixture = await createProjectContextFixture(api, uniqueSuffix());
  const thread = await createProjectThread(api, fixture.workspace.id);

  await page.goto(`/workspaces/${fixture.workspace.id}`);
  const chatRow = page.getByTestId(`workspace-chat-${thread.id}`);
  await expect(chatRow).toBeVisible();

  await chatRow
    .getByRole("button", { name: "Zu Favoriten hinzufügen" })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/workspaces/${fixture.workspace.id}$`),
  );

  await chatRow.click();
  await expect(page).toHaveURL(new RegExp(`/chats/${thread.id}$`));
  await expect(page.getByTestId("workspace-context-toggle-skills")).toHaveCount(
    0,
  );
  await expect(
    page.getByTestId("workspace-context-toggle-knowledge"),
  ).toHaveCount(0);
  await expect(
    page.getByTestId("workspace-context-toggle-instructions"),
  ).toHaveCount(0);
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

  await page.getByTestId("chat-side-panel-close").click();
  await expect(page).toHaveURL(new RegExp(`/chats/${thread.id}$`));
  await expect(page.getByTestId("artifact-side-panel-error")).toHaveCount(0);
});
