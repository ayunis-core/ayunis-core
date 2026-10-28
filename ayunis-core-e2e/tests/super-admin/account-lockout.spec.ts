import { dismissWelcomeVideoFromBrowserContext } from '../../src/clients/api/onboarding.client';
import { submitLoginAttempt } from '../../src/clients/api/auth.client';
import { requestSuperAdminUnlockUserAccount } from '../../src/clients/api/users.client';
import { createUser } from '../../src/factories/user.factory';
import { lockUserAccount } from '../../src/flows/account-lockout.flow';
import { test, expect } from '../../src/fixtures/test';

test.setTimeout(90_000);

test('super admin sees and unlocks a locked account', async ({
  api,
  browser,
  mail,
}) => {
  const user = await createUser(api, mail, `super-${Date.now()}`);
  const targetContext = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const superAdminContext = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const superAdminPage = await superAdminContext.newPage();

  try {
    await lockUserAccount(targetContext.request, user.email);
    const lockedLogin = await submitLoginAttempt(
      targetContext.request,
      user.email,
      user.password,
    );
    expect(lockedLogin.status()).toBe(401);

    const superAdminLogin = await submitLoginAttempt(
      superAdminContext.request,
      'admin@demo.local',
      'admin',
    );
    expect(superAdminLogin.ok()).toBe(true);
    const malformedUnlock = await requestSuperAdminUnlockUserAccount(
      superAdminContext.request,
      'not-a-uuid',
    );
    expect(malformedUnlock.status()).toBe(400);
    await dismissWelcomeVideoFromBrowserContext(superAdminPage.request);

    await superAdminPage.goto(
      `/super-admin-settings/users?search=${user.email}`,
    );
    const row = superAdminPage.getByTestId('super-admin-user-row').filter({
      has: superAdminPage.getByTestId(`super-admin-user-id-${user.id}`),
    });
    await expect(row.getByTestId('user-lock-status')).toHaveAttribute(
      'data-state',
      'locked',
    );
    await row.getByTestId('super-admin-user-actions').click();
    await superAdminPage.getByTestId('user-unlock-account').click();
    await superAdminPage.getByTestId('confirmation-confirm').click();
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
    const targetPage = await targetContext.newPage();
    await targetPage.goto('/chat');
    await expect(targetPage).not.toHaveURL(/\/login/);
  } finally {
    await Promise.all([targetContext.close(), superAdminContext.close()]);
  }
});
