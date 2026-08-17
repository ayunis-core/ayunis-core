import path from 'node:path';
import { test, expect } from '../../src/fixtures/test';
import { createOrg } from '../../src/factories/org.factory';

// Password reset journey. Uses a dedicated org (not the worker org) because
// resetting the shared admin's password would break the worker's sessions.
test.use({ storageState: { cookies: [], origins: [] } });

test('resets a forgotten password and signs in with the new one', async ({
  page,
  mail,
}, testInfo) => {
  const org = await createOrg(
    `pwreset-${testInfo.workerIndex}-${Date.now()}`,
    path.join(testInfo.outputDir, 'pwreset-auth.json'),
  );
  const newPassword = 'E2e-NewPassword-2';

  await page.goto('/password/forgot');
  await page.getByTestId('forgot-email').fill(org.admin.email);
  await page.getByTestId('forgot-submit').click();
  await expect(page).toHaveURL(/\/login/);

  const token = await mail.extractLinkToken(org.admin.email, '/password/reset');
  await page.goto(`/password/reset?token=${token}`);
  await page.getByTestId('reset-new-password').fill(newPassword);
  await page.getByTestId('reset-confirm-password').fill(newPassword);
  await page.getByTestId('reset-submit').click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByTestId('email').fill(org.admin.email);
  await page.getByTestId('password').fill(newPassword);
  await page.getByTestId('submit').click();
  await expect(page).not.toHaveURL(/\/login/);
});
