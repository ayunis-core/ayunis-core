import { refreshWithBodyToken } from '../../src/clients/api/session-tokens.client';
import { stubOfficeHost } from '../../src/clients/office-host-stub';
import { createUser } from '../../src/factories/user.factory';
import { expect, test } from '../../src/fixtures/test';
import {
  answerDialog,
  closeDialogByUser,
  dialogMessage,
  requestedDialogUrl,
  storeRefreshToken,
  storedRefreshToken,
  submitDialogPasswordLogin,
} from '../../src/flows/outlook.flow';

// The add-in pane holds its session as tokens. Outlook isn't available here;
// a stub replaces office.js and lets the test answer for the sign-in dialog.
test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async ({ page }) => {
  await stubOfficeHost(page);
  await page.goto('/outlook/taskpane.html');
  await expect(page.getByTestId('outlook-pane-signed-out')).toBeVisible();
});

test('signs in through the dialog, stays signed in on reopen, and signs out', async ({
  page,
  browser,
  api,
  mail,
  publicApi,
}) => {
  const user = await createUser(api, mail, `outlook-pane-${Date.now()}`);

  await page.getByTestId('outlook-pane-sign-in').click();
  const dialogUrl = await requestedDialogUrl(page);
  expect(new URL(dialogUrl).pathname).toBe('/outlook/login');

  // Desktop Outlook gives the dialog its own cookie jar.
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

  await expect(page.getByTestId('outlook-pane-user-name')).toHaveText(user.name);
  await page.reload();
  await expect(page.getByTestId('outlook-pane-user-name')).toHaveText(user.name);

  const refreshToken = await storedRefreshToken(page);
  expect(refreshToken).toBeTruthy();
  await page.getByTestId('outlook-pane-sign-out').click();

  await expect(page.getByTestId('outlook-pane-signed-out')).toBeVisible();
  expect(await storedRefreshToken(page)).toBeNull();
  expect(
    (await refreshWithBodyToken(publicApi, refreshToken as string)).status(),
  ).toBe(401);
});

test('stays signed out when the dialog is closed', async ({ page }) => {
  await page.getByTestId('outlook-pane-sign-in').click();
  await requestedDialogUrl(page);
  await closeDialogByUser(page);

  await expect(page.getByTestId('outlook-pane-sign-in')).toBeEnabled();
  await expect(page.getByTestId('outlook-pane-dialog-closed')).toBeVisible();
  await expect(page.getByTestId('outlook-pane-error')).toHaveCount(0);
  expect(await storedRefreshToken(page)).toBeNull();
});

// Office reports the same close event when an identity provider cuts the
// dialog off during SSO, before the dialog has sent the session.
test('signs in when the session arrives after a close event', async ({
  page,
  browser,
  api,
  mail,
}) => {
  const user = await createUser(api, mail, `outlook-late-${Date.now()}`);
  await page.getByTestId('outlook-pane-sign-in').click();
  const dialogUrl = await requestedDialogUrl(page);
  await closeDialogByUser(page);
  await expect(page.getByTestId('outlook-pane-dialog-closed')).toBeVisible();

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

  await expect(page.getByTestId('outlook-pane-user-name')).toHaveText(user.name);
});

test('drops a stored session that can no longer be refreshed', async ({
  page,
}) => {
  await storeRefreshToken(page, 'revoked-refresh-token');
  await page.reload();

  await expect(page.getByTestId('outlook-pane-error')).toBeVisible();
  await expect(page.getByTestId('outlook-pane-signed-out')).toBeVisible();
  expect(await storedRefreshToken(page)).toBeNull();
});

test('asks for a fresh login when switching account', async ({ page }) => {
  await page.getByTestId('outlook-pane-switch-account').click();
  const dialogUrl = new URL(await requestedDialogUrl(page));

  expect(dialogUrl.pathname).toBe('/outlook/login');
  expect(dialogUrl.searchParams.get('prompt')).toBe('login');
});
