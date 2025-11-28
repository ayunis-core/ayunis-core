import { useQueryClient } from '@tanstack/react-query';
import {
  useSharesControllerCreateShare,
  getSharesControllerGetSharesQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { CreateAgentShareDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { CreateAgentShareDtoEntityType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useCreateShare(agentId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('agent');

  const mutation = useSharesControllerCreateShare({
    mutation: {
      onSuccess: () => {
        showSuccess(t('shares.success.created'));
      },
      onError: () => {
        showError(t('shares.error.create'));
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

  function createShare() {
    const data: CreateAgentShareDto = {
      entityType: CreateAgentShareDtoEntityType.agent,
      agentId: agentId,
    };
    mutation.mutate({ data });
  }

  return {
    createShare,
    isCreating: mutation.isPending,
  };
}
