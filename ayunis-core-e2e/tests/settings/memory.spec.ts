import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";

/** The content of the entry stored under `key`, or undefined when absent. */
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

    await card.getByTestId("memory-entry-edit").click();
    await card.getByTestId("memory-entry-input").fill(edited);
    await card.getByTestId("memory-entry-save").click();

    await expect(card.getByTestId("memory-entry-content")).toHaveText(edited);
    expect(await readMemory(api, "personal")).toBe(edited);
  } finally {
    await generatedApi.memoryControllerClear({ api });
  }
});

test("shows and edits the description of an open key", async ({
  page,
  api,
}) => {
  const key = "report_template";
  const edited = `When drafting council reports ${Date.now()}`;
  await generatedApi.memoryControllerUpsert(
    key,
    {
      content: "Intro, three findings, next steps",
      description: "How the user wants monthly council reports structured",
    },
    { api },
  );

  try {
    await page.goto("/settings/memory");
    const card = page.getByTestId(`memory-entry-${key}`);
    await expect(card.getByTestId("memory-entry-description")).toHaveText(
      "How the user wants monthly council reports structured",
    );

    await card.getByTestId("memory-entry-edit").click();
    await card.getByTestId("memory-entry-description-input").fill(edited);
    await card.getByTestId("memory-entry-save").click();

    await expect(card.getByTestId("memory-entry-description")).toHaveText(
      edited,
    );
    const memory = await generatedApi.memoryControllerFindAll({ api });
    expect(memory.entries.find((entry) => entry.key === key)?.description).toBe(
      edited,
    );
  } finally {
    await generatedApi.memoryControllerClear({ api });
  }
});

test("always offers the reserved keys, even with nothing stored", async ({
  page,
}) => {
  await page.goto("/settings/memory");

  await expect(page.getByTestId("memory-entry-personal")).toBeVisible();
  await expect(page.getByTestId("memory-entry-preferences")).toBeVisible();
});

// The sidebar entry follows the organization's memory switch. The page itself
// stays reachable by URL so a user can still clear stored entries after an
// admin turns memory off.
test("lists memory in the settings sidebar only while the organization has it on", async ({
  page,
  api,
}) => {
  const previous =
    await generatedApi.orgChatSettingsControllerGetOrgChatSettings({ api });
  const setMemoryEnabled = (memoryEnabled: boolean) =>
    generatedApi.orgChatSettingsControllerUpsertOrgChatSettings(
      { memoryEnabled },
      { api },
    );

  try {
    await setMemoryEnabled(false);
    await page.goto("/settings/general");
    await expect(page.getByTestId("settings-nav-memory")).toHaveCount(0);

    await page.goto("/settings/memory");
    await expect(page.getByTestId("memory-settings-page")).toBeVisible();

    await setMemoryEnabled(true);
    await page.goto("/settings/general");
    await expect(page.getByTestId("settings-nav-memory")).toBeVisible();
  } finally {
    await setMemoryEnabled(previous.memoryEnabled);
  }
});
