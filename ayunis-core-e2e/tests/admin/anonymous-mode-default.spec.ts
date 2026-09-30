import { request } from "@playwright/test";
import { test, expect } from "../../src/fixtures/test";
import { config } from "../../src/config";
import { generatedApi } from "../../src/clients/api/generated-api";
import { createUser } from "../../src/factories/user.factory";
import { createOrg } from "../../src/factories/org.factory";
import { login } from "../../src/clients/api/auth.client";
import { dismissWelcomeVideo } from "../../src/clients/api/onboarding.client";
import { skipChatPersonalization } from "../../src/clients/api/chat-settings.client";
import { sendMessage } from "../../src/flows/chat.flow";

test("admin default reaches members, preserves settings, and permits per-chat opt-out", async ({
  page,
  api,
  mail,
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const previousSettings =
    await generatedApi.orgChatSettingsControllerGetOrgChatSettings({ api });
  const [model] = await generatedApi.modelsControllerGetPermittedLanguageModels(
    { api },
  );
  const member = await createUser(api, mail, `anonymous-${Date.now()}`);
  const unauthenticatedApi = await request.newContext({
    baseURL: config.apiURL,
    storageState: { cookies: [], origins: [] },
  });
  const memberApi = await request.newContext({ baseURL: config.apiURL });
  await login(memberApi, member.email, member.password);
  await dismissWelcomeVideo(memberApi);
  await skipChatPersonalization(memberApi);
  const otherOrg = await createOrg(
    `anonymous-other-${Date.now()}`,
    testInfo.outputPath("other-org.json"),
  );
  const otherApi = await request.newContext({
    baseURL: config.apiURL,
    storageState: otherOrg.storageState,
  });
  const memberContext = await browser.newContext({
    storageState: await memberApi.storageState(),
  });
  const memberPage = await memberContext.newPage();
  const errors: string[] = [];
  memberPage.on("pageerror", (error) => errors.push(error.message));
  const readDefault = (principal = memberApi) =>
    generatedApi.orgChatSettingsControllerGetChatStartDefaults({
      api: principal,
    });
  const update = (
    data: { anonymousModeByDefault?: boolean; internetSearchEnabled?: boolean },
    principal = api,
  ) =>
    generatedApi.orgChatSettingsControllerUpsertOrgChatSettings(data, {
      api: principal,
    });
  try {
    await update({
      anonymousModeByDefault: false,
      internetSearchEnabled: false,
    });
    expect(await readDefault()).toEqual({ anonymousModeByDefault: false });
    await expect(readDefault(unauthenticatedApi)).rejects.toThrow("HTTP 403");
    await expect(
      update({ anonymousModeByDefault: true }, memberApi),
    ).rejects.toThrow("HTTP 403");
    await memberPage.goto("/chat");
    await expect(
      memberPage.getByTestId("chat-anonymous-toggle"),
    ).toHaveAttribute("aria-pressed", "false");

    await page.goto("/admin-settings/anonymization");
    await page.getByTestId("anonymization-default-switch").click();
    await expect(
      page.getByTestId("anonymization-default-switch"),
    ).toBeChecked();
    await expect.poll(readDefault).toEqual({ anonymousModeByDefault: true });
    await page.reload();
    await expect(
      page.getByTestId("anonymization-default-switch"),
    ).toBeChecked();
    expect(
      (await generatedApi.orgChatSettingsControllerGetOrgChatSettings({ api }))
        .internetSearchEnabled,
    ).toBe(false);
    expect(await readDefault(otherApi)).toEqual({
      anonymousModeByDefault: false,
    });

    await memberPage.reload();
    await expect(
      memberPage.getByTestId("chat-anonymous-toggle"),
    ).toHaveAttribute("aria-pressed", "true");
    await memberPage.getByTestId("chat-anonymous-toggle").click();
    await sendMessage(memberPage, "Explain the role of a municipal council.");
    await expect(memberPage).toHaveURL(/\/chats\/[0-9a-f-]+/);
    const threadId = /\/chats\/([0-9a-f-]+)/.exec(memberPage.url())?.[1];
    expect(threadId).toBeDefined();
    expect(
      (
        await generatedApi.threadsControllerFindOne(threadId!, {
          api: memberApi,
        })
      ).isAnonymous,
    ).toBe(false);
    await memberPage.goto("/chat");
    await expect(
      memberPage.getByTestId("chat-anonymous-toggle"),
    ).toHaveAttribute("aria-pressed", "true");

    const workspace = await generatedApi.workspacesControllerCreate(
      { name: "Anonymous chat defaults", icon: "building-2" },
      { api: memberApi },
    );
    await memberPage.goto(`/workspaces/${workspace.id}`);
    await expect(
      memberPage.getByTestId("chat-anonymous-toggle"),
    ).toHaveAttribute("aria-pressed", "true");

    await Promise.all([
      update({ anonymousModeByDefault: false }),
      update({ internetSearchEnabled: true }),
    ]);
    expect(
      await generatedApi.orgChatSettingsControllerGetOrgChatSettings({ api }),
    ).toEqual({ anonymousModeByDefault: false, internetSearchEnabled: true });
    await update({ anonymousModeByDefault: true });
    await update({ internetSearchEnabled: false });
    expect(await readDefault()).toEqual({ anonymousModeByDefault: true });
    await expect(update({})).rejects.toThrow("HTTP 400");
    expect(await readDefault()).toEqual({ anonymousModeByDefault: true });
    expect(
      (
        await generatedApi.threadsControllerFindOne(threadId!, {
          api: memberApi,
        })
      ).isAnonymous,
    ).toBe(false);
    await update({ anonymousModeByDefault: false });

    await generatedApi.modelsControllerUpdatePermittedModel(
      model.id,
      { anonymousOnly: true },
      { api },
    );
    await memberPage.goto("/chat");
    await expect(
      memberPage.getByTestId("chat-anonymous-toggle"),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      memberPage.getByTestId("chat-anonymous-toggle"),
    ).toBeDisabled();
    const enforcedThread = await generatedApi.threadsControllerCreate(
      { modelId: model.id, isAnonymous: false },
      { api: memberApi },
    );
    expect(enforcedThread.isAnonymous).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    await generatedApi.modelsControllerUpdatePermittedModel(
      model.id,
      { anonymousOnly: model.anonymousOnly },
      { api },
    );
    await update(previousSettings);
    await memberContext.close();
    await memberApi.dispose();
    await unauthenticatedApi.dispose();
    await otherApi.dispose();
  }
});
