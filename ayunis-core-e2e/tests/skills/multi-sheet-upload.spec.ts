import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { generatedApi } from "../../src/clients/api/generated-api";
import { test, expect } from "../../src/fixtures/test";

const workbookPath = fileURLToPath(
  new URL("../../fixtures/two-sheet-workbook.xlsx", import.meta.url),
);

test("keeps every worksheet attached after uploading a workbook", async ({
  page,
  api,
}) => {
  const skill = await generatedApi.skillsControllerCreate(
    {
      name: `Multi-sheet upload ${Date.now()}`,
      shortDescription: "Use municipal data from the attached workbook.",
      instructions: "Answer with information from the attached workbook.",
    },
    { api },
  );

  const upload = await api.post(`/api/skills/${skill.id}/sources/file`, {
    multipart: {
      file: {
        name: "two-sheet-workbook.xlsx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: await readFile(workbookPath),
      },
    },
  });
  expect(upload.ok()).toBe(true);

  await page.goto(`/skills/${skill.id}`);
  await expect(page.getByTestId(/^source-item-/)).toHaveCount(2);

  await expect
    .poll(
      async () => {
        const sources =
          await generatedApi.skillSourcesControllerGetSkillSources(skill.id, {
            api,
          });
        return sources
          .map((source) => ({ name: source.name, status: source.status }))
          .sort((left, right) => left.name.localeCompare(right.name));
      },
      { timeout: 30_000 },
    )
    .toEqual([
      { name: "two-sheet-workbook_Cities.csv", status: "ready" },
      { name: "two-sheet-workbook_Products.csv", status: "ready" },
    ]);

  await page.reload();
  const sources = await generatedApi.skillSourcesControllerGetSkillSources(
    skill.id,
    { api },
  );
  await expect(page.getByTestId(/^source-item-/)).toHaveCount(2);
  for (const source of sources) {
    await expect(page.getByTestId(`source-item-${source.id}`)).toContainText(
      source.name,
    );
  }
});
