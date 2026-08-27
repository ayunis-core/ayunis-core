import type { PrMediaScene } from './types';

export default [
  {
    name: 'academy-chapter-confirmation',
    path: '/academy',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({ page }) =>
      page.getByTestId(/^academy-chapter-/).first().waitFor(),
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
