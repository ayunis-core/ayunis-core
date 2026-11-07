import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { notificationsControllerMarkAllRead } from '@/shared/api/generated/ayunisCoreAPI';
import { showError } from '@/shared/lib/toast';
import { invalidateNotificationQueries } from '@/features/notifications';

export function useMarkAllNotificationsRead() {
  const { t } = useTranslation('inbox');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await notificationsControllerMarkAllRead();
    },
    onSuccess: () => {
      invalidateNotificationQueries(queryClient);
    },
    // The endpoint has no error codes of its own to tell apart.
    onError: () => {
      showError(t('toast.markAllReadError'));
    },
  });
}
