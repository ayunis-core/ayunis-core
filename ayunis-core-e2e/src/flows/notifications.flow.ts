import type { Page } from '@playwright/test';
import type { NotificationType } from '../clients/generated/ayunisCoreAPI.schemas';

export function inboxItem(page: Page, headline: string) {
  // Headlines are user data written by the routine, not translated copy.
  return page.getByTestId('notification-item').filter({
    has: page
      .getByTestId('notification-item-headline')
      .filter({ hasText: headline }),
  });
}

export function unreadNotificationsButton(page: Page, type: NotificationType) {
  return page
    .getByTestId('new-chat-unread-notifications-button')
    .and(page.locator(`[data-type="${type}"]`));
}

/** The inbox entry at the bottom of the sidebar, above the user menu. */
export function sidebarInbox(page: Page) {
  return page.getByTestId('sidebar-footer').getByTestId('sidebar-footer-inbox');
}
