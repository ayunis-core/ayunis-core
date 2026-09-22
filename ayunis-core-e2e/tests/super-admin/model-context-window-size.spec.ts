import type { Locator, Page } from '@playwright/test';
import { login } from '../../src/clients/api/auth.client';
import {
  createLanguageCatalogModel,
  deleteCatalogModel,
} from '../../src/clients/api/models.client';
import { test, expect } from '../../src/fixtures/test';

test.use({ storageState: { cookies: [], origins: [] } });

async function loginThroughUi(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByTestId('email').fill('admin@demo.local');
  const continueButton = page.getByTestId('login-continue');
  if (await continueButton.isVisible()) await continueButton.click();
  await page.getByTestId('password').fill('admin');
  await page.getByTestId('submit').click();
  await expect(page).not.toHaveURL(/\/login/);
}

async function openEditDialog(
  page: Page,
  modelId: string,
): Promise<Locator> {
  await page.getByTestId(`model-catalog-edit-${modelId}`).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

async function saveDialog(dialog: Locator): Promise<void> {
  await dialog.getByRole('button', { name: /Save|Speichern/ }).click();
  await expect(dialog).toBeHidden();
}

test('super admin can set, change, and clear a model context window', async ({
  page,
  publicApi,
}) => {
  const uniqueKey = Date.now().toString();

  await login(publicApi, 'admin@demo.local', 'admin');
  const catalogModel = await createLanguageCatalogModel(publicApi, {
    name: `e2e-context-window-${uniqueKey}`,
    displayName: `E2E Context Window ${uniqueKey}`,
  });

  try {
    await loginThroughUi(page);
    await page.goto('/super-admin-settings/models-catalog');

    let dialog = await openEditDialog(page, catalogModel.id);
    let contextWindowInput = dialog.getByTestId(
      'model-catalog-context-window-size',
    );
    await expect(contextWindowInput).toHaveValue('');
    await contextWindowInput.fill('128000');
    await saveDialog(dialog);

    dialog = await openEditDialog(page, catalogModel.id);
    contextWindowInput = dialog.getByTestId(
      'model-catalog-context-window-size',
    );
    await expect(contextWindowInput).toHaveValue('128000');
    await contextWindowInput.fill('256000');
    await saveDialog(dialog);

    dialog = await openEditDialog(page, catalogModel.id);
    contextWindowInput = dialog.getByTestId(
      'model-catalog-context-window-size',
    );
    await expect(contextWindowInput).toHaveValue('256000');
    await contextWindowInput.clear();
    await saveDialog(dialog);

    dialog = await openEditDialog(page, catalogModel.id);
    await expect(
      dialog.getByTestId('model-catalog-context-window-size'),
    ).toHaveValue('');
  } finally {
    await deleteCatalogModel(publicApi, catalogModel.id);
  }
});
