import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";
import {
  createProjectContextFixture,
  createProjectThread,
} from "../../src/factories/workspace-context.factory";

function uniqueSuffix(): string {
  return `${Date.now()}`;
}

test("attaches skills, knowledge bases, and instructions to a project", async ({
  page,
  api,
}) => {
  const fixture = await createProjectContextFixture(api, uniqueSuffix());

  await page.goto(`/workspaces/${fixture.workspace.id}`);
  await expect(page.getByTestId("workspace-page")).toBeVisible();
  await expect(page.getByTestId("workspace-chats-empty")).toBeVisible();
  await expect(page.getByTestId("workspace-chats-search")).toHaveCount(0);

  await page.getByTestId("workspace-tab-skills").click();
  await expect(page.getByTestId("workspace-skills-search")).toHaveCount(0);
  await page.getByTestId("workspace-skills-add").first().click();
  await expect(page.getByTestId("workspace-add-dialog")).toBeVisible();
  await expect(page.getByTestId("workspace-add-dialog-search")).toHaveCount(0);
  await page
    .getByTestId(`workspace-add-dialog-item-${fixture.skill.id}`)
    .click();
  await page.getByTestId("workspace-add-dialog-confirm").click();
  await expect(
    page.getByTestId(`workspace-skill-${fixture.skill.id}`),
  ).toBeVisible();

  await page.getByTestId("workspace-tab-knowledge").click();
  await expect(page.getByTestId("workspace-knowledge-search")).toHaveCount(0);
  await expect(page.getByTestId("workspace-documents-search")).toHaveCount(0);
  await page.getByTestId("workspace-knowledge-add").first().click();
  await expect(page.getByTestId("workspace-add-dialog")).toBeVisible();
  await expect(page.getByTestId("workspace-add-dialog-search")).toHaveCount(0);
  await page
    .getByTestId(`workspace-add-dialog-item-${fixture.knowledgeBase.id}`)
    .click();
  await page.getByTestId("workspace-add-dialog-confirm").click();
  await expect(
    page.getByTestId(`workspace-knowledge-base-${fixture.knowledgeBase.id}`),
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
