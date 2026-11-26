import type {
  NotificationResponseDto,
  NotificationType,
} from '@ayunis/api-client/schemas';

interface ListOrder {
  type?: NotificationType;
  /** Unread before read, as the list is ordered while read ones are shown. */
  unreadFirst: boolean;
}

/**
 * Opening a notification reads it, which drops it from the fetched list while
 * read ones are hidden, or moves it behind every unread one, possibly onto
 * another page, while they are shown. The open notification stays listed
 * where the list's order puts it.
 */
export function withOpenNotification(
  notifications: NotificationResponseDto[],
  open: NotificationResponseDto | undefined,
  { type, unreadFirst }: ListOrder,
): NotificationResponseDto[] {
  if (!open || (type && open.type !== type)) return notifications;
  if (notifications.some((notification) => notification.id === open.id)) {
    return notifications;
  }
  const laterIndex = notifications.findIndex((notification) =>
    sortsBefore(open, notification, unreadFirst),
  );
  const index = laterIndex === -1 ? notifications.length : laterIndex;
  return [
    ...notifications.slice(0, index),
    open,
    ...notifications.slice(index),
  ];
}

function sortsBefore(
  a: NotificationResponseDto,
  b: NotificationResponseDto,
  unreadFirst: boolean,
): boolean {
  const aUnread = a.readAt === null;
  if (unreadFirst && aUnread !== (b.readAt === null)) return aUnread;
  return Date.parse(a.createdAt) > Date.parse(b.createdAt);
}
