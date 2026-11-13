import { request } from '@playwright/test';
import type { PrMediaScene } from './types';
import { generatedApi } from '../src/clients/api/generated-api';
import { config } from '../src/config';
import { createOcrRejectedPdf } from '../src/factories/pdf.factory';

export default [{
  name: 'chat-attachment-progress',
  path: '/chat',
  viewports: ['desktop', 'mobile'],
  waitFor: async ({ page, expect }) => {
    const api = await request.newContext({ baseURL: config.apiURL, storageState: await page.context().storageState() });
    try {
      const models = await generatedApi.modelsControllerGetAvailableEmbeddingModels({ api });
      if (!models[0]) throw new Error('No embedding model available');
      if (!models[0].permittedModelId) await generatedApi.modelsControllerCreatePermittedModel({ modelId: models[0].modelId }, { api });
    } finally { await api.dispose(); }
    await page.reload();
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    page.once('close', release);
    await page.route(url => url.searchParams.has('X-Amz-Signature'), async route => {
      if (route.request().method() === 'PUT') await held;
      if (!page.isClosed()) await route.continue().catch(() => undefined);
    });
    const transfer = page.waitForRequest(req => req.method() === 'PUT' && req.url().includes('X-Amz-Signature'));
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    await page.getByRole('menuitem').first().click();
    await (await chooser).setFiles([{ name: 'Haushaltsplanung-2026.pdf', mimeType: 'application/pdf', buffer: createOcrRejectedPdf('Budget 2026') }]);
    await transfer;
    await page.getByTestId('input').fill('Bitte fasse die wichtigsten Punkte des Haushaltsplans zusammen.');
    await page.getByTestId('send').click();
    await expect(page.getByTestId('pending-user-message')).toBeVisible();
    await expect(page.getByTestId('attachment-progress')).toHaveAttribute('data-stage', 'uploading');
  },
}] satisfies PrMediaScene[];
