import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";

test("workspace favorites are an explicit choice and survive reload", async ({
  page,
  api,
}) => {
  const existing = await generatedApi.workspacesControllerCreate(
    { name: `Existing favorite ${Date.now()}` },
    { api },
  );
  await generatedApi.favoritesControllerToggle(
    { referenceType: "workspace", referenceId: existing.id },
    { api },
  );
  const name = `Optional favorite ${Date.now()}`;
  await page.goto("/workspaces");
  await page
    .getByRole("button", { name: "Arbeitsbereich hinzufügen" })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Woran arbeiten Sie?" }).fill(name);
  await dialog
    .getByRole("button", { name: "Arbeitsbereich erstellen", exact: true })
    .click();
  await expect(dialog).toBeHidden();

  const row = page.getByTestId(/^workspace-/).filter({
    has: page.getByRole("link", { name, exact: true }),
  });
  const sidebar = page.getByTestId("sidebar");
  const favorite = sidebar.getByRole("link", { name, exact: true });
  await expect(row).toBeVisible();
  await expect(
    row.getByRole("button", { name: "Zu Favoriten hinzufügen" }),
  ).toBeVisible();
  await expect(favorite).toHaveCount(0);
  await expect(
    sidebar.getByRole("link", { name: existing.name, exact: true }),
  ).toBeVisible();

  await row.getByRole("button", { name: "Zu Favoriten hinzufügen" }).click();
  await expect(favorite).toBeVisible();
  await page.reload();
  await expect(favorite).toBeVisible();
  await row.getByRole("button", { name: "Aus Favoriten entfernen" }).click();
  await expect(favorite).toHaveCount(0);
  await page.reload();
  await expect(row).toBeVisible();
  await expect(
    row.getByRole("button", { name: "Zu Favoriten hinzufügen" }),
  ).toBeVisible();
  await expect(favorite).toHaveCount(0);
  await expect(
    sidebar.getByRole("link", { name: existing.name, exact: true }),
  ).toBeVisible();
});
