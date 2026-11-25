import { login } from "../../src/clients/api/auth.client";
import {
  getModelModeEntries,
  replaceModelModeEntries,
} from "../../src/clients/api/model-modes.client";
import {
  archiveLanguageCatalogModel,
  createLanguageCatalogModel,
  permitLanguageModel,
  removePermittedModel,
} from "../../src/clients/api/models.client";
import {
  findRoutineThread,
  getRoutine,
  runRoutineNow,
} from "../../src/clients/api/routines.client";
import { getThread } from "../../src/clients/api/threads.client";
import { createBlankRoutine } from "../../src/flows/routines.flow";
import { test, expect } from "../../src/fixtures/test";

test("a routine set to Auto runs on the model Auto resolves to", async ({
  api,
  page,
  publicApi,
}) => {
  test.slow();
  const uniqueKey = Date.now().toString();
  const name = `Amtsblatt Auto ${uniqueKey}`;

  await login(publicApi, "admin@demo.local", "admin");
  const catalogModel = await createLanguageCatalogModel(publicApi, {
    name: `e2e-routine-auto-${uniqueKey}`,
    displayName: `E2E Routine Auto ${uniqueKey}`,
    // A routine run needs its finish_routine tool.
    canUseTools: true,
  });
  // The lists are global; only this worker's org permits the new model, so
  // prepending it changes the Auto resolution for this org alone.
  const previousAutoEntries = await getModelModeEntries(publicApi, "auto");
  const permittedModel = await permitLanguageModel(api, catalogModel.id);
  try {
    await replaceModelModeEntries(publicApi, "auto", [
      { modelId: catalogModel.id, enabled: true },
      ...previousAutoEntries,
    ]);

    await page.goto("/routines");
    const routineId = await createBlankRoutine(page, {
      name,
      prompt: `E2E finish routine: ${name}`,
    });
    await page.getByTestId("routine-form-model").click();
    await page.getByTestId("model-select-mode-auto").click();
    await page.getByTestId("routine-form-submit").click();
    await expect
      .poll(async () => {
        const { modelId, mode } = await getRoutine(api, routineId);
        return { modelId, mode };
      })
      .toEqual({ modelId: null, mode: "auto" });

    await page.reload();
    await page.getByTestId("routine-form-model").click();
    await expect(page.getByTestId("model-select-mode-auto")).toHaveAttribute(
      "data-state",
      "checked",
    );

    await runRoutineNow(api, routineId);
    await expect
      .poll(async () => (await getRoutine(api, routineId)).lastRunStatus, {
        timeout: 30_000,
      })
      .toBe("succeeded");
    const thread = await getThread(api, (await findRoutineThread(api, name)).id);
    expect(thread.mode).toBe("auto");
    expect(thread.permittedModelId).toBe(permittedModel.id);
  } finally {
    await replaceModelModeEntries(publicApi, "auto", previousAutoEntries);
    await removePermittedModel(api, permittedModel.id);
    await archiveLanguageCatalogModel(publicApi, catalogModel);
  }
});
