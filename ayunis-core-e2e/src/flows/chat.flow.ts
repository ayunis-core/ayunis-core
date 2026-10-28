import { fileURLToPath } from 'node:url';
import type { APIRequestContext, Page } from '@playwright/test';
import { expect } from '../fixtures/test';
import { generatedApi } from '../clients/api/generated-api';
import { getConfiguredImageCandidates } from '../clients/api/models.client';

const MOBILE_PHOTO = fileURLToPath(
  new URL(
    '../../../ayunis-core-backend/src/domain/models/infrastructure/image-generation/fixtures/mobile-hdr.jpg',
    import.meta.url,
  ),
);

export async function sendMessage(page: Page, text: string): Promise<void> {
  await page.getByTestId('input').fill(text);
  await page.getByTestId('send').click();
}

export async function startThread(page: Page, text: string): Promise<string> {
  await page.goto('/chat');
  await sendMessage(page, text);
  await expect(page.getByTestId('assistant-message').last()).toBeVisible();
  await expect(page).toHaveURL(/\/chats\/[0-9a-f-]+/);
  const threadId = /\/chats\/([0-9a-f-]+)/.exec(page.url())?.[1];
  if (!threadId) throw new Error(`No thread id in URL ${page.url()}`);
  return threadId;
}

export function sidebarThreadItem(page: Page, threadId: string) {
  return page
    .getByTestId('chat')
    .filter({ has: page.locator(`a[href="/chats/${threadId}"]`) });
}

export async function editUploadedPhoto(
  page: Page,
  api: APIRequestContext,
): Promise<void> {
  const model = (await getConfiguredImageCandidates(api))[0];
  expect(model).toBeDefined();
  await generatedApi.modelsControllerCreatePermittedModel(
    { modelId: model.modelId },
    { api },
  );
  await page.goto('/chat');
  await page.getByRole('button', { name: /^(Add|Hinzufügen)$/ }).click();
  const chooserEvent = page.waitForEvent('filechooser');
  await page
    .getByRole('menuitem', {
      name: /Upload File or Image|Datei oder Bild hochladen/,
    })
    .click();
  const chooser = await chooserEvent;
  await chooser.setFiles(MOBILE_PHOTO);
  await sendMessage(page, 'E2E edit uploaded image');
}

export function generatedImage(page: Page) {
  return page.getByRole('img', {
    name: 'Coloring page from mobile photo',
    exact: true,
  });
}
