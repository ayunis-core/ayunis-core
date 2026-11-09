import type { Page } from '@playwright/test';
import { expect } from '../fixtures/test';
import type {
  DialogTokens,
  OfficeStubWindow,
} from '../clients/office-host-stub';

const REFRESH_TOKEN_KEY = 'ayunis.outlook.refreshToken';

export const OUTLOOK_DIALOG_PATH = '/outlook/login?client=outlook';

export async function submitDialogPasswordLogin(
  dialog: Page,
  email: string,
  password: string,
): Promise<void> {
  await dialog.getByTestId('email').fill(email);
  await dialog.getByTestId('login-continue').click();
  await dialog.getByTestId('password').fill(password);
  await dialog.getByTestId('submit').click();
}

/** Waits for the dialog's handoff page and returns what it sent the pane. */
export async function dialogMessage(dialog: Page): Promise<string> {
  await dialog.waitForURL(/\/outlook\/dialog\.html/);
  await expect
    .poll(() =>
      dialog.evaluate(
        () => (window as unknown as OfficeStubWindow).__officeStub.messages.length,
      ),
    )
    .toBe(1);
  return dialog.evaluate(
    () => (window as unknown as OfficeStubWindow).__officeStub.messages[0],
  );
}

export async function dialogTokens(dialog: Page): Promise<DialogTokens> {
  const message = JSON.parse(await dialogMessage(dialog)) as DialogTokens;
  expect(message.type).toBe('session');
  return message;
}

/** URL the pane asked Office to open as its sign-in dialog. */
export async function requestedDialogUrl(pane: Page): Promise<string> {
  const url = () =>
    pane.evaluate(
      () => (window as unknown as OfficeStubWindow).__officeStub.dialog?.url,
    );
  await expect.poll(url).toBeTruthy();
  return (await url()) as string;
}

export async function answerDialog(pane: Page, message: string): Promise<void> {
  await pane.evaluate((value) => {
    (window as unknown as OfficeStubWindow).__officeStub.dialog?.send(value);
  }, message);
}

export async function closeDialogByUser(pane: Page): Promise<void> {
  await pane.evaluate(() => {
    (window as unknown as OfficeStubWindow).__officeStub.dialog?.closeByUser();
  });
}

export function storedRefreshToken(pane: Page): Promise<string | null> {
  return pane.evaluate(
    (key) => window.localStorage.getItem(key),
    REFRESH_TOKEN_KEY,
  );
}

export async function storeRefreshToken(
  pane: Page,
  refreshToken: string,
): Promise<void> {
  await pane.evaluate(
    ([key, value]) => window.localStorage.setItem(key, value),
    [REFRESH_TOKEN_KEY, refreshToken] as const,
  );
}
