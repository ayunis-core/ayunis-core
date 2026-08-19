import type { Page } from '@playwright/test';
import { test, expect } from '../../src/fixtures/test';

async function acceptLegalTermsIfPresent(page: Page) {
  const legalAcceptance = page.getByTestId('register-legal-acceptance');
  if (await legalAcceptance.isVisible()) {
    await legalAcceptance.click();
  }
}

// Full self-service registration journey through the UI: register form →
// "check your inbox" page → confirmation link from Mailcatcher → login.
test.use({ storageState: { cookies: [], origins: [] } });

test('registers a new org through the UI and confirms the email', async ({
  page,
  mail,
}) => {
  const unique = `reg-${Date.now()}`;
  const email = `e2e-${unique}@e2e.local`;
  const password = 'E2e-Password-1';

  await page.goto('/register');
  await page.getByTestId('register-email').fill(email);
  await page.getByTestId('register-user-name').fill('E2E Reg User');
  await page.getByTestId('register-org-name').fill(`E2E Reg Org ${unique}`);
  await page.getByTestId('register-password').fill(password);
  await acceptLegalTermsIfPresent(page);
  await page.getByTestId('register-submit').click();

  await expect(page).toHaveURL(/\/email-confirm/);

  const token = await mail.extractLinkToken(email, '/confirm-email');
  await page.goto(`/confirm-email?token=${token}`);
  await expect(page).toHaveURL(/\/login\?.*emailVerified=true/);

  await page.getByTestId('email').fill(email);
  await page.getByTestId('password').fill(password);
  await page.getByTestId('submit').click();
  await expect(page).not.toHaveURL(/\/login/);
});
