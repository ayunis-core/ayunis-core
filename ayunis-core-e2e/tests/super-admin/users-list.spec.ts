import type { Page, Response } from '@playwright/test';
import { test, expect } from '../../src/fixtures/test';

test.use({ storageState: { cookies: [], origins: [] } });

async function dismissWelcomeVideoIfNeeded(
  page: Page,
  response: Response,
): Promise<void> {
  const onboarding = (await response.json()) as {
    welcomeVideoSeenAt: string | null;
  };
  if (onboarding.welcomeVideoSeenAt === null) {
    await page.getByRole('button', { name: /Close|Schließen/ }).click();
  }
}

test('super admin searches users and opens their organization', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByTestId('email').fill('admin@demo.local');
  await page.getByTestId('password').fill('admin');
  await page.getByTestId('submit').click();
  await expect(page).not.toHaveURL(/\/login/);

  const onboardingResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === '/api/onboarding',
  );
  await page.goto('/super-admin-settings/users');
  await dismissWelcomeVideoIfNeeded(page, await onboardingResponse);
  await expect(page.getByTestId('super-admin-users-table')).toBeVisible();

  await page.goto('/super-admin-settings/users?page=999');
  await expect(page).not.toHaveURL(/page=999/);
  await expect(page.getByTestId('super-admin-user-row').first()).toBeVisible();

  await page.getByTestId('super-admin-users-search').fill('anna@usage.local');
  const userRow = page.getByTestId('super-admin-user-row').filter({
    has: page.getByRole('cell', { name: 'anna@usage.local' }),
  });
  await expect(userRow).toBeVisible();
  await expect(page.getByRole('cell', { name: 'ben@usage.local' })).toHaveCount(
    0,
  );

  await userRow.getByTestId('super-admin-user-actions').click();
  await expect(page.getByTestId('super-admin-user-reset-password')).toBeVisible();
  await expect(page.getByTestId('super-admin-user-delete')).toBeVisible();
  await page.getByTestId('super-admin-user-open-organization').click();

  await expect(page).toHaveURL(/\/super-admin-settings\/orgs\/[0-9a-f-]+$/);
});
