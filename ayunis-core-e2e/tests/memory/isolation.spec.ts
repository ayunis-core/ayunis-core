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
  // Memory is off for every organization until an admin switches it on.
  await generatedApi.orgChatSettingsControllerUpsertOrgChatSettings(
    { memoryEnabled: true },
    { api },
  );

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
    await generatedApi.orgChatSettingsControllerUpsertOrgChatSettings(
      { memoryEnabled: false },
      { api },
    );
    await memberApi.dispose();
  }
});
