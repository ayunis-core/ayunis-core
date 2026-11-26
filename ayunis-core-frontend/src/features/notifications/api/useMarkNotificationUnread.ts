import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getNotificationsControllerFindOneQueryKey,
  notificationsControllerMarkUnread,
} from '@ayunis/api-client/endpoints';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import { invalidateNotificationQueries } from './invalidateNotificationQueries';

export function useMarkNotificationUnread() {
  const { t } = useTranslation('inbox');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      notificationsControllerMarkUnread(notificationId),
    onSuccess: (notification) => {
      queryClient.setQueryData(
        getNotificationsControllerFindOneQueryKey(notification.id),
        notification,
      );
      invalidateNotificationQueries(queryClient);
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        showError(
          t(
            code === 'NOTIFICATION_NOT_FOUND'
              ? 'toast.notFound'
              : 'toast.markUnreadError',
          ),
        );
      } catch {
        showError(t('toast.markUnreadError'));
      }
    },
  });
}
