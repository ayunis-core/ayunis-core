import {
  getInvitesControllerGetInvitesQueryKey,
  getSubscriptionsControllerGetSubscriptionQueryKey,
  useInvitesControllerCreateBulk,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { CreateBulkInvitesResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useQueryClient } from '@tanstack/react-query';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';

export function useBulkInviteCreate(
  onSuccess?: (response: CreateBulkInvitesResponseDto) => void,
  onError?: () => void,
) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-users');

  const mutation = useInvitesControllerCreateBulk({
    mutation: {
      onSuccess: (response) => {
        if (response.failureCount === 0) {
          showSuccess(
            t('bulkInvite.allSuccess', { count: response.successCount }),
          );
        } else if (response.successCount > 0) {
          showSuccess(
            t('bulkInvite.partialSuccess', {
              success: response.successCount,
              total: response.totalCount,
            }),
          );
        }
        onSuccess?.(response);
      },
      onError: (error: unknown) => {
        try {
          const { code } = extractErrorData(error);
          if (code === 'BULK_INVITE_VALIDATION_FAILED') {
            showError(t('bulkInvite.validationFailed'));
          } else {
            showError(t('bulkInvite.error'));
          }
        } catch {
          showError(t('bulkInvite.error'));
        }
        onError?.();
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

  function createBulkInvites(
    invites: Array<{ email: string; role: string }>,
  ): void {
    mutation.mutate({
      data: {
        invites: invites.map((i) => ({
          email: i.email,
          role: i.role as 'admin' | 'user',
        })),
      },
    });
  }

  return {
    createBulkInvites,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
