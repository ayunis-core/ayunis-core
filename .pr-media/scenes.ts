import type { Page } from '@playwright/test';
import type { PrMediaScene } from './types';
import { login } from '../src/clients/api/auth.client';
import { dismissWelcomeVideo } from '../src/clients/api/onboarding.client';

async function openSeededConfirmation(page: Page): Promise<void> {
  await page.context().clearCookies();
  await login(page.request, 'admin@usage.local', 'admin');
  await dismissWelcomeVideo(page.request);
  await page.goto('/academy');
  const chapterLink = page.getByTestId(/^academy-chapter-/).first();
  await chapterLink.waitFor();
  const chapterPath = await chapterLink.getAttribute('href');
  if (!chapterPath) throw new Error('Academy chapter link has no href');
  await page.goto(`${chapterPath}/complete`);
  await page.getByTestId('academy-confirmation-page').waitFor();
}

export default [
  {
    name: 'academy-chapter-confirmation',
    path: '/academy',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({ page }) => {
      await openSeededConfirmation(page);
      return page.getByTestId('academy-confirmation-page');
    },
    demos: [
      {
        name: 'check-watched-videos',
        action: async ({ page, expect }) => {
          await page.getByTestId('academy-confirmation-watched').click();
          await expect(
            page.getByTestId('academy-confirmation-submit'),
          ).toBeEnabled();
        },
      },
    ],
  },
] satisfies PrMediaScene[];
