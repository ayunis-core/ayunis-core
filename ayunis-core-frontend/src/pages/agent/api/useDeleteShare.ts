import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSharesControllerDeleteShare,
  getSharesControllerGetSharesQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { CreateAgentShareDtoEntityType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export function useDeleteShare(agentId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('agent');

  const mutation = useSharesControllerDeleteShare({
    mutation: {
      onSuccess: () => {
        showSuccess(t('shares.success.deleted'));
      },
      onError: () => {
        showError(t('shares.error.delete'));
      },
      onSettled: () => {
        // Invalidate shares query to refetch
        void queryClient.invalidateQueries({
          queryKey: getSharesControllerGetSharesQueryKey({
            entityId: agentId,
            entityType: CreateAgentShareDtoEntityType.agent,
          }),
        });
        // Invalidate router to refresh data
        void router.invalidate();
      },
    },
  });

  function deleteShare(shareId: string) {
    mutation.mutate({ id: shareId });
  }

  return {
    deleteShare,
    isDeleting: mutation.isPending,
  };
}
