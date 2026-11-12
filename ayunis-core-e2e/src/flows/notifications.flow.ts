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

export function unreadNotificationsTab(page: Page, type: NotificationType) {
  return page
    .getByTestId('new-chat-unread-notifications-tab')
    .and(page.locator(`[data-type="${type}"]`));
}

/** An unread notification in the new chat page's panel. */
export function unreadNotificationItem(page: Page, headline: string) {
  return page.getByTestId('new-chat-unread-notification').filter({
    has: page
      .getByTestId('new-chat-unread-notification-headline')
      .filter({ hasText: headline }),
  });
}

export function sidebarInbox(page: Page) {
  return page.getByTestId('sidebar-inbox');
}
