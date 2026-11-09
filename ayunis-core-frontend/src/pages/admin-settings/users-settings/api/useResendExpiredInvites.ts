import {
  getInvitesControllerGetInvitesQueryKey,
  useExpiredInvitesControllerResendAll,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { ResendExpiredInvitesResponseDto } from '@/shared/api';
import { useQueryClient } from '@tanstack/react-query';
import { showError, showInfo, showSuccess } from '@/shared/lib/toast';
import { useRouter } from '@tanstack/react-router';
import extractErrorData from '@/shared/api/extract-error-data';
import { useTranslation } from 'react-i18next';

export function useResendExpiredInvites() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-users');

  const showOutcome = ({
    totalCount,
    successCount,
  }: ResendExpiredInvitesResponseDto) => {
    if (totalCount === 0) {
      showInfo(t('resendExpiredInvites.noneExpired'));
    } else if (successCount === totalCount) {
      showSuccess(t('resendExpiredInvites.success', { count: totalCount }));
    } else {
      showError(
        t('resendExpiredInvites.partialSuccess', {
          success: successCount,
          total: totalCount,
        }),
      );
    }
  };

  const mutation = useExpiredInvitesControllerResendAll({
    mutation: {
      onSuccess: showOutcome,
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          showError(
            code === 'RATE_LIMIT_EXCEEDED'
              ? t('resendExpiredInvites.rateLimitExceeded')
              : t('resendExpiredInvites.error'),
          );
        } catch {
          showError(t('resendExpiredInvites.error'));
        }
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
    resendExpiredInvites: () => mutation.mutate(),
    isResendingExpired: mutation.isPending,
  };
}
