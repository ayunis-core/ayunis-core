import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getNotificationsControllerFindOneQueryKey,
  notificationsControllerMarkRead,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import { invalidateNotificationQueries } from '@/features/notifications';

export function useMarkNotificationRead() {
  const { t } = useTranslation('inbox');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      notificationsControllerMarkRead(notificationId),
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
              : 'toast.markReadError',
          ),
        );
      } catch {
        showError(t('toast.markReadError'));
      }
    },
  });
}
