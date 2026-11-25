import { randomUUID } from "node:crypto";
import {
  createRoutine,
  finishingRoutine,
  getRoutine,
} from "../../src/clients/api/routines.client";
import { test, expect } from "../../src/fixtures/test";

test("a routine's task can be improved and reverted, and a saved rewrite ends the suggestion", async ({
  api,
  page,
  org,
}) => {
  const routine = await createRoutine(
    api,
    finishingRoutine(`Amtsblatt ${randomUUID().slice(0, 8)}`),
  );
  const rewrite = `${org.defaultModel.provider}::${org.defaultModel.name}`;

  await page.goto(`/routines/${routine.id}`);
  const prompt = page.getByTestId("routine-form-prompt");
  await expect(prompt).toHaveValue(routine.prompt);

  const improved = page.waitForResponse(
    (response) =>
      response.url().endsWith("/routines/improve-prompt") &&
      response.request().method() === "POST",
  );
  await page.getByTestId("improve-routine-prompt").click();
  const response = await improved;
  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON()).toMatchObject({
    name: routine.name,
    prompt: routine.prompt,
  });
  await expect(prompt).toHaveValue(rewrite);

  await page.getByTestId("improve-routine-prompt-undo").click();
  await expect(prompt).toHaveValue(routine.prompt);

  await page.getByTestId("improve-routine-prompt").click();
  await expect(prompt).toHaveValue(rewrite);
  // Nothing is stored until the form is saved.
  expect((await getRoutine(api, routine.id)).prompt).toBe(routine.prompt);

  await page.getByTestId("routine-form-submit").click();
  await expect
    .poll(async () => (await getRoutine(api, routine.id)).prompt)
    .toBe(rewrite);
  await expect(page.getByTestId("improve-routine-prompt-undo")).toBeHidden();
  await expect(page.getByTestId("improve-routine-prompt")).toBeVisible();
});
