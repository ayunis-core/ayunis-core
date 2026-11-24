import {
  getNotificationsControllerFindOneQueryKey,
  useNotificationsControllerFindOne,
} from '@ayunis/api-client/endpoints';

export function useNotification(notificationId: string) {
  const { data, isLoading, error } = useNotificationsControllerFindOne(
    notificationId,
    {
      query: {
        queryKey: getNotificationsControllerFindOneQueryKey(notificationId),
      },
    },
  );
  return { notification: data, isLoading, error };
}
