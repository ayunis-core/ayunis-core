import { test, expect } from '../../src/fixtures/test';

test('closes and reopens the mobile sidebar after current-route navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/chat');

  await page.getByRole('button', { name: 'Toggle Sidebar' }).click();
  const sidebar = page.getByRole('dialog');
  await expect(sidebar).toBeVisible();

  await page.getByTestId('sidebar-navigation-new-chat').click();
  await expect(sidebar).toBeHidden();

  await page.getByRole('button', { name: 'Toggle Sidebar' }).click();
  await expect(sidebar).toBeVisible();
});
