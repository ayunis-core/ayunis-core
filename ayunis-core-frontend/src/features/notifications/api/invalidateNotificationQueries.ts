import type { QueryClient } from '@tanstack/react-query';
import {
  getNotificationsControllerCountUnreadQueryKey,
  getNotificationsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

/** Refreshes the inbox list and the sidebar's unread badge. */
export function invalidateNotificationQueries(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({
    queryKey: getNotificationsControllerFindAllQueryKey(),
  });
  void queryClient.invalidateQueries({
    queryKey: getNotificationsControllerCountUnreadQueryKey(),
  });
}
