import { test, expect } from "../../src/fixtures/test";
import { createProjectContextFixture } from "../../src/factories/workspace-context.factory";

for (const [kind, fixtureKey] of [
  ["skills", "skill"],
  ["knowledge-bases", "knowledgeBase"],
] as const) {
  test(`keeps the ${kind} detail open when deletion fails`, async ({
    page,
    api,
  }) => {
    const fixture = await createProjectContextFixture(api, `${Date.now()}`, {
      attach: true,
    });
    const id = fixture[fixtureKey].id;
    const detailPath = `/workspaces/${fixture.workspace.id}/${kind}/${id}`;
    const deleteUrl = `**/api/workspaces/${fixture.workspace.id}/context/${kind}/${id}`;
    await page.goto(detailPath);
    await page.route(deleteUrl, async (route) => {
      if (route.request().method() !== "DELETE") return route.continue();
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Delete failed" }),
      });
    });

    await page.getByRole("button", { name: "Löschen", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Löschen", exact: true })
      .click();
    await expect(
      page.locator('[data-sonner-toast][data-type="error"]'),
    ).toContainText(/konnte nicht gelöscht werden/);
    await expect(page).toHaveURL(new RegExp(`${detailPath}$`));

    await page.unroute(deleteUrl);
    await page.getByRole("button", { name: "Löschen", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Löschen", exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/workspaces/${fixture.workspace.id}$`),
    );
  });
}
