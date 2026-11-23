import {
  getNotificationsControllerCountUnreadQueryKey,
  useNotificationsControllerCountUnread,
} from '@ayunis/api-client/endpoints';
import type { UnreadNotificationTypeCountResponseDto } from '@ayunis/api-client/schemas';
import { useIsFeatureEnabled } from '@/features/feature-toggles';

/** Routines post notifications in the background, so the count is polled. */
const UNREAD_COUNT_REFETCH_INTERVAL_MS = 60_000;

const NO_UNREAD_BY_TYPE: UnreadNotificationTypeCountResponseDto[] = [];

export function useUnreadNotificationCount() {
  const enabled = useIsFeatureEnabled('routinesEnabled');
  const { data } = useNotificationsControllerCountUnread({
    query: {
      queryKey: getNotificationsControllerCountUnreadQueryKey(),
      enabled,
      refetchInterval: UNREAD_COUNT_REFETCH_INTERVAL_MS,
    },
  });
  return {
    unreadCount: enabled ? (data?.count ?? 0) : 0,
    unreadByType: enabled
      ? (data?.byType ?? NO_UNREAD_BY_TYPE)
      : NO_UNREAD_BY_TYPE,
  };
}
