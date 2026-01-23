import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
        toast.success(t('shares.success.deleted'));
      },
      onError: () => {
        toast.error(t('shares.error.delete'));
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
