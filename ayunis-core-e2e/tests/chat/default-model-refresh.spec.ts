import { sendMessage } from "../../src/flows/chat.flow";
import { test, expect } from "../../src/fixtures/test";
import {
  getConfiguredLanguageCandidates,
  permitLanguageModel,
  getEffectiveDefaultModel,
  setOrgDefaultModel,
  setUserDefaultModel,
  removeUserDefaultModel,
} from "../../src/clients/api/models.client";
import {
  createTeam,
  addTeamMember,
  setTeamModelOverride,
  grantTeamModel,
  setTeamDefaultModel,
  deleteTeam,
} from "../../src/clients/api/teams.client";
import { getAuthenticatedPrincipalId } from "../../src/clients/api/auth.client";

test("refreshes the saved team and organization defaults when starting a new chat", async ({
  page,
  api,
}) => {
  const initialDefault = await getEffectiveDefaultModel(api);
  if (!initialDefault) throw new Error("Missing initial default");
  const candidates = await getConfiguredLanguageCandidates(api);
  const large = candidates.find((m) => m.name === "mistral-large-latest");
  const previous = candidates.find((m) => m.modelId !== large?.modelId);
  if (!large || !previous) throw new Error("Missing seeded model candidates");
  const largePermitId =
    large.permittedModelId ??
    (await permitLanguageModel(api, large.modelId)).id;
  const previousPermitId =
    previous.permittedModelId ??
    (await permitLanguageModel(api, previous.modelId)).id;
  let team: Awaited<ReturnType<typeof createTeam>> | undefined;
  let hasPersonalOverride = false;
  try {
    await setOrgDefaultModel(api, previousPermitId);
    team = await createTeam(api, `AYC-1243-${Date.now()}`);
    await addTeamMember(api, team.id, await getAuthenticatedPrincipalId(api));
    const largeTeam = await grantTeamModel(api, team.id, large.modelId);
    const previousTeam = await grantTeamModel(api, team.id, previous.modelId);
    await setTeamModelOverride(api, team, true);
    await setTeamDefaultModel(api, team.id, previousTeam.id);
    await page.goto("/chat");
    await expect(page.getByTestId("chat-model-selector")).toContainText(
      previous.displayName.split(" (")[0],
    );
    await setOrgDefaultModel(api, largePermitId);
    await setTeamDefaultModel(api, team.id, largeTeam.id);
    expect((await getEffectiveDefaultModel(api))?.modelId).toBe(large.modelId);
    await page.getByTestId("sidebar-navigation-new-chat").click();
    await expect(page.getByTestId("chat-model-selector")).toContainText(
      large.displayName.split(" (")[0],
    );
    await setUserDefaultModel(api, previousTeam.id);
    hasPersonalOverride = true;
    await page.reload();
    await expect(page.getByTestId("chat-model-selector")).toContainText(
      previous.displayName.split(" (")[0],
    );
    await removeUserDefaultModel(api);
    hasPersonalOverride = false;
    await page.reload();
    await expect(page.getByTestId("chat-model-selector")).toContainText(
      large.displayName.split(" (")[0],
    );
    await sendMessage(page, "Use the configured default");
    await expect(page.getByTestId("assistant-message").last()).toContainText(
      `${large.provider}::${large.name}`,
    );
  } finally {
    try {
      if (hasPersonalOverride) await removeUserDefaultModel(api);
    } finally {
      try {
        if (team) await deleteTeam(api, team.id);
      } finally {
        await setOrgDefaultModel(api, initialDefault.id);
      }
    }
  }
});
