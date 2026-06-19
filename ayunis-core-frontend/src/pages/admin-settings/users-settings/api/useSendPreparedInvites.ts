import {
  getInvitesControllerGetInvitesQueryKey,
  useInvitesControllerSendPrepared,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { SendPreparedInvitesResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useQueryClient } from '@tanstack/react-query';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export function useSendPreparedInvites() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-users');

  const mutation = useInvitesControllerSendPrepared({
    mutation: {
      onSuccess: (response: SendPreparedInvitesResponseDto) => {
        if (response.failureCount > 0) {
          showError(
            t('sendPreparedInvites.partialSuccess', {
              success: response.successCount,
              total: response.totalCount,
            }),
          );
        } else {
          showSuccess(
            t('sendPreparedInvites.success', { count: response.successCount }),
          );
        }
      },
      onError: () => {
        showError(t('sendPreparedInvites.error'));
      },
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey: getInvitesControllerGetInvitesQueryKey(),
        });
        void router.invalidate();
      },
    },
  });

  return {
    sendPreparedInvites: () => mutation.mutate(),
    isSending: mutation.isPending,
  };
}
