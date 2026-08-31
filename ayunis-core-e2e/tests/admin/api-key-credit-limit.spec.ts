import type { APIRequestContext } from "@playwright/test";
import { login } from "../../src/clients/api/auth.client";
import { generatedApi } from "../../src/clients/api/generated-api";
import { expect, test } from "../../src/fixtures/test";

async function addUsageSubscription(
  api: APIRequestContext,
  superAdminApi: APIRequestContext,
): Promise<void> {
  const currentUser = await generatedApi.authenticationControllerMe({ api });
  await login(superAdminApi, "admin@demo.local", "admin");
  await generatedApi.superAdminSubscriptionsControllerCreateSubscription(
    currentUser.orgId,
    {
      companyName: "E2E Credit Limits",
      street: "Test Street",
      houseNumber: "1",
      postalCode: "10115",
      city: "Berlin",
      country: "Germany",
      type: "USAGE_BASED",
      monthlyCredits: 10000,
    },
    { api: superAdminApi },
  );
}

async function requestCompletion(
  api: APIRequestContext,
  secret: string,
  model: string,
) {
  return api.post("/api/openai-compat/v1/chat/completions", {
    headers: { Authorization: `Bearer ${secret}` },
    data: {
      model,
      messages: [{ role: "user", content: "Summarize the budget." }],
    },
  });
}

test("sets and removes an API key monthly credit limit", async ({
  api,
  org,
  page,
  publicApi,
}) => {
  await addUsageSubscription(api, publicApi);
  const apiKey = await generatedApi.apiKeysControllerCreateApiKey(
    { name: `E2E limited key ${Date.now()}` },
    { api },
  );

  await page.goto("/admin-settings/api-keys");
  const item = page.getByTestId(`api-key-item-${apiKey.id}`);
  await expect(item).toBeVisible();
  await item.getByTestId("api-key-actions-menu").click();
  await page.getByTestId("api-key-credit-limit-manage").click();
  await page.getByTestId("api-key-credit-limit-input").fill("0");
  await page.getByTestId("api-key-credit-limit-save").click();
  await expect(page.getByTestId("api-key-credit-limit-dialog")).toHaveCount(0);

  const blockedResponse = await requestCompletion(
    publicApi,
    apiKey.secret,
    org.defaultModel.name,
  );
  expect(blockedResponse.status()).toBe(429);
  expect(await blockedResponse.json()).toMatchObject({
    error: { code: "API_KEY_CREDIT_LIMIT_EXCEEDED" },
  });

  await item.getByTestId("api-key-actions-menu").click();
  await page.getByTestId("api-key-credit-limit-remove").click();
  await expect
    .poll(async () => {
      const limits =
        await generatedApi.creditLimitsControllerGetApiKeyLimits({ api });
      return limits.some((limit) => limit.apiKeyId === apiKey.id);
    })
    .toBe(false);

  const allowedResponse = await requestCompletion(
    publicApi,
    apiKey.secret,
    org.defaultModel.name,
  );
  expect(allowedResponse.status()).toBe(200);
});
