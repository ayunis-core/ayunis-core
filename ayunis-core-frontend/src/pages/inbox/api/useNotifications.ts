import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getNotificationsControllerCountUnreadQueryKey,
  getNotificationsControllerFindAllQueryKey,
  useNotificationsControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';
import { NOTIFICATIONS_PER_PAGE } from '@/pages/inbox/model/constants';

/**
 * Routines post notifications in the background, so the list is polled, and
 * every change refreshes the sidebar's unread count, which polls less often.
 */
const NOTIFICATIONS_REFETCH_INTERVAL_MS = 60_000;

export function notificationsPageParams(page: number) {
  return {
    limit: NOTIFICATIONS_PER_PAGE,
    offset: (page - 1) * NOTIFICATIONS_PER_PAGE,
  };
}

export function useNotifications(page: number) {
  const queryClient = useQueryClient();
  const params = notificationsPageParams(page);
  const { data, isLoading, error } = useNotificationsControllerFindAll(params, {
    query: {
      queryKey: getNotificationsControllerFindAllQueryKey(params),
      refetchInterval: NOTIFICATIONS_REFETCH_INTERVAL_MS,
    },
  });

  useEffect(() => {
    if (!data) return;
    void queryClient.invalidateQueries({
      queryKey: getNotificationsControllerCountUnreadQueryKey(),
    });
  }, [data, queryClient]);

  return {
    notifications: data?.data ?? [],
    total: data?.pagination.total ?? 0,
    isLoading,
    error,
  };
}
