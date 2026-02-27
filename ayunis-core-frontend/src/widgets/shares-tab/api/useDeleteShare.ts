import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSharesControllerDeleteShare,
  getSharesControllerGetSharesQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { SharesControllerGetSharesEntityType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

type EntityType = 'agent' | 'skill' | 'knowledge_base';

const translationNsMap: Record<EntityType, string> = {
  agent: 'agent',
  skill: 'skill',
  knowledge_base: 'knowledge-bases',
};

const sharesEntityTypeMap: Record<
  EntityType,
  SharesControllerGetSharesEntityType
> = {
  agent: SharesControllerGetSharesEntityType.agent,
  skill: SharesControllerGetSharesEntityType.skill,
  knowledge_base: SharesControllerGetSharesEntityType.knowledge_base,
};

export function useDeleteShare(entityType: EntityType, entityId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation(translationNsMap[entityType]);

  const sharesEntityType = sharesEntityTypeMap[entityType];

  const mutation = useSharesControllerDeleteShare({
    mutation: {
      onSuccess: () => {
        showSuccess(t('shares.success.deleted'));
      },
      onError: () => {
        showError(t('shares.error.delete'));
      },
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey: getSharesControllerGetSharesQueryKey({
            entityId,
            entityType: sharesEntityType,
          }),
        });
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
