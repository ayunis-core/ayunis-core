import {
  getInvitesControllerGetInvitesQueryKey,
  getSubscriptionsControllerGetSubscriptionQueryKey,
  useInvitesControllerDeleteInvite,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { PaginatedInvitesListResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useQueryClient } from '@tanstack/react-query';
import { showError } from '@/shared/lib/toast';
import { useRouter } from '@tanstack/react-router';
import extractErrorData from '@/shared/api/extract-error-data';
import { useTranslation } from 'react-i18next';

export function useInviteDelete() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-users');
  const deleteInviteMutation = useInvitesControllerDeleteInvite({
    mutation: {
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({
          queryKey: getInvitesControllerGetInvitesQueryKey(),
        });
        const previousData = queryClient.getQueryData(
          getInvitesControllerGetInvitesQueryKey(),
        );

        queryClient.setQueryData(
          getInvitesControllerGetInvitesQueryKey(),
          (old: PaginatedInvitesListResponseDto | undefined) => {
            if (!old) return old;
            return {
              ...old,
              data: old.data.filter((invite) => invite.id !== id),
            };
          },
        );
        return { previousData };
      },
      onError: (error, _, context) => {
        console.error(error);
        try {
          const { code } = extractErrorData(error);
          if (code === 'INVITE_NOT_FOUND') {
            showError(t('inviteDelete.error.inviteNotFound'));
          } else {
            showError(t('inviteDelete.error.unexpectedError'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          showError(t('inviteDelete.error.unexpectedError'));
        }
        queryClient.setQueryData(
          getInvitesControllerGetInvitesQueryKey(),
          context?.previousData,
        );
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
    deleteInvite: deleteInviteMutation.mutate,
    isLoading: deleteInviteMutation.isPending,
    isError: deleteInviteMutation.isError,
    error: deleteInviteMutation.error,
  };
}
