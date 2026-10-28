import type { Page } from '@playwright/test';
import { expect } from '../fixtures/test';

export async function sendMessage(page: Page, text: string): Promise<void> {
  await page.getByTestId('input').fill(text);
  await page.getByTestId('send').click();
}

export async function startThread(page: Page, text: string): Promise<string> {
  await page.goto('/chat');
  await sendMessage(page, text);
  await expect(page.getByTestId('assistant-message').last()).toBeVisible();
  await expect(page).toHaveURL(/\/chats\/[0-9a-f-]+/);
  const threadId = /\/chats\/([0-9a-f-]+)/.exec(page.url())?.[1];
  if (!threadId) throw new Error(`No thread id in URL ${page.url()}`);
  return threadId;
}

export function sidebarThreadItem(page: Page, threadId: string) {
  return page
    .getByTestId('chat')
    .filter({ has: page.locator(`a[href="/chats/${threadId}"]`) });
}
