import type { APIRequestContext, Locator, Page } from '@playwright/test';
import {
  stubOfficeHost,
  type OfficeStubComposeItem,
  type OfficeStubReadItem,
} from '../../src/clients/office-host-stub';
import type { MailcatcherClient } from '../../src/clients/mailcatcher.client';
import { createMemberSession } from '../../src/factories/user.factory';
import { expect, test } from '../../src/fixtures/outlook';
import {
  sendMessage,
  sidebarThreadItem,
  startThread,
} from '../../src/flows/chat.flow';
import {
  dispatchLaunchEvent,
  officeItemCalls,
  openLaunchEventRuntime,
  openSignedInPane,
  selectOutlookItem,
} from '../../src/flows/outlook.flow';

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

function readItem(key: string): OfficeStubReadItem {
  const { subject, body, from } = composeItem(key);
  return {
    itemId: key,
    internetMessageId: `<${key}@e2e.local>`,
    subject,
    body,
    from,
  };
}

const REPLY_FORM_METHODS = [
  'displayReplyForm',
  'displayReplyAllForm',
  'displayReplyFormAsync',
  'displayReplyAllFormAsync',
];

async function replyFormCalls(page: Page) {
  return (await officeItemCalls(page)).filter(({ method }) =>
    REPLY_FORM_METHODS.includes(method),
  );
}

function replyButtons(draft: Locator) {
  return draft.getByTestId(/^outlook-draft-reply(-all)?$/);
}

type StorageState = Awaited<ReturnType<APIRequestContext['storageState']>>;

/** Returns the member's web session for checks outside the pane. */
async function openPaneAsNewMember(
  page: Page,
  adminApi: APIRequestContext,
  mail: MailcatcherClient,
  key: string,
  item: OfficeStubComposeItem | { readItem: OfficeStubReadItem },
): Promise<StorageState> {
  await stubOfficeHost(
    page,
    'readItem' in item ? item : { composeItem: item },
  );
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
  await expect(replyButtons(page.getByTestId('outlook-draft'))).toHaveCount(0);
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
  const { internetMessageId } = readItem(key);
  const item = composeItem(key);
  await stubOfficeHost(page, { readItem: readItem(key) });
  await openSignedInPane(page, api);
  await sendMessage(page, DRAFT_REPLY_PROMPT);
  await expect(page.getByTestId('outlook-draft')).toContainText(
    'E2E mock reply',
  );
  await expect(page.getByTestId('outlook-draft-reply-all')).toBeVisible();
  await expect(page.getByTestId('outlook-draft-insert')).toHaveCount(0);
  expect(await replyFormCalls(page)).toEqual([]);

  // Opening Reply in Outlook fires the compose event, which leaves the
  // reply as Outlook created it.
  const replyItem = { ...item, inReplyTo: internetMessageId };
  const runtime = await page.context().newPage();
  await stubOfficeHost(runtime, { composeItem: replyItem });
  await openLaunchEventRuntime(runtime);
  expect(await dispatchLaunchEvent(runtime, 'onMessageCompose')).toBe(true);
  expect(await officeItemCalls(runtime)).toEqual([]);
  await runtime.close();

  // Outlook activates the compose pane separately once Reply is open.
  const reply = await page.context().newPage();
  await stubOfficeHost(reply, { composeItem: replyItem });
  await reply.goto('/outlook/taskpane.html?surface=messageCompose');
  const insert = reply.getByTestId('outlook-draft-insert');
  await expect(insert).toBeEnabled();
  await expect(replyButtons(reply.getByTestId('outlook-draft'))).toHaveCount(0);
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

test('opens Reply all and Reply with the latest reading-pane draft', async ({
  page,
  api,
}) => {
  const key = `outlook-reply-buttons-${Date.now()}`;
  await stubOfficeHost(page, { readItem: readItem(key) });
  await openSignedInPane(page, api);
  await sendMessage(page, DRAFT_REPLY_PROMPT);
  await expect(page.getByTestId('outlook-draft-reply-all')).toBeVisible();
  await sendMessage(page, DRAFT_REPLY_PROMPT);
  const drafts = page.getByTestId('outlook-draft');
  await expect(drafts).toHaveCount(2);
  const latest = drafts.last();
  await expect(latest.getByTestId('outlook-draft-reply-all')).toBeVisible();
  await expect(replyButtons(drafts.first())).toHaveCount(0);
  expect(await replyFormCalls(page)).toEqual([]);

  const draftHtml = {
    htmlBody: expect.stringMatching(
      /^<div id="ayunis-draft-[0-9a-f]+">E2E mock reply<\/div>$/,
    ),
  };
  await latest.getByTestId('outlook-draft-reply-all').click();
  await expect
    .poll(() => replyFormCalls(page))
    .toEqual([{ method: 'displayReplyAllFormAsync', args: [draftHtml] }]);
  await expect(latest).toHaveAttribute('data-status', 'none');

  await latest.getByTestId('outlook-draft-reply').click();
  await expect
    .poll(() => replyFormCalls(page))
    .toEqual([
      { method: 'displayReplyAllFormAsync', args: [draftHtml] },
      { method: 'displayReplyFormAsync', args: [draftHtml] },
    ]);
  await expect(latest).toHaveAttribute('data-status', 'none');
  await expect(replyButtons(latest)).toHaveCount(2);
});

// The pane opens its only chat from the history on another email.
test('offers no reply on a draft once the pinned pane shows another email', async ({
  page,
  api,
  mail,
}) => {
  const key = `outlook-reply-moved-${Date.now()}`;
  await openPaneAsNewMember(page, api, mail, key, { readItem: readItem(key) });
  await sendMessage(page, DRAFT_REPLY_PROMPT);
  await expect(page.getByTestId('outlook-draft-reply-all')).toBeVisible();

  await selectOutlookItem(page, readItem(`${key}-other`));
  await page.getByTestId('embedded-history').click();
  await page.getByTestId('chat-card').click();

  await expect(page.getByTestId('outlook-draft')).toContainText(
    'E2E mock reply',
  );
  await expect(replyButtons(page.getByTestId('outlook-draft'))).toHaveCount(0);
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

  await page.getByTestId('chat-header-new-chat').click();
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
