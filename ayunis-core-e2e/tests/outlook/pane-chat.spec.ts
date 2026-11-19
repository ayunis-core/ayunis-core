import type { APIRequestContext, Page } from '@playwright/test';
import {
  stubOfficeHost,
  type OfficeStubComposeItem,
} from '../../src/clients/office-host-stub';
import type { MailcatcherClient } from '../../src/clients/mailcatcher.client';
import { createMemberSession } from '../../src/factories/user.factory';
import { expect, test } from '../../src/fixtures/test';
import {
  sendMessage,
  sidebarThreadItem,
  startThread,
} from '../../src/flows/chat.flow';
import { officeItemCalls, openSignedInPane } from '../../src/flows/outlook.flow';

// The pane runs the chat app, whose Outlook tools act on the stubbed mail
// being composed; the mock model answers these two prompts with those tools.
const SUMMARIZE_PROMPT = 'Summarize this email.';
const DRAFT_REPLY_PROMPT = 'Draft a reply to this email.';
test.use({ storageState: { cookies: [], origins: [] } });

function composeItem(key: string): OfficeStubComposeItem {
  return {
    subject: `E2E budget ${key}`,
    body: 'Hello Bob, the budget is attached.',
    from: { displayName: 'Alice', emailAddress: 'alice@e2e.local' },
    to: [{ displayName: 'Bob', emailAddress: 'bob@e2e.local' }],
  };
}

type StorageState = Awaited<ReturnType<APIRequestContext['storageState']>>;

/** Returns the member's web session for checks outside the pane. */
async function openPaneAsNewMember(
  page: Page,
  adminApi: APIRequestContext,
  mail: MailcatcherClient,
  key: string,
  item: OfficeStubComposeItem,
): Promise<StorageState> {
  await stubOfficeHost(page, { composeItem: item });
  const { api: memberApi } = await createMemberSession(adminApi, mail, key);
  try {
    await openSignedInPane(page, memberApi);
    return await memberApi.storageState();
  } finally {
    await memberApi.dispose();
  }
}

/** The Outlook prompt then goes into an open chat, as a follow-up. */
async function openChat(page: Page): Promise<void> {
  await sendMessage(page, 'E2E hello');
  await expect(page.getByTestId('assistant-message').last()).toBeVisible();
}

test('summarizes the open email from what the pane read', async ({
  page,
  api,
  mail,
}) => {
  const key = `outlook-summary-${Date.now()}`;
  const item = composeItem(key);
  await openPaneAsNewMember(page, api, mail, key, item);
  await openChat(page);

  await sendMessage(page, SUMMARIZE_PROMPT);

  await expect(page.getByTestId('assistant-message').last()).toContainText(
    `outlook-summary::${item.subject}`,
  );
});

test('inserts a drafted reply into the email being composed', async ({
  page,
  api,
  mail,
}) => {
  const key = `outlook-draft-${Date.now()}`;
  await openPaneAsNewMember(page, api, mail, key, composeItem(key));
  await openChat(page);

  await sendMessage(page, DRAFT_REPLY_PROMPT);

  await expect(page.getByTestId('outlook-draft')).toHaveAttribute(
    'data-status',
    'inserted',
  );
  expect(await officeItemCalls(page)).toContainEqual({
    method: 'body.prependAsync',
    args: [
      expect.stringMatching(/^<div id="ayunis-draft-[^"]+">E2E mock reply<\/div>$/),
      { coercionType: 'html' },
    ],
  });
});

test('inserts the reading-pane draft into the already open Outlook reply', async ({
  page,
  api,
}) => {
  const key = `outlook-inline-reply-${Date.now()}`;
  const internetMessageId = `<${key}@e2e.local>`;
  const item = composeItem(key);
  await stubOfficeHost(page, {
    readItem: {
      itemId: key,
      internetMessageId,
      subject: item.subject,
      body: item.body,
      from: item.from,
    },
  });
  await openSignedInPane(page, api);
  await sendMessage(page, DRAFT_REPLY_PROMPT);
  await expect(page.getByTestId('outlook-draft')).toContainText(
    'E2E mock reply',
  );
  await expect(page.getByTestId('outlook-draft-insert')).toHaveCount(0);
  expect(await officeItemCalls(page)).not.toContainEqual(
    expect.objectContaining({ method: 'displayReplyForm' }),
  );

  // Outlook activates the compose pane separately once Reply is open.
  const reply = await page.context().newPage();
  await stubOfficeHost(reply, {
    composeItem: { ...item, inReplyTo: internetMessageId },
  });
  await reply.goto('/outlook/taskpane.html?surface=messageCompose');
  const insert = reply.getByTestId('outlook-draft-insert');
  await expect(insert).toBeEnabled();
  expect(await officeItemCalls(reply)).not.toContainEqual(
    expect.objectContaining({ method: 'body.prependAsync' }),
  );
  await insert.click();
  await expect(reply.getByTestId('outlook-draft')).toHaveAttribute(
    'data-status',
    'inserted',
  );
  expect(await officeItemCalls(reply)).toContainEqual({
    method: 'body.prependAsync',
    args: [
      expect.stringContaining('>E2E mock reply</div>'),
      { coercionType: 'html' },
    ],
  });
});

test('keeps pane chats out of the web app and web chats out of the pane', async ({
  page,
  browser,
  api,
  mail,
}) => {
  const key = `outlook-history-${Date.now()}`;
  const webSession = await openPaneAsNewMember(
    page,
    api,
    mail,
    key,
    composeItem(key),
  );
  await openChat(page);
  await sendMessage(page, DRAFT_REPLY_PROMPT);
  await expect(page.getByTestId('outlook-draft')).toHaveAttribute(
    'data-status',
    'inserted',
  );

  const webContext = await browser.newContext({
    storageState: webSession,
  });
  try {
    const web = await webContext.newPage();
    const webThreadId = await startThread(web, `E2E web chat ${key}`);
    await web.reload();
    await expect(sidebarThreadItem(web, webThreadId)).toBeVisible();
    await expect(web.getByTestId('chat')).toHaveCount(1);
  } finally {
    await webContext.close();
  }

  await page.getByTestId('embedded-new-chat').click();
  await page.getByTestId('embedded-history').click();
  await expect(page.getByTestId('chat-card')).toHaveCount(1);
});

// The starter prompts start a new chat with the Outlook prompt as its first
// message, which the new-chat page sends before the chat page takes over.
test('summarizes the open email when asked in a new chat', async ({
  page,
  api,
  mail,
}) => {
  const key = `outlook-first-${Date.now()}`;
  const item = composeItem(key);
  await openPaneAsNewMember(page, api, mail, key, item);

  await sendMessage(page, SUMMARIZE_PROMPT);

  await expect(page.getByTestId('assistant-message').last()).toContainText(
    `outlook-summary::${item.subject}`,
  );
});
