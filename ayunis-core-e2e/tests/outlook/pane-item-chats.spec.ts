import type { Page } from '@playwright/test';
import {
  stubOfficeHost,
  type OfficeStubReadItem,
} from '../../src/clients/office-host-stub';
import { generatedApi } from '../../src/clients/api/generated-api';
import { expect, test } from '../../src/fixtures/test';
import { sendMessage } from '../../src/flows/chat.flow';
import {
  openSignedInPane,
  selectOutlookItem,
} from '../../src/flows/outlook.flow';

// A pinned pane follows the mail selected in Outlook: each mail gets its own
// chat on the device, and returning to a mail reopens its chat (AYC-1897).
test.use({ storageState: { cookies: [], origins: [] } });

function mail(key: string, name: string): OfficeStubReadItem {
  return {
    itemId: `e2e-${name}-${key}`,
    subject: `E2E mail ${name} ${key}`,
    body: `Body of mail ${name}`,
    from: { displayName: 'Alice', emailAddress: 'alice@e2e.local' },
  };
}

async function chatAbout(pane: Page, text: string): Promise<void> {
  await sendMessage(pane, text);
  await expect(pane.getByTestId('assistant-message').last()).toBeVisible();
}

/** The chat the pane remembers for a mail, read from its device storage. */
async function rememberedChat(pane: Page, item: OfficeStubReadItem) {
  return pane.evaluate((itemKey) => {
    const key = Object.keys(window.localStorage).find((name) =>
      name.startsWith('ayunis.outlook.itemChats.'),
    );
    const chats = JSON.parse(
      (key && window.localStorage.getItem(key)) ?? '{}',
    ) as Record<string, string>;
    return chats[itemKey];
  }, `read:${item.itemId}`);
}

function userMessages(pane: Page) {
  return pane.getByTestId('user-message');
}

test('reopens each mail’s chat in a pinned pane and starts a new one for a new mail', async ({
  page,
  api,
}) => {
  const key = `${Date.now()}`;
  const a = mail(key, 'A');
  const b = mail(key, 'B');
  await stubOfficeHost(page, { readItem: a });
  await openSignedInPane(page, api);
  await chatAbout(page, `E2E chat about A ${key}`);

  await selectOutlookItem(page, b);
  await expect(page.getByTestId('embedded-history')).toBeVisible();
  await expect(userMessages(page)).toHaveCount(0);
  await chatAbout(page, `E2E chat about B ${key}`);

  await selectOutlookItem(page, a);
  await expect(userMessages(page)).toHaveText([`E2E chat about A ${key}`]);

  await selectOutlookItem(page, b);
  await expect(userMessages(page)).toHaveText([`E2E chat about B ${key}`]);

  // Nothing selected keeps the open chat.
  await selectOutlookItem(page, null);
  await expect(userMessages(page)).toHaveText([`E2E chat about B ${key}`]);
});

test('reopens the mail’s chat when the pane opens again on it', async ({
  page,
  api,
}) => {
  const key = `${Date.now()}`;
  await stubOfficeHost(page, { readItem: mail(key, 'A') });
  await openSignedInPane(page, api);
  await chatAbout(page, `E2E chat before reopening ${key}`);

  await page.reload();

  await expect(userMessages(page)).toHaveText([
    `E2E chat before reopening ${key}`,
  ]);
});

test('opens a new chat for a mail whose chat was deleted meanwhile', async ({
  page,
  api,
}) => {
  const key = `${Date.now()}`;
  const a = mail(key, 'A');
  await stubOfficeHost(page, { readItem: a });
  await openSignedInPane(page, api);
  await chatAbout(page, `E2E chat to delete ${key}`);
  await expect.poll(() => rememberedChat(page, a)).toBeTruthy();
  const threadId = (await rememberedChat(page, a)) as string;

  await selectOutlookItem(page, mail(key, 'B'));
  await expect(userMessages(page)).toHaveCount(0);
  await generatedApi.threadsControllerDelete(threadId, { api });
  await selectOutlookItem(page, a);

  await expect(page.getByTestId('embedded-history')).toBeVisible();
  await expect(userMessages(page)).toHaveCount(0);
});

// Creating a chat takes a moment: switching mail right after sending must
// neither give the chat to the new mail nor jump the pane to it.
test('keeps a chat with the mail it was started on when the user switches straight away', async ({
  page,
  api,
}) => {
  const key = `${Date.now()}`;
  const a = mail(key, 'A');
  const b = mail(key, 'B');
  await stubOfficeHost(page, { readItem: a });
  await openSignedInPane(page, api);

  await sendMessage(page, `E2E started on A ${key}`);
  await selectOutlookItem(page, b);

  await expect.poll(() => rememberedChat(page, a)).toBeTruthy();
  await expect(page.getByTestId('embedded-history')).toBeVisible();
  await expect(userMessages(page)).toHaveCount(0);
  expect(await rememberedChat(page, b)).toBeUndefined();

  await selectOutlookItem(page, a);
  await expect(userMessages(page)).toHaveText([`E2E started on A ${key}`]);
});

// Typed but unsent text belongs to the mail it was typed for.
test('starts a fresh composer when switching to a mail without a chat', async ({
  page,
  api,
}) => {
  const key = `${Date.now()}`;
  await stubOfficeHost(page, { readItem: mail(key, 'A') });
  await openSignedInPane(page, api);
  await page.getByTestId('input').fill(`E2E typed for A ${key}`);

  await selectOutlookItem(page, mail(key, 'B'));

  await expect(page.getByTestId('input')).toHaveValue('');
});

