import { request } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import { login } from "../../src/clients/api/auth.client";
import { generatedApi } from "../../src/clients/api/generated-api";
import { config } from "../../src/config";
import { createOrg } from "../../src/factories/org.factory";
import { createUser } from "../../src/factories/user.factory";
import { expect, test } from "../../src/fixtures/test";

test.setTimeout(120_000);

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

async function findKeyUsage(api: APIRequestContext, apiKeyId: string) {
  const usage = await generatedApi.apiKeyUsageControllerGetApiKeyUsage(
    undefined,
    { api },
  );
  return usage.data.find((item) => item.apiKeyId === apiKeyId);
}

test("shows usage per API key to the org admin, including revoked keys", async ({
  api,
  org,
  page,
  publicApi,
}) => {
  const apiKey = await generatedApi.apiKeysControllerCreateApiKey(
    { name: `E2E usage key ${Date.now()}` },
    { api },
  );

  const response = await requestCompletion(
    publicApi,
    apiKey.secret,
    org.defaultModel.name,
  );
  expect(response.status()).toBe(200);

  await expect
    .poll(async () => (await findKeyUsage(api, apiKey.id))?.requests)
    .toBe(1);

  await generatedApi.apiKeysControllerRevokeApiKey(apiKey.id, { api });
  const revokedUsage = await findKeyUsage(api, apiKey.id);
  expect(revokedUsage?.revokedAt).not.toBeNull();
  expect(revokedUsage?.requests).toBe(1);

  await page.goto("/admin-settings/usage");
  const row = page.getByTestId(`api-key-usage-row-${apiKey.id}`);
  await expect(row).toBeVisible();
  await expect(row.getByTestId("api-key-usage-requests")).toHaveText("1");
});

test("keeps API key usage within the organization and its admins", async ({
  api,
  mail,
}, testInfo) => {
  const apiKey = await generatedApi.apiKeysControllerCreateApiKey(
    { name: `E2E scoped key ${Date.now()}` },
    { api },
  );
  expect(await findKeyUsage(api, apiKey.id)).toBeDefined();

  const member = await createUser(api, mail, `api-key-usage-${Date.now()}`);
  const memberApi = await request.newContext({ baseURL: config.apiURL });
  const otherOrg = await createOrg(
    `api-key-usage-${Date.now()}`,
    testInfo.outputPath("other-org.json"),
  );
  const otherOrgApi = await request.newContext({
    baseURL: config.apiURL,
    storageState: otherOrg.storageState,
  });

  try {
    await login(memberApi, member.email, member.password);
    const memberResponse = await memberApi.get("/api/usage/api-keys");
    expect(memberResponse.status()).toBe(403);

    expect(await findKeyUsage(otherOrgApi, apiKey.id)).toBeUndefined();
  } finally {
    await memberApi.dispose();
    await otherOrgApi.dispose();
  }
});

test("limits the super-admin API key usage view to super admins and the requested org", async ({
  api,
  publicApi,
}) => {
  const apiKey = await generatedApi.apiKeysControllerCreateApiKey(
    { name: `E2E super-admin key ${Date.now()}` },
    { api },
  );
  const { orgId } = await generatedApi.authenticationControllerMe({ api });
  const path = `/api/super-admin/usage/${orgId}/api-keys`;

  const orgAdminResponse = await api.get(path);
  expect(orgAdminResponse.status()).toBe(403);

  await login(publicApi, "admin@demo.local", "admin");
  const requestedOrg =
    await generatedApi.superAdminUsageDataControllerGetApiKeyUsage(
      orgId,
      undefined,
      { api: publicApi },
    );
  expect(requestedOrg.data.map((item) => item.apiKeyId)).toContain(apiKey.id);

  const superAdmin = await generatedApi.authenticationControllerMe({
    api: publicApi,
  });
  const ownOrg = await generatedApi.superAdminUsageDataControllerGetApiKeyUsage(
    superAdmin.orgId,
    undefined,
    { api: publicApi },
  );
  expect(ownOrg.data.map((item) => item.apiKeyId)).not.toContain(apiKey.id);
});
