import { test, expect } from '../../src/fixtures/test';

// These tests exercise the login flow itself, so they start from a clean,
// unauthenticated context instead of the worker org's storageState. The
// worker org still supplies real credentials to log in with.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('authentication', () => {
  test('logs in with valid credentials', async ({ page, org }) => {
    await page.goto('/login');

    await page.getByTestId('email').fill(org.admin.email);
    await page.getByTestId('password').fill(org.admin.password);
    await page.getByTestId('submit').click();

    await expect(page).not.toHaveURL(/\/login/);
  });

  test('rejects invalid credentials and stays on login', async ({
    page,
    org,
  }) => {
    await page.goto('/login');

    await page.getByTestId('email').fill(org.admin.email);
    await page.getByTestId('password').fill('wrong-password');
    await page.getByTestId('submit').click();

    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects unauthenticated users away from a protected route', async ({
    page,
  }) => {
    await page.goto('/chat');

    await expect(page).toHaveURL(/\/login/);
  });
});
