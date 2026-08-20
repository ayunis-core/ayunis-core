import type { Page } from '@playwright/test';

export async function signIn(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.getByTestId('email').fill(email);
  const continueButton = page.getByTestId('login-continue');
  if (await continueButton.isVisible()) await continueButton.click();
  await page.getByTestId('password').fill(password);
  await page.getByTestId('submit').click();
}
