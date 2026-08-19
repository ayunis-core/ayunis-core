import type { PrMediaScene } from './types';

export default [
  {
    name: 'admin-roles-permission-tooltips',
    path: '/admin-settings/roles',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({ page }) => page.getByTestId('settings-sidebar'),
    demos: [
      {
        name: 'role-column-hint',
        action: async ({ page, expect }) => {
          await page.getByTestId('role-hint-manager').hover();
          await expect(page.getByRole('tooltip').first()).toBeVisible();
        },
      },
      {
        name: 'permission-row-hint',
        action: async ({ page, expect }) => {
          await page.getByTestId('permission-hint-assign_users_to_teams').hover();
          await expect(page.getByRole('tooltip').first()).toBeVisible();
        },
      },
    ],
  },
] satisfies PrMediaScene[];
