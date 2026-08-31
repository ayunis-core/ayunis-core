import type { PrMediaScene } from './types';

type Organization = {
  id: string;
  createdAt: string;
};

export default [
  {
    name: 'require-sso-control',
    path: '/login',
    waitFor: async ({ page, expect }) => {
      const loginResponse = await page.request.post('/api/auth/login', {
        data: { email: 'admin@demo.local', password: 'admin' },
      });
      expect(loginResponse.ok()).toBeTruthy();

      const organizationsResponse = await page.request.get(
        '/api/super-admin/orgs',
        { params: { search: 'SSO E2E', limit: '50' } },
      );
      expect(organizationsResponse.ok()).toBeTruthy();
      const body = (await organizationsResponse.json()) as {
        data: Organization[];
      };
      const organization = body.data.toSorted((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      )[0];
      if (!organization) {
        throw new Error('No SSO E2E organization found');
      }

      await page.goto(
        `/super-admin-settings/orgs/${organization.id}?tab=sso`,
      );
      return page.getByTestId('sso-required');
    },
    demos: [
      {
        name: 'confirmation',
        action: async ({ page, expect }) => {
          await page.getByTestId('sso-required').click();
          await expect(page.getByTestId('sso-required-reviewed')).toBeVisible();
          await page.getByTestId('sso-required-reviewed').click();
          await expect(page.getByTestId('sso-required-confirm')).toBeEnabled();
        },
      },
    ],
  },
] satisfies PrMediaScene[];
