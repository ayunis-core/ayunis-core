import { request } from '@playwright/test';
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import {
  requestChatCompletionWithApiKey,
  requestModelsWithApiKey,
} from '../../src/clients/api/api-keys.client';
import { login } from '../../src/clients/api/auth.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import {
  archiveLanguageCatalogModel,
  createLanguageCatalogModel,
  deleteCatalogModel,
  permitLanguageModel,
  removePermittedModel,
} from '../../src/clients/api/models.client';
import { dismissWelcomeVideo } from '../../src/clients/api/onboarding.client';
import { test, expect } from '../../src/fixtures/test';
import { loginThroughUi } from '../../src/flows/auth.flow';

test.use({ storageState: { cookies: [], origins: [] } });

interface ChatCompletionResponse {
  model: string;
  choices: Array<{ message: { content: string | null } }>;
}

interface ModelListResponse {
  data: Array<{ id: string }>;
}

async function editCatalogModel(
  page: Page,
  modelId: string,
  changes: { name?: string; alias?: string },
): Promise<Locator> {
  await page.getByTestId(`model-catalog-edit-${modelId}`).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  if (changes.name !== undefined) {
    await dialog.getByTestId('model-catalog-name').fill(changes.name);
  }
  if (changes.alias !== undefined) {
    await dialog.getByTestId('model-catalog-alias').fill(changes.alias);
  }
  await dialog.getByRole('button', { name: /Save|Speichern/ }).click();
  return dialog;
}

async function complete(
  client: APIRequestContext,
  secret: string,
  model: string,
): Promise<{ status: number; body: ChatCompletionResponse }> {
  const response = await requestChatCompletionWithApiKey(client, secret, model);
  return {
    status: response.status(),
    body: (await response.json()) as ChatCompletionResponse,
  };
}

test('API clients keep their model alias when a super admin swaps the provider model', async ({
  page,
  api,
  publicApi,
}) => {
  test.slow();
  const uniqueKey = Date.now().toString();
  const alias = `e2e-alias-${uniqueKey}`;
  const renamedAlias = `e2e-alias-renamed-${uniqueKey}`;
  const firstVersion = `e2e-provider-v1-${uniqueKey}`;
  const secondVersion = `e2e-provider-v2-${uniqueKey}`;

  await login(publicApi, 'admin@demo.local', 'admin');
  await dismissWelcomeVideo(publicApi);
  const catalogModel = await createLanguageCatalogModel(publicApi, {
    name: firstVersion,
    alias,
    displayName: `E2E Alias ${uniqueKey}`,
  });
  const otherModel = await createLanguageCatalogModel(publicApi, {
    name: `e2e-other-${uniqueKey}`,
    alias: `e2e-taken-${uniqueKey}`,
    displayName: `E2E Taken Alias ${uniqueKey}`,
  });
  const permittedModel = await permitLanguageModel(api, catalogModel.id);
  const { secret } = await generatedApi.apiKeysControllerCreateApiKey(
    { name: `E2E model alias ${uniqueKey}` },
    { api },
  );
  const client = await request.newContext();

  try {
    let result = await complete(client, secret, alias);
    expect(result.status).toBe(200);
    expect(result.body.model).toBe(alias);
    expect(result.body.choices[0]?.message.content).toBe(
      `openai::${firstVersion}`,
    );
    expect((await complete(client, secret, firstVersion)).status).toBe(404);

    await loginThroughUi(page, 'admin@demo.local', 'admin');
    await page.goto('/super-admin-settings/models-catalog');
    const swapDialog = await editCatalogModel(page, catalogModel.id, {
      name: secondVersion,
    });
    await expect(swapDialog).toBeHidden();

    result = await complete(client, secret, alias);
    expect(result.status).toBe(200);
    expect(result.body.model).toBe(alias);
    expect(result.body.choices[0]?.message.content).toBe(
      `openai::${secondVersion}`,
    );
    const models = (await (
      await requestModelsWithApiKey(client, secret)
    ).json()) as ModelListResponse;
    expect(models.data.map(({ id }) => id)).toContain(alias);
    expect(models.data.map(({ id }) => id)).not.toContain(secondVersion);

    const conflictDialog = await editCatalogModel(page, catalogModel.id, {
      alias: otherModel.alias,
    });
    await expect(
      conflictDialog.getByTestId('model-catalog-alias'),
    ).toHaveAttribute('aria-invalid', 'true');
    await conflictDialog.getByTestId('model-catalog-alias').fill(renamedAlias);
    await conflictDialog.getByRole('button', { name: /Save|Speichern/ }).click();
    await expect(conflictDialog).toBeHidden();

    expect((await complete(client, secret, alias)).status).toBe(404);
    result = await complete(client, secret, renamedAlias);
    expect(result.status).toBe(200);
    expect(result.body.model).toBe(renamedAlias);
  } finally {
    await client.dispose();
    await removePermittedModel(api, permittedModel.id);
    await deleteCatalogModel(publicApi, otherModel.id);
    // Usage recorded by the completions blocks deletion.
    await archiveLanguageCatalogModel(publicApi, {
      ...catalogModel,
      name: secondVersion,
      alias: renamedAlias,
    });
  }
});
