import { request } from "@playwright/test";
import { expect, test } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";
import { login } from "../../src/clients/api/auth.client";
import { createUser } from "../../src/factories/user.factory";
import { config } from "../../src/config";

/** The content of the entry stored under `key`, or undefined when absent. */
async function readMemory(api: Parameters<typeof login>[0], key: string) {
  const memory = await generatedApi.memoryControllerFindAll({ api });
  return memory.entries.find((entry) => entry.key === key)?.content;
}

test("keeps one user’s memory out of another user’s memory", async ({
  api,
  mail,
}) => {
  const secret = `Bauamt ${Date.now()}`;

  const member = await createUser(api, mail, `memory-${Date.now()}`);
  const memberApi = await request.newContext({ baseURL: config.apiURL });
  try {
    await login(memberApi, member.email, member.password);

    // Both start empty, so a later difference can only come from the write.
    expect(await readMemory(api, "personal")).toBe("");
    expect(await readMemory(memberApi, "personal")).toBe("");

    await generatedApi.memoryControllerUpsert(
      "personal",
      { content: secret },
      { api },
    );

    expect(await readMemory(api, "personal")).toBe(secret);
    expect(await readMemory(memberApi, "personal")).toBe("");

    const memberMemory = await generatedApi.memoryControllerFindAll({
      api: memberApi,
    });
    expect(JSON.stringify(memberMemory)).not.toContain(secret);
  } finally {
    await generatedApi.memoryControllerClear({ api });
    await memberApi.dispose();
  }
});

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

test("always offers the reserved keys, even with nothing stored", async ({
  page,
}) => {
  await page.goto("/settings/memory");

  await expect(page.getByTestId("memory-entry-personal")).toBeVisible();
  await expect(page.getByTestId("memory-entry-preferences")).toBeVisible();
});
