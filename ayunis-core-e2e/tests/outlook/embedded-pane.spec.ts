import { stubOfficeHost } from '../../src/clients/office-host-stub';
import { expect, test } from '../../src/fixtures/test';
import { sendMessage } from '../../src/flows/chat.flow';
import {
  openSignedInPane,
  storedRefreshToken,
} from '../../src/flows/outlook.flow';

// Outlook may frame only /outlook/taskpane.html (AYC-1899). The chat app in
// the pane keeps its routes in memory and leaves sign-in to the pane, so the
// frame never loads an app route such as /chats or /login.
test.use({ storageState: { cookies: [], origins: [] } });

const PANE_PATH = '/outlook/taskpane.html';

test.beforeEach(async ({ page, api }) => {
  await stubOfficeHost(page);
  await openSignedInPane(page, api);
});

test('keeps the chat app on the pane document through navigation and reload', async ({
  page,
}) => {
  await sendMessage(page, `E2E pane chat ${Date.now()}`);
  await expect(page.getByTestId('assistant-message').last()).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(PANE_PATH);

  await page.getByTestId('embedded-new-chat').click();
  await page.getByTestId('embedded-history').click();
  await expect(page.getByTestId('chat-card')).toHaveCount(1);
  expect(new URL(page.url()).pathname).toBe(PANE_PATH);

  await page.reload();
  await expect(page.getByTestId('outlook-pane-signed-in')).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(PANE_PATH);
});

test('shows the pane sign-in when the session ends inside the chat app', async ({
  page,
}) => {
  await expect(page.getByTestId('chat-input')).toBeVisible();
  await page.route('**/api/threads?**', (route) =>
    route.fulfill({ status: 401, json: { code: 'UNAUTHORIZED' } }),
  );
  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill({ status: 401, json: { code: 'UNAUTHORIZED' } }),
  );

  await page.getByTestId('embedded-history').click();

  await expect(page.getByTestId('outlook-pane-signed-out')).toBeVisible();
  await expect(page.getByTestId('outlook-pane-error')).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(PANE_PATH);
  expect(await storedRefreshToken(page)).toBeNull();
});
