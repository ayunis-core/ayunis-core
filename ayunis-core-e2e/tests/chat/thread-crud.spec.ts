import { test, expect } from '../../src/fixtures/test';
import { startThread, sidebarThreadItem } from '../../src/flows/chat.flow';

test.describe('chat thread CRUD', () => {
  test('renames a thread from the sidebar', async ({ page }) => {
    const threadId = await startThread(page, 'Rename me');
    const item = sidebarThreadItem(page, threadId);

    await item.hover();
    await item.getByTestId('dropdown-menu-trigger').click();
    await page.getByTestId('rename').click();
    await page.getByTestId('rename-input').fill('Renamed by e2e');
    await page.getByTestId('rename-submit').click();

    await expect(item).toContainText('Renamed by e2e');
  });

  test('deletes a thread from the sidebar', async ({ page }) => {
    const threadId = await startThread(page, 'Delete me');
    await page.goto('/chat');
    const item = sidebarThreadItem(page, threadId);

    await item.hover();
    await item.getByTestId('dropdown-menu-trigger').click();
    await page.getByTestId('delete').click();
    await page.getByTestId('confirmation-confirm').click();

    await expect(item).toHaveCount(0);
  });

  test.fixme(
    'deletes the currently viewed thread and removes it from the sidebar',
    async ({ page }) => {
      const threadId = await startThread(page, 'Delete me while viewing');
      const item = sidebarThreadItem(page, threadId);

      await item.hover();
      await item.getByTestId('dropdown-menu-trigger').click();
      await page.getByTestId('delete').click();
      await page.getByTestId('confirmation-confirm').click();

      await expect(page).toHaveURL(/\/chat$/);
      await expect(item).toHaveCount(0);
    },
  );
});
