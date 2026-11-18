import { stubOfficeHost } from '../../src/clients/office-host-stub';
import { createUser } from '../../src/factories/user.factory';
import { expect, test } from '../../src/fixtures/test';
import {
  answerDialog,
  dialogMessage,
  requestedDialogUrl,
  submitDialogPasswordLogin,
} from '../../src/flows/outlook.flow';

// Browsers that block third-party storage throw on every localStorage access
// inside the Outlook pane's iframe. The pane keeps its session in memory then,
// and the chat app must still start.
test.use({ storageState: { cookies: [], origins: [] } });

test('signs in and opens the chat app when the browser blocks storage', async ({
  page,
  browser,
  api,
  mail,
}) => {
  const user = await createUser(api, mail, `outlook-nostore-${Date.now()}`);
  await stubOfficeHost(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage is blocked', 'SecurityError');
      },
    });
  });
  await page.goto('/outlook/taskpane.html');
  await page.getByTestId('outlook-pane-sign-in').click();
  const dialogUrl = await requestedDialogUrl(page);

  const dialogContext = await browser.newContext();
  try {
    await stubOfficeHost(dialogContext);
    const dialog = await dialogContext.newPage();
    await dialog.goto(dialogUrl);
    await submitDialogPasswordLogin(dialog, user.email, user.password);
    await answerDialog(page, await dialogMessage(dialog));
  } finally {
    await dialogContext.close();
  }

  await expect(page.getByTestId('outlook-pane-signed-in')).toBeVisible();
  await expect(page.getByTestId('chat-input')).toBeVisible();
});
