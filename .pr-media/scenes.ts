import type { Page } from '@playwright/test';
import { config } from '../src/config';
import type { PrMediaScene } from './types';

const KEYS = [
  {
    name: 'Bürgerportal Connector',
    description: 'OptiGov connector for the citizen portal, server portal-01',
  },
  {
    name: 'Ratsinformationssystem',
    description: `https://ris.example-kommune.de/api/v2/connectors/${'x'.repeat(160)}`,
  },
  { name: 'Intranet-Suche' },
];

// The worker org is shared across capture tests, so only create what is missing.
async function ensureKeys(page: Page): Promise<void> {
  const res = await page.request.get(`${config.apiURL}/api/api-keys`);
  const existing = new Set(
    ((await res.json()) as { name: string }[]).map((k) => k.name),
  );
  for (const key of KEYS) {
    if (existing.has(key.name)) continue;
    await page.request.post(`${config.apiURL}/api/api-keys`, { data: key });
  }
  await page.reload();
}

export default [
  {
    name: 'api-keys-with-descriptions',
    path: '/admin-settings/api-keys',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({ page }) => {
      await ensureKeys(page);
      return page.getByTestId('api-key-description').first();
    },
  },
  {
    name: 'api-key-edit',
    path: '/admin-settings/api-keys',
    viewports: ['desktop'],
    waitFor: async ({ page }) => {
      await ensureKeys(page);
      return page.getByTestId('api-key-description').first();
    },
    demos: [
      {
        name: 'rename-and-describe',
        action: async ({ page, expect }) => {
          const item = page
            .locator('[data-testid^="api-key-item-"]')
            .filter({ has: page.getByText('Intranet-Suche', { exact: true }) });
          await item.getByTestId('api-key-actions-menu').click();
          await page.getByTestId('api-key-edit').click();
          await expect(page.getByTestId('api-key-edit-dialog')).toBeVisible();
          await page.getByTestId('api-key-edit-name').fill('Intranet-Suche (Rathaus)');
          await page
            .getByTestId('api-key-edit-description')
            .pressSequentially('Search index sync, server intranet-02', {
              delay: 25,
            });
          await page.getByTestId('api-key-edit-save').click();
          await expect(page.getByTestId('api-key-edit-dialog')).toHaveCount(0);
          await expect(
            page
              .locator('[data-testid^="api-key-item-"]')
              .filter({ hasText: 'Intranet-Suche (Rathaus)' })
              .getByTestId('api-key-description'),
          ).toBeVisible();
        },
      },
    ],
  },
] satisfies PrMediaScene[];
