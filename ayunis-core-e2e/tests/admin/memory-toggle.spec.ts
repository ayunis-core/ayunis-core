import { request } from "@playwright/test";
import { test, expect } from "../../src/fixtures/test";
import { config } from "../../src/config";
import { generatedApi } from "../../src/clients/api/generated-api";
import { createUser } from "../../src/factories/user.factory";
import { login } from "../../src/clients/api/auth.client";

// Memory is off for every organization until an admin switches it on. The
// member-readable chat-start defaults are what the frontend uses to decide
// whether to show the memory settings page, so they must follow the switch.
test("admin enables memory for the organization and members see the flag", async ({
  api,
  mail,
}) => {
  const previous =
    await generatedApi.orgChatSettingsControllerGetOrgChatSettings({ api });
  const member = await createUser(api, mail, `memory-toggle-${Date.now()}`);
  const memberApi = await request.newContext({ baseURL: config.apiURL });
  const setMemoryEnabled = (memoryEnabled: boolean) =>
    generatedApi.orgChatSettingsControllerUpsertOrgChatSettings(
      { memoryEnabled },
      { api },
    );
  const readMemoryEnabled = async (): Promise<boolean> =>
    (await generatedApi.orgChatSettingsControllerGetOrgChatSettings({ api }))
      .memoryEnabled;
  const readMemberFlag = async (): Promise<boolean> =>
    (
      await generatedApi.orgChatSettingsControllerGetChatStartDefaults({
        api: memberApi,
      })
    ).memoryEnabled;

  try {
    await login(memberApi, member.email, member.password);

    await setMemoryEnabled(false);
    expect(await readMemoryEnabled()).toBe(false);
    expect(await readMemberFlag()).toBe(false);

    // Only an admin may change it.
    await expect(
      generatedApi.orgChatSettingsControllerUpsertOrgChatSettings(
        { memoryEnabled: true },
        { api: memberApi },
      ),
    ).rejects.toThrow("HTTP 403");
    expect(await readMemberFlag()).toBe(false);

    await setMemoryEnabled(true);
    expect(await readMemoryEnabled()).toBe(true);
    expect(await readMemberFlag()).toBe(true);

    // The switch only changes memory; the other settings keep their values.
    const after =
      await generatedApi.orgChatSettingsControllerGetOrgChatSettings({ api });
    expect(after.internetSearchEnabled).toBe(previous.internetSearchEnabled);
    expect(after.anonymousModeByDefault).toBe(previous.anonymousModeByDefault);
  } finally {
    await setMemoryEnabled(previous.memoryEnabled);
    await memberApi.dispose();
  }
});
