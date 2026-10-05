import { test, expect } from '../../src/fixtures/test';
import { sendMessage, startThread } from '../../src/flows/chat.flow';
import { loginThroughUi } from '../../src/flows/auth.flow';

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

  test('renews an expired access session without a page refresh', async ({
    page,
    org,
  }) => {
    // Renewing rotates the refresh token. The worker's storageState is loaded
    // by every other test and the api fixture, so rotating its token here
    // would leave those copies pointing at a used token; sign in for a token
    // family this test owns instead.
    await page.context().clearCookies();
    await loginThroughUi(page, org.admin.email, org.admin.password);
    await page.goto('/chat');
    await expect(page.getByTestId('input')).toBeVisible();
    await page.context().clearCookies({ name: 'access_token' });

    await sendMessage(page, 'Message after access expiry');

    await expect(page.getByTestId('assistant-message').last()).toContainText(
      `${org.defaultModel.provider}::${org.defaultModel.name}`,
    );
    const cookies = await page.context().cookies();
    expect(cookies.some(({ name }) => name === 'access_token')).toBe(true);
  });

  test('returns an expired session to login instead of leaving chat loading', async ({
    page,
  }) => {
    await startThread(page, 'Message before session expiry');
    await page.context().clearCookies();

    await sendMessage(page, 'Message after session expiry');

    await expect(page).toHaveURL(/\/login\?redirect=%2Fchats%2F[0-9a-f-]+/);
  });
});
