import { request as apiRequest } from '@playwright/test';
import type { Page } from '@playwright/test';
import { config } from '../src/config';
import { submitLoginAttempt } from '../src/clients/api/auth.client';
import { MailcatcherClient } from '../src/clients/mailcatcher.client';
import { createUser } from '../src/factories/user.factory';
import type { PrMediaScene } from './types';

const FAILED_ATTEMPTS_BEFORE_LOCK = 9;
const passwordsByPage = new WeakMap<Page, string>();

async function continueToPasswordIfNeeded(page: Page): Promise<void> {
  const continueButton = page.getByTestId('login-continue');
  if (await continueButton.isVisible()) {
    await continueButton.click();
  }
}

export default [
  {
    name: 'locked-account-message',
    path: '/login',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({ page, expect, viewport }) => {
      const mailApi = await apiRequest.newContext();
      const unauthenticatedApi = await apiRequest.newContext();
      try {
        const user = await createUser(
          page.request,
          new MailcatcherClient(mailApi, config.mailURL),
          `message-${viewport}-${Date.now()}`,
        );
        passwordsByPage.set(page, user.password);
        for (
          let attempt = 0;
          attempt < FAILED_ATTEMPTS_BEFORE_LOCK;
          attempt += 1
        ) {
          const response = await submitLoginAttempt(
            unauthenticatedApi,
            user.email,
            'wrong-password',
          );
          expect(response.status()).toBe(401);
        }

        await page.context().clearCookies();
        await page.goto('/login');
        await page.getByTestId('email').fill(user.email);
        await continueToPasswordIfNeeded(page);
        await page.getByTestId('password').fill('wrong-password');
        await page.getByTestId('submit').click();

        const notifications = page.getByRole('region', {
          name: 'Notifications alt+T',
        });
        await expect(notifications).toContainText(
          /Ihr Konto ist gesperrt|Your account is locked/,
        );
        await expect(notifications).not.toContainText('10');
        return notifications;
      } finally {
        await unauthenticatedApi.dispose();
        await mailApi.dispose();
      }
    },
    demos: [
      {
        name: 'retry-while-locked',
        action: async ({ page, expect }) => {
          const password = passwordsByPage.get(page);
          if (!password) {
            throw new Error('Missing locked-account media credentials');
          }
          const notifications = page.getByRole('region', {
            name: 'Notifications alt+T',
          });
          await notifications.getByRole('button').click();
          await expect(notifications).not.toContainText(
            /Ihr Konto ist gesperrt|Your account is locked/,
          );
          await page.getByTestId('password').fill(password);
          await page.getByTestId('submit').click();
          await expect(notifications).toContainText(
            /Ihr Konto ist gesperrt|Your account is locked/,
          );
          await expect(notifications).not.toContainText('10');
        },
      },
    ],
  },
] satisfies PrMediaScene[];
