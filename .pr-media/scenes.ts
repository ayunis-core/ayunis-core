import type { PrMediaScene } from './types';

const cardSelector = '[data-testid^="knowledge-base-card-"]';
const toggleSelector = '[data-testid^="knowledge-base-active-toggle-"]';

export default [
  {
    name: 'knowledge-base-activation',
    path: '/knowledge-bases',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({ page, expect }) => {
      let card = page.locator(cardSelector).first();

      if ((await card.count()) === 0) {
        await page.getByRole('main').getByRole('button').last().click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        const fields = dialog.getByRole('textbox');
        await fields.nth(0).fill('Municipal regulations');
        await fields
          .nth(1)
          .fill('Policies and guidance available to new chats');
        await dialog.locator('button[type="submit"]').click();
        await expect(dialog).not.toBeVisible();
        card = page.locator(cardSelector).first();
      }

      await expect(card).toBeVisible();
      const toggle = page.locator(toggleSelector).first();
      if ((await toggle.getAttribute('aria-checked')) !== 'true') {
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-checked', 'true');
      }

      return toggle;
    },
    demos: [
      {
        name: 'toggle-chat-availability',
        action: async ({ page, expect }) => {
          const toggle = page.locator(toggleSelector).first();
          await toggle.click();
          await expect(toggle).toHaveAttribute('aria-checked', 'false');
        },
      },
    ],
  },
] satisfies PrMediaScene[];
