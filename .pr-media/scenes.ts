import type { Page } from '@playwright/test';
import type { PrMediaScene } from './types';
import { login } from '../src/clients/api/auth.client';

async function openSeededAcademy(page: Page) {
  await page.context().clearCookies();
  await login(page.request, 'admin@usage.local', 'admin');
  await page.goto('/academy');
  await page.getByTestId(/^academy-chapter-/).first().waitFor();
}

export default [
  {
    name: 'academy-chapter-confirmation',
    path: '/academy',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({ page }) => {
      await openSeededAcademy(page);
      return page.getByTestId(/^academy-chapter-/).first();
    },
    demos: [
      {
        name: 'open-and-check',
        action: async ({ page }) => {
          const chapterLink = page.getByTestId(/^academy-chapter-/).first();
          const chapterPath = await chapterLink.getAttribute('href');
          if (!chapterPath) throw new Error('Academy chapter link has no href');
          await page.goto(`${chapterPath}?module=0`);
          await page.getByTestId('academy-chapter-complete-action').click();
          await page.getByTestId('academy-confirmation-page').waitFor();
          await page.getByTestId('academy-confirmation-watched').click();
        },
      },
    ],
  },
] satisfies PrMediaScene[];
