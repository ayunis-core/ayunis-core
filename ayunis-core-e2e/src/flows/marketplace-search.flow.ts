import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { createPersonalThread } from '../factories/workspace-context.factory';
import { expect } from '../fixtures/test';
import { sendMessage } from './chat.flow';

/**
 * The mock model calls marketplace_search with these arguments and answers
 * `marketplace-search::<count>` followed by one
 * `<type> <identifier> <installUrl>` line per entry.
 */
export interface MarketplaceSearchArguments {
  type?: 'skill' | 'integration' | 'routine' | 'all';
}

/**
 * Asks in a new chat, so every answer is the last message of its own thread.
 * `baseUrl` targets another frontend, e.g. the one with routines disabled.
 */
export async function searchMarketplaceInNewChat(
  page: Page,
  api: APIRequestContext,
  search: MarketplaceSearchArguments = {},
  baseUrl = '',
): Promise<Locator> {
  const thread = await createPersonalThread(api);
  await page.goto(`${baseUrl}/chats/${thread.id}`);
  const args = Object.keys(search).length ? `: ${JSON.stringify(search)}` : '';
  await sendMessage(page, `E2E search the marketplace${args}`);
  const answer = page.getByTestId('assistant-message').last();
  await expect(answer).toContainText('marketplace-search::', {
    timeout: 30_000,
  });
  return answer;
}
