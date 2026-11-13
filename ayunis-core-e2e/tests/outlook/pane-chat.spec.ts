import type { APIRequestContext, Page } from '@playwright/test';
import {
  stubOfficeHost,
  type OfficeStubComposeItem,
} from '../../src/clients/office-host-stub';
import type { MailcatcherClient } from '../../src/clients/mailcatcher.client';
import { createMemberSession } from '../../src/factories/user.factory';
import { expect, test } from '../../src/fixtures/test';
import { sidebarThreadItem, startThread } from '../../src/flows/chat.flow';
import { officeItemCalls, openSignedInPane } from '../../src/flows/outlook.flow';

// The pane runs its Outlook tools against the stubbed mail being composed;
// the mock model answers the English quick-action prompts with those tools.
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

test('summarizes the open email from what the pane read', async ({
  page,
  api,
  mail,
}) => {
  const key = `outlook-summary-${Date.now()}`;
  const item = composeItem(key);
  await openPaneAsNewMember(page, api, mail, key, item);

  await page.getByTestId('outlook-pane-quick-action-summarize').click();

  await expect(
    page.getByTestId('outlook-pane-assistant-message').last(),
  ).toContainText(`outlook-summary::${item.subject}`);
  const card = page.getByTestId('outlook-pane-tool-card');
  await expect(card).toHaveAttribute('data-tool', 'outlook__read_email');
  await expect(card).toHaveAttribute('data-status', 'read');
});

test('inserts a drafted reply into the email being composed', async ({
  page,
  api,
  mail,
}) => {
  const key = `outlook-draft-${Date.now()}`;
  await openPaneAsNewMember(page, api, mail, key, composeItem(key));

  await page.getByTestId('outlook-pane-quick-action-draftReply').click();

  const card = page.getByTestId('outlook-pane-tool-card');
  await expect(card).toHaveAttribute('data-tool', 'outlook__draft_email');
  await expect(card).toHaveAttribute('data-status', 'inserted');
  expect(await officeItemCalls(page)).toContainEqual({
    method: 'body.setSelectedDataAsync',
    args: ['E2E mock reply', { coercionType: 'text' }],
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
  await page.getByTestId('outlook-pane-quick-action-draftReply').click();
  await expect(page.getByTestId('outlook-pane-tool-card')).toHaveAttribute(
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

  await page.getByTestId('outlook-pane-history').click();
  await expect(page.getByTestId('outlook-pane-thread')).toHaveCount(1);
});
