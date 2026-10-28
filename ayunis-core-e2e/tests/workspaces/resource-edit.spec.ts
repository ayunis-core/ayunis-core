import { test, expect } from "../../src/fixtures/test";
import { createProjectContextFixture } from "../../src/factories/workspace-context.factory";

for (const resource of [
  {
    key: "skill",
    tab: "skills",
    row: "workspace-skill",
    card: "skill-properties-card",
  },
  {
    key: "knowledgeBase",
    tab: "knowledge",
    row: "workspace-knowledge-base",
    card: "knowledge-base-properties-card",
  },
] as const) {
  test(`refreshes the cached ${resource.key} list after editing details`, async ({
    page,
    api,
  }) => {
    const fixture = await createProjectContextFixture(api, `${Date.now()}`, {
      attach: true,
    });
    const rowId = `${resource.row}-${fixture[resource.key].id}`;
    await page.goto(`/workspaces/${fixture.workspace.id}`);
    await page.getByTestId(`workspace-tab-${resource.tab}`).click();
    await page.getByTestId(rowId).click();
    const card = page.getByTestId(resource.card);
    const updatedName = `${fixture[resource.key].name} updated`;
    await card.getByRole("textbox").first().fill(updatedName);
    const saveButton = card.getByRole("button", { name: /speichern$/i });
    await saveButton.click();
    await expect(saveButton).toBeEnabled();
    await page
      .getByLabel("breadcrumb")
      .getByRole("link", { name: fixture.workspace.name, exact: true })
      .click();
    await page.getByTestId(`workspace-tab-${resource.tab}`).click();
    await expect(page.getByTestId(rowId)).toContainText(updatedName);
  });
}
