import type { Page } from '@playwright/test';
import { login } from '../../src/clients/api/auth.client';
import {
  createLanguageCatalogModel,
  deleteCatalogModel,
  permitLanguageModel,
  removePermittedModel,
} from '../../src/clients/api/models.client';
import {
  createEmptyThread,
  deleteThread,
} from '../../src/clients/api/threads.client';
import { test, expect } from '../../src/fixtures/test';

test.use({ storageState: { cookies: [], origins: [] } });

async function loginThroughUi(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login');
  await page.getByTestId('email').fill(email);
  const continueButton = page.getByTestId('login-continue');
  if (await continueButton.isVisible()) await continueButton.click();
  await page.getByTestId('password').fill(password);
  await page.getByTestId('submit').click();
  await expect(page).not.toHaveURL(/\/login/);
}

test('provider fault status follows a model from catalog to an existing chat', async ({
  page,
  api,
  publicApi,
  org,
}) => {
  test.slow();
  const uniqueKey = Date.now().toString();
  const displayName = `E2E Provider Fault ${uniqueKey}`;

  await login(publicApi, 'admin@demo.local', 'admin');
  const catalogModel = await createLanguageCatalogModel(publicApi, {
    name: `e2e-provider-fault-${uniqueKey}`,
    displayName,
  });

  try {
    const permittedModel = await permitLanguageModel(api, catalogModel.id);
    try {
      const thread = await createEmptyThread(api, permittedModel.id);
      try {
        await loginThroughUi(page, 'admin@demo.local', 'admin');
        await page.goto('/super-admin-settings/models-catalog');
        await page
          .getByTestId(`model-catalog-edit-${catalogModel.id}`)
          .click();

        const dialog = page.getByRole('dialog');
        const faultCheckbox = dialog.getByTestId(
          'model-catalog-provider-fault',
        );
        await expect(faultCheckbox).toHaveAttribute('aria-checked', 'false');
        await faultCheckbox.click();
        await expect(faultCheckbox).toHaveAttribute('aria-checked', 'true');
        await dialog.getByRole('button', { name: /Save|Speichern/ }).click();
        await expect(dialog).toBeHidden();

        await page.context().clearCookies();
        await loginThroughUi(page, org.admin.email, org.admin.password);
        await page.goto('/chat');

        const selector = page.getByTestId('chat-model-selector');
        await selector.click();
        const modelOption = page.getByRole('option', {
          name: new RegExp(displayName),
        });
        const indicator = modelOption.getByTestId(
          'model-provider-fault-indicator',
        );
        await expect(indicator).toBeVisible();
        await expect(indicator.locator('svg')).toHaveClass(
          /lucide-triangle-alert/,
        );
        await expect(indicator).not.toContainText('(!)');
        await expect(
          modelOption.getByRole('img', {
            name: /known provider issue|Provider-Störung bekannt/i,
          }),
        ).toBeVisible();

        await indicator.hover();
        await expect(
          page.getByTestId('model-provider-fault-tooltip'),
        ).toBeVisible();

        await modelOption.click();
        await expect(modelOption).toBeHidden();
        await expect(
          selector.getByTestId('model-provider-fault-indicator'),
        ).toBeHidden();

        await page.goto(`/chats/${thread.id}`);
        const warning = page.getByTestId('chat-model-provider-fault-alert');
        await expect(warning).toBeVisible();
        await expect(warning).toContainText(displayName);
        await page.getByTestId('input').fill('Composer remains usable');
        await expect(page.getByTestId('send')).toBeEnabled();
      } finally {
        await deleteThread(api, thread.id);
      }
    } finally {
      await removePermittedModel(api, permittedModel.id);
    }
  } finally {
    await deleteCatalogModel(publicApi, catalogModel.id);
  }
});
