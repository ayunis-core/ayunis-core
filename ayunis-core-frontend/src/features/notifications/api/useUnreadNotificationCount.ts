import {
  getNotificationsControllerCountUnreadQueryKey,
  useNotificationsControllerCountUnread,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useIsFeatureEnabled } from '@/features/feature-toggles';

/** Routines post notifications in the background, so the count is polled. */
const UNREAD_COUNT_REFETCH_INTERVAL_MS = 60_000;

export function useUnreadNotificationCount() {
  const enabled = useIsFeatureEnabled('routinesEnabled');
  const { data } = useNotificationsControllerCountUnread({
    query: {
      queryKey: getNotificationsControllerCountUnreadQueryKey(),
      enabled,
      refetchInterval: UNREAD_COUNT_REFETCH_INTERVAL_MS,
    },
  });
  return { unreadCount: enabled ? (data?.count ?? 0) : 0 };
}
