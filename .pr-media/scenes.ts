import type { PrMediaScene } from './types';

export default [
  {
    name: 'create-file-download',
    path: '/chat',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({ page, expect }) => {
      await page.getByTestId('input').fill('E2E create file xml');
      await page.getByTestId('send').click();
      await expect(page.getByTestId('create-file-download')).toBeEnabled();
      await expect(page.getByTestId('assistant-message').last()).toContainText('file-created::continued');
    },
  },
] satisfies PrMediaScene[];
