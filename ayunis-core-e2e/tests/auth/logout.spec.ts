import { test, expect } from '../../src/fixtures/test';

test('revokes the session when logging out from the account menu', async ({
  page,
}) => {
  await page.goto('/chat');
  await expect(page.getByTestId('sidebar')).toBeVisible();

  await page.getByTestId('menu').click();
  await page.getByRole('menuitem', { name: 'Abmelden' }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto('/settings/account');
  await expect(page).toHaveURL(/\/login/);
});
