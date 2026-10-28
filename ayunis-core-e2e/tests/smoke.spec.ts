import { test, expect } from '../src/fixtures/test';

// Runs authenticated as the worker org's admin (see src/fixtures/test.ts).
// Uncaught page errors fail these tests via the pageErrorGuard fixture.
// Each route asserts a stable layout element so a blank render fails.
const routes = [
  { path: '/chat', anchor: 'sidebar' },
  { path: '/admin-settings', anchor: 'settings-sidebar' },
  { path: '/settings/account', anchor: 'settings-sidebar' },
];

test.describe('authenticated smoke', () => {
  for (const { path, anchor } of routes) {
    test(`renders ${path}`, async ({ page }) => {
      await page.goto(path);

      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.getByTestId(anchor)).toBeVisible();
    });
  }
});
