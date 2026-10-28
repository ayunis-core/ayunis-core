import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Logs in as the seeded super admin and opens `targetPath`. The welcome video
 * dialog only appears on the account's first visit, so it is dismissed when
 * the onboarding response says it has not been seen yet.
 */
export async function loginAsSeededSuperAdmin(
  page: Page,
  targetPath: string,
): Promise<void> {
  await page.goto('/login');
  await page.getByTestId('email').fill('admin@demo.local');
  await page.getByTestId('login-continue').click();
  await page.getByTestId('password').fill('admin');
  await page.getByTestId('submit').click();
  await expect(page).not.toHaveURL(/\/login/);

  const onboardingResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === '/api/onboarding',
  );
  await page.goto(targetPath);

  const onboarding = (await (await onboardingResponse).json()) as {
    welcomeVideoSeenAt: string | null;
  };
  if (onboarding.welcomeVideoSeenAt === null) {
    await page.getByRole('button', { name: /Close|Schließen/ }).click();
  }
}
