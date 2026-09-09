import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";

for (const kind of ["skill", "knowledge-base"] as const) {
  test(`refreshes personal ${kind} lists after a property edit`, async ({
    page,
    api,
  }) => {
    const name = `Permit regulations ${Date.now()}`;
    const resource =
      kind === "skill"
        ? await generatedApi.skillsControllerCreate(
            {
              name,
              shortDescription: "Check permits",
              instructions: "Check building regulations.",
            },
            { api },
          )
        : await generatedApi.knowledgeBasesControllerCreate(
            { name, description: "Building regulations" },
            { api },
          );
    const listPath = kind === "skill" ? "/skills" : "/knowledge-bases";
    const rowId = `${kind}-card-${resource.id}`;
    await page.goto(listPath);
    await page.getByTestId(rowId).click();
    const card = page.getByTestId(`${kind}-properties-card`);
    const updatedName = `${name} updated`;
    await card.getByRole("textbox").first().fill(updatedName);
    await card.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(
      card.getByRole("button", { name: "Speichern", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("link", {
        name: kind === "skill" ? "Fähigkeiten" : "Wissen",
        exact: true,
      })
      .first()
      .click();
    await expect(page).toHaveURL(new RegExp(`${listPath}$`));
    await expect(page.getByTestId(rowId)).toContainText(updatedName);
  });
}
