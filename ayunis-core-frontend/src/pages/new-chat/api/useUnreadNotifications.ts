import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getNotificationsControllerCountUnreadQueryKey,
  getNotificationsControllerFindAllQueryKey,
  useNotificationsControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { NotificationType } from '@/shared/api/generated/ayunisCoreAPI.schemas';

/** The newest ones; the panel links to the inbox for the rest. */
const UNREAD_NOTIFICATIONS_LIMIT = 20;

/**
 * Routines post notifications in the background, so the list is polled, and
 * every change refreshes the tab counts, which are polled separately.
 */
const UNREAD_NOTIFICATIONS_REFETCH_INTERVAL_MS = 60_000;

export function useUnreadNotifications(type: NotificationType) {
  const queryClient = useQueryClient();
  const params = { limit: UNREAD_NOTIFICATIONS_LIMIT, type, unread: true };
  const { data, isLoading } = useNotificationsControllerFindAll(params, {
    query: {
      queryKey: getNotificationsControllerFindAllQueryKey(params),
      // The tab counts poll while a tab's list is closed, so a reopened tab
      // refetches instead of showing a cached list that no longer matches.
      staleTime: 0,
      refetchInterval: UNREAD_NOTIFICATIONS_REFETCH_INTERVAL_MS,
    },
  });

  useEffect(() => {
    if (!data) return;
    void queryClient.invalidateQueries({
      queryKey: getNotificationsControllerCountUnreadQueryKey(),
    });
  }, [data, queryClient]);

  return { notifications: data?.data ?? [], isLoading };
}
