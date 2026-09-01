import { test, expect } from '../../src/fixtures/test';

// Every super-admin route, including the ones that used to carry no route
// guard and surfaced the backend 403 as the generic error screen.
const SUPER_ADMIN_ROUTES = [
  '/super-admin-settings',
  '/super-admin-settings/orgs',
  '/super-admin-settings/orgs/00000000-0000-0000-0000-000000000000',
  '/super-admin-settings/users',
  '/super-admin-settings/skills',
  '/super-admin-settings/super-admins',
  '/super-admin-settings/models-catalog',
  '/super-admin-settings/platform-config',
  '/super-admin-settings/academy',
  '/super-admin-settings/anonymization',
  '/super-admin-settings/app-alerts',
];

test('org admin without the super admin system role is redirected off every super admin route', async ({
  page,
}) => {
  for (const route of SUPER_ADMIN_ROUTES) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/chat/);
  }
});
