import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";

/** Memory is off for every organization until an admin switches it on. */
async function setMemoryEnabled(
  api: APIRequestContext,
  memoryEnabled: boolean,
) {
  await generatedApi.orgChatSettingsControllerUpsertOrgChatSettings(
    { memoryEnabled },
    { api },
  );
}

async function readMemory(api: APIRequestContext, key: string) {
  const memory = await generatedApi.memoryControllerFindAll({ api });
  return memory.entries.find((entry) => entry.key === key)?.content;
}

test("shows memory in settings and applies an edit made there", async ({
  api,
  page,
}) => {
  const stored = `Stored ${Date.now()}`;
  const edited = `Edited ${Date.now()}`;
  await setMemoryEnabled(api, true);

  await generatedApi.memoryControllerUpsert(
    "personal",
    { content: stored },
    { api },
  );

  try {
    await page.goto("/settings/memory");
    await expect(page.getByTestId("memory-settings-page")).toBeVisible();

    const card = page.getByTestId("memory-entry-personal");
    await expect(card.getByTestId("memory-entry-content")).toHaveText(stored);
    await expect(page.getByTestId("memory-entry-preferences")).toBeVisible();

    await card.getByTestId("memory-entry-edit").click();
    await card.getByTestId("memory-entry-input").fill(edited);
    await card.getByTestId("memory-entry-save").click();

    await expect(card.getByTestId("memory-entry-content")).toHaveText(edited);
    expect(await readMemory(api, "personal")).toBe(edited);
  } finally {
    await generatedApi.memoryControllerClear({ api });
    await setMemoryEnabled(api, false);
  }
});

test("hides the memory surfaces until an admin turns memory on", async ({
  api,
  page,
}) => {
  await setMemoryEnabled(api, false);

  // 404, not 403: a declined feature should not look like a permission problem.
  await expect(generatedApi.memoryControllerFindAll({ api })).rejects.toThrow(
    "HTTP 404",
  );

  await page.goto("/settings/general");
  await expect(
    page.getByRole("link", { name: /Erinnerung|Memory/ }),
  ).toHaveCount(0);

  // A bookmark from before the switch was flipped lands somewhere useful.
  await page.goto("/settings/memory");
  await expect(page).toHaveURL(/\/settings\/general/);

  // Turning memory off must not take the rest of the settings with it.
  await expect(page.getByRole("main")).toBeVisible();
});
