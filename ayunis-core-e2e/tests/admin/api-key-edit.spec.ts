import { request } from "@playwright/test";
import {
  requestChatCompletionWithApiKey,
  requestUpdateApiKey,
} from "../../src/clients/api/api-keys.client";
import { login } from "../../src/clients/api/auth.client";
import { generatedApi } from "../../src/clients/api/generated-api";
import { config } from "../../src/config";
import { createOrg } from "../../src/factories/org.factory";
import { createUser } from "../../src/factories/user.factory";
import { expect, test } from "../../src/fixtures/test";

test.setTimeout(120_000);

test("renames an API key and edits its description without changing the secret", async ({
  api,
  org,
  page,
  publicApi,
}) => {
  const apiKey = await generatedApi.apiKeysControllerCreateApiKey(
    { name: `E2E edit key ${Date.now()}` },
    { api },
  );
  const newName = `E2E renamed key ${Date.now()}`;

  await page.goto("/admin-settings/api-keys");
  const item = page.getByTestId(`api-key-item-${apiKey.id}`);
  await item.getByTestId("api-key-actions-menu").click();
  await page.getByTestId("api-key-edit").click();
  await page.getByTestId("api-key-edit-name").fill(newName);
  await page
    .getByTestId("api-key-edit-description")
    .fill("OptiGov connector, server portal-01");
  await page.getByTestId("api-key-edit-save").click();
  await expect(page.getByTestId("api-key-edit-dialog")).toHaveCount(0);

  await expect(item).toContainText(newName);
  await expect(item.getByTestId("api-key-description")).toHaveText(
    "OptiGov connector, server portal-01",
  );

  const completion = await requestChatCompletionWithApiKey(
    publicApi,
    apiKey.secret,
    org.defaultModel.name,
  );
  expect(completion.status()).toBe(200);

  const cleared = await requestUpdateApiKey(api, apiKey.id, {
    description: null,
  });
  expect(cleared.status()).toBe(200);
  expect(await cleared.json()).toMatchObject({
    name: newName,
    description: null,
  });

  const refilled = await requestUpdateApiKey(api, apiKey.id, {
    description: "Refilled",
  });
  expect(await refilled.json()).toMatchObject({
    name: newName,
    description: "Refilled",
  });
});

test("sets, changes and removes the expiry date of an active key", async ({
  api,
  org,
  publicApi,
}) => {
  const apiKey = await generatedApi.apiKeysControllerCreateApiKey(
    { name: `E2E expiry key ${Date.now()}` },
    { api },
  );
  const inOneWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const set = await requestUpdateApiKey(api, apiKey.id, {
    expiresAt: inOneWeek.toISOString(),
  });
  expect(set.status()).toBe(200);
  expect(new Date((await set.json()).expiresAt).getTime()).toBe(
    inOneWeek.getTime(),
  );

  const completion = await requestChatCompletionWithApiKey(
    publicApi,
    apiKey.secret,
    org.defaultModel.name,
  );
  expect(completion.status()).toBe(200);

  const past = await requestUpdateApiKey(api, apiKey.id, {
    expiresAt: new Date(Date.now() - 60_000).toISOString(),
  });
  expect(past.status()).toBe(400);
  expect(await past.json()).toMatchObject({
    code: "API_KEY_EXPIRATION_IN_PAST",
  });

  const removed = await requestUpdateApiKey(api, apiKey.id, {
    expiresAt: null,
  });
  expect(await removed.json()).toMatchObject({ expiresAt: null });
});

test("rejects edits of archived keys", async ({ api }) => {
  const apiKey = await generatedApi.apiKeysControllerCreateApiKey(
    { name: `E2E revoked key ${Date.now()}` },
    { api },
  );
  await generatedApi.apiKeysControllerRevokeApiKey(apiKey.id, { api });

  const response = await requestUpdateApiKey(api, apiKey.id, {
    name: "Should not change",
  });

  expect(response.status()).toBe(409);
  expect(await response.json()).toMatchObject({
    code: "API_KEY_NOT_EDITABLE",
  });
});

test("keeps API key edits within the organization and its admins", async ({
  api,
  mail,
}, testInfo) => {
  const apiKey = await generatedApi.apiKeysControllerCreateApiKey(
    { name: `E2E scoped edit key ${Date.now()}` },
    { api },
  );
  const member = await createUser(api, mail, `api-key-edit-${Date.now()}`);
  const memberApi = await request.newContext({ baseURL: config.apiURL });
  const otherOrg = await createOrg(
    `api-key-edit-${Date.now()}`,
    testInfo.outputPath("other-org.json"),
  );
  const otherOrgApi = await request.newContext({
    baseURL: config.apiURL,
    storageState: otherOrg.storageState,
  });

  try {
    await login(memberApi, member.email, member.password);
    const memberResponse = await requestUpdateApiKey(memberApi, apiKey.id, {
      name: "Member rename",
    });
    expect(memberResponse.status()).toBe(403);

    const otherOrgResponse = await requestUpdateApiKey(otherOrgApi, apiKey.id, {
      name: "Foreign rename",
    });
    expect(otherOrgResponse.status()).toBe(404);

    const keys = await generatedApi.apiKeysControllerListApiKeys({ api });
    expect(keys.find((key) => key.id === apiKey.id)?.name).toBe(apiKey.name);
  } finally {
    await memberApi.dispose();
    await otherOrgApi.dispose();
  }
});
