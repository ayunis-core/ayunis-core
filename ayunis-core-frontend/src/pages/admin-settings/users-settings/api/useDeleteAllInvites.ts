import {
  getInvitesControllerGetInvitesQueryKey,
  getSubscriptionsControllerGetSubscriptionQueryKey,
  useInvitesControllerDeleteAllPending,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useQueryClient } from '@tanstack/react-query';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export function useDeleteAllInvites() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-users');

  const mutation = useInvitesControllerDeleteAllPending({
    mutation: {
      onSuccess: (data) => {
        showSuccess(
          t('deleteAllInvites.success', { count: data.deletedCount }),
        );
      },
      onError: () => {
        showError(t('deleteAllInvites.error'));
      },
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey: getInvitesControllerGetInvitesQueryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: getSubscriptionsControllerGetSubscriptionQueryKey(),
        });
        void router.invalidate();
      },
    },
  });

  return {
    deleteAllInvites: mutation.mutate,
    isDeleting: mutation.isPending,
  };
}
