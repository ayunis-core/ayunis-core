import { randomUUID } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import { getEffectiveDefaultModel } from "../../src/clients/api/models.client";
import { getRoutine } from "../../src/clients/api/routines.client";
import { createBlankRoutine } from "../../src/flows/routines.flow";
import { test, expect } from "../../src/fixtures/test";

async function defaultModelOf(api: APIRequestContext) {
  const model = await getEffectiveDefaultModel(api);
  if (!model) throw new Error("The worker org has no default model");
  return model;
}

test("a routine can go back to the user's default model after a model was chosen", async ({
  api,
  page,
}) => {
  const model = await defaultModelOf(api);
  await page.goto("/routines");
  const routineId = await createBlankRoutine(page, {
    name: `Amtsblatt ${randomUUID().slice(0, 8)}`,
    prompt: "Fasse die heutigen Bekanntmachungen zusammen.",
  });
  expect((await getRoutine(api, routineId)).modelId).toBeNull();

  const modelSelect = page.getByTestId("routine-form-model");
  await modelSelect.click();
  // Model names are catalogue data, not translated copy.
  await page
    .getByRole("option", { name: model.displayName, exact: true })
    .click();
  await page.getByTestId("routine-form-submit").click();
  await expect
    .poll(async () => (await getRoutine(api, routineId)).modelId)
    .toBe(model.id);

  await modelSelect.click();
  await page.getByTestId("routine-form-model-default").click();
  await page.getByTestId("routine-form-submit").click();
  await expect
    .poll(async () => (await getRoutine(api, routineId)).modelId)
    .toBeNull();

  await page.reload();
  await page.getByTestId("routine-form-model").click();
  await expect(page.getByTestId("routine-form-model-default")).toHaveAttribute(
    "data-state",
    "checked",
  );
});
