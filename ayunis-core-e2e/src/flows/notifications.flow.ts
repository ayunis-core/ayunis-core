import type { Page } from '@playwright/test';

export function inboxItem(page: Page, headline: string) {
  // Headlines are user data written by the routine, not translated copy.
  return page.getByTestId('notification-item').filter({
    has: page
      .getByTestId('notification-item-headline')
      .filter({ hasText: headline }),
  });
}
