import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";

test("skill improver uses the current UI language after a language switch", async ({
  page,
  api,
  org,
}) => {
  const skill = await generatedApi.skillsControllerCreate(
    {
      ownerType: "personal",
      name: `Language fallback ${Date.now()}`,
      shortDescription: "asdkfj qwpoeir zxcv",
      instructions: "zxcv qwpoeir",
    },
    { api },
  );

  await page.goto("/settings/general");
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "English", exact: true }).click();
  await page.goto(`/skills/${skill.id}`);

  const englishResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/skills/improve-text") &&
      response.request().method() === "POST",
  );
  await page.getByTestId("improve-skill-trigger").click();
  const first = await englishResponse;
  expect(first.request().postDataJSON()).toMatchObject({
    language: "en",
    trigger: "asdkfj qwpoeir zxcv",
  });
  expect(first.status()).toBe(200);
  await expect(page.getByTestId("improve-skill-trigger-retry")).toBeVisible();

  await page.goto("/settings/general");
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "Deutsch", exact: true }).click();
  await page.goto(`/skills/${skill.id}`);

  const germanResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/skills/improve-text") &&
      response.request().method() === "POST",
  );
  await page.getByTestId("improve-skill-trigger").click();
  const second = await germanResponse;
  expect(second.request().postDataJSON()).toMatchObject({
    language: "de",
    trigger: "asdkfj qwpoeir zxcv",
  });
  expect(second.status()).toBe(200);
  await expect(
    page.getByTestId("skill-properties-card").getByRole("textbox").nth(1),
  ).toHaveValue(`${org.defaultModel.provider}::${org.defaultModel.name}`);

  const retryResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/skills/improve-text") &&
      response.request().method() === "POST",
  );
  await page.getByTestId("improve-skill-trigger-retry").click();
  const retry = await retryResponse;
  expect(retry.request().postDataJSON()).toMatchObject({
    language: "de",
    trigger: "asdkfj qwpoeir zxcv",
  });
  expect(retry.status()).toBe(200);
});
