import {
  getNotificationsControllerFindOneQueryKey,
  useNotificationsControllerFindOne,
} from '@/shared/api/generated/ayunisCoreAPI';

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
