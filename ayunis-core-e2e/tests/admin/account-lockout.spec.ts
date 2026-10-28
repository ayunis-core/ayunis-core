import { createUser } from '../../src/factories/user.factory';
import { submitLoginAttempt } from '../../src/clients/api/auth.client';
import { lockUserAccount } from '../../src/flows/account-lockout.flow';
import {
  requestAdminUnlockUserAccount,
  requestUsersByEmail,
} from '../../src/clients/api/users.client';
import { test, expect } from '../../src/fixtures/test';

test.setTimeout(90_000);

test('organization admin sees and unlocks a locked account', async ({
  api,
  browser,
  mail,
  page,
}) => {
  const user = await createUser(api, mail, `admin-${Date.now()}`);
  const targetContext = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  try {
    const malformedUnlock = await requestAdminUnlockUserAccount(
      api,
      'not-a-uuid',
    );
    expect(malformedUnlock.status()).toBe(400);

    await lockUserAccount(targetContext.request, user.email);
    const lockedLogin = await submitLoginAttempt(
      targetContext.request,
      user.email,
      user.password,
    );
    expect(lockedLogin.status()).toBe(401);

    await page.goto(`/admin-settings/users?search=${user.email}`);
    const row = page.getByTestId(`admin-user-row-${user.id}`);
    await expect(row.getByTestId('user-lock-status')).toHaveAttribute(
      'data-state',
      'locked',
    );
    await row.getByTestId('admin-user-actions').click();
    await page.getByTestId('user-unlock-account').click();
    await page.getByTestId('confirmation-confirm').click();
    await expect(row.getByTestId('user-lock-status')).toHaveAttribute(
      'data-state',
      'active',
    );

    const unlockedLogin = await submitLoginAttempt(
      targetContext.request,
      user.email,
      user.password,
    );
    expect(unlockedLogin.ok()).toBe(true);
    const regularUserView = await requestUsersByEmail(
      targetContext.request,
      user.email,
    );
    expect(regularUserView.status()).toBe(403);
    const targetPage = await targetContext.newPage();
    await targetPage.goto('/chat');
    await expect(targetPage).not.toHaveURL(/\/login/);
  } finally {
    await targetContext.close();
  }
});
