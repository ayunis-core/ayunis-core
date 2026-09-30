import type { Page } from '@playwright/test';
import { expect } from '../fixtures/test';

// The password step is only reachable through the continue button when the
// login form runs in its email-first variant.
export async function loginThroughUi(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login');
  await page.getByTestId('email').fill(email);
  const continueButton = page.getByTestId('login-continue');
  if (await continueButton.isVisible()) await continueButton.click();
  await page.getByTestId('password').fill(password);
  await page.getByTestId('submit').click();
  await expect(page).not.toHaveURL(/\/login/);
}
