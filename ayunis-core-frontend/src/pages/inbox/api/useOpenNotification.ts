import {
  getNotificationsControllerFindOneQueryKey,
  useNotificationsControllerFindOne,
} from '@ayunis/api-client/endpoints';

/**
 * Follows the cached copy of the open notification, which its route loads and
 * the read toggles update, without fetching it a second time.
 */
export function useOpenNotification(notificationId?: string) {
  const { data } = useNotificationsControllerFindOne(notificationId ?? '', {
    query: {
      queryKey: getNotificationsControllerFindOneQueryKey(notificationId ?? ''),
      enabled: false,
    },
  });
  return notificationId ? data : undefined;
}
