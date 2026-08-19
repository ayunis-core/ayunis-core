import type { PrMediaScene } from './types';

export default [
  {
    name: 'admin-roles-permission-tooltips',
    path: '/admin-settings/roles',
    viewports: ['desktop', 'mobile'],
    // The permission table's own hint trigger: present at both widths (the
    // settings sidebar is not rendered at 375px) and only after the roles
    // request resolves, so no screenshot catches the loading spinner.
    waitFor: async ({ page }) => page.getByTestId('permission-hint-manage_teams'),
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
