import { createUser } from '../../src/factories/user.factory';
import { submitLoginAttempt } from '../../src/clients/api/auth.client';
import { test, expect } from '../../src/fixtures/test';
import type { Page } from '@playwright/test';

const FAILED_ATTEMPTS_BEFORE_LOCK = 9;

async function continueToPasswordIfNeeded(page: Page): Promise<void> {
  const continueButton = page.getByTestId('login-continue');
  if (await continueButton.isVisible()) {
    await continueButton.click();
  }
}

test('locked user is told to contact their administrator', async ({
  api,
  browser,
  mail,
}) => {
  test.setTimeout(90_000);
  const user = await createUser(api, mail, `locked-message-${Date.now()}`);
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();

  try {
    for (let attempt = 0; attempt < FAILED_ATTEMPTS_BEFORE_LOCK; attempt += 1) {
      const response = await submitLoginAttempt(
        context.request,
        user.email,
        'wrong-password',
      );
      expect(response.status()).toBe(401);
    }

    await page.goto('/login');
    await page.getByTestId('email').fill(user.email);
    await continueToPasswordIfNeeded(page);
    await page.getByTestId('password').fill('wrong-password');

    let loginRequestCount = 0;
    page.on('request', (request) => {
      if (
        request.method() === 'POST' &&
        new URL(request.url()).pathname === '/api/auth/login'
      ) {
        loginRequestCount += 1;
      }
    });
    await page.getByTestId('submit').click();

    const notifications = page.getByRole('region', {
      name: 'Notifications alt+T',
    });
    await expect(notifications).toContainText(
      'Ihr Konto ist gesperrt. Bitte wenden Sie sich an Ihre Administration.',
    );
    expect(loginRequestCount).toBe(1);
    await expect(notifications).not.toContainText('10');
    await notifications.getByRole('button').click();
    await expect(notifications).not.toContainText('Ihr Konto ist gesperrt.');

    await page.getByTestId('password').fill(user.password);
    await page.getByTestId('submit').click();

    await expect(notifications).toContainText(
      'Ihr Konto ist gesperrt. Bitte wenden Sie sich an Ihre Administration.',
    );
    await expect(notifications).not.toContainText('10');
  } finally {
    await context.close();
  }
});
