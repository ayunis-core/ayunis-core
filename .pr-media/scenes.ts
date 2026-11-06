import type { PrMediaScene } from './types';

export default [
  {
    name: 'org-default-unavailable-modes',
    path: '/admin-settings/models?tab=organization',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({ page, expect }) => {
      await page.route('**/api/models/available/language*', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '[]',
        }),
      );
      await page.route('**/api/models/mode-defaults/org*', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            mode: null,
            currentPermittedModelId: null,
            availableModes: [],
          }),
        }),
      );

      await page.reload();

      const trigger = page.getByRole('combobox');
      await expect(trigger).toBeEnabled();
      await trigger.click();

      const maxMode = page.getByRole('option', { name: /Max/ });
      await expect(maxMode).toHaveAttribute('aria-disabled', 'true');
      await maxMode.focus();
      await expect(maxMode).toBeFocused();

      return maxMode;
    },
  },
] satisfies PrMediaScene[];
