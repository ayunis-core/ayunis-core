import { test, expect } from '../../src/fixtures/test';
import { sendMessage, startThread } from '../../src/flows/chat.flow';

test.describe('chat messages', () => {
  test('sends a message and receives the routed mock reply', async ({
    page,
    org,
  }) => {
    await page.goto('/chat');
    await sendMessage(page, 'Hello from e2e');

    await expect(page.getByTestId('user-message').last()).toContainText(
      'Hello from e2e',
    );
    await expect(page.getByTestId('assistant-message').last()).toContainText(
      `${org.defaultModel.provider}::${org.defaultModel.name}`,
    );
    await expect(page).toHaveURL(/\/chats\/[0-9a-f-]+/);
  });

  test('continues a conversation in an existing thread', async ({ page }) => {
    await startThread(page, 'First message');

    await sendMessage(page, 'Second message');

    await expect(page.getByTestId('user-message')).toHaveCount(2);
    await expect(page.getByTestId('assistant-message')).toHaveCount(2);
  });
});
