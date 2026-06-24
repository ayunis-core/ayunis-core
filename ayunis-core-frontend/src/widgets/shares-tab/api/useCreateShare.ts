import { useQueryClient } from '@tanstack/react-query';
import {
  useSharesControllerCreateSkillShare,
  useSharesControllerCreateKnowledgeBaseShare,
  getSharesControllerGetSharesQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type {
  CreateSkillShareDto,
  CreateKnowledgeBaseShareDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  CreateSkillShareDtoEntityType,
  CreateKnowledgeBaseShareDtoEntityType,
  SharesControllerGetSharesEntityType,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/shared/lib/toast';

type EntityType = 'skill' | 'knowledge_base';

const translationNsMap: Record<EntityType, string> = {
  skill: 'skill',
  knowledge_base: 'knowledge-bases',
};

const sharesEntityTypeMap: Record<
  EntityType,
  SharesControllerGetSharesEntityType
> = {
  skill: SharesControllerGetSharesEntityType.skill,
  knowledge_base: SharesControllerGetSharesEntityType.knowledge_base,
};

export function useCreateShare(entityType: EntityType, entityId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation(translationNsMap[entityType]);

  const sharesEntityType = sharesEntityTypeMap[entityType];

  const settledHandler = () => {
    void queryClient.invalidateQueries({
      queryKey: getSharesControllerGetSharesQueryKey({
        entityId,
        entityType: sharesEntityType,
      }),
    });
    void router.invalidate();
  };

  const mutationOptions = {
    mutation: {
      onSuccess: () => showSuccess(t('shares.success.created')),
      onError: () => showError(t('shares.error.create')),
      onSettled: settledHandler,
    },
  };

  const skillMutation = useSharesControllerCreateSkillShare(mutationOptions);
  const kbMutation =
    useSharesControllerCreateKnowledgeBaseShare(mutationOptions);

  function createShare(teamId?: string) {
    if (entityType === 'skill') {
      const data: CreateSkillShareDto = {
        entityType: CreateSkillShareDtoEntityType.skill,
        skillId: entityId,
        ...(teamId && { teamId }),
      };
      skillMutation.mutate({ data });
    } else {
      const data: CreateKnowledgeBaseShareDto = {
        entityType: CreateKnowledgeBaseShareDtoEntityType.knowledge_base,
        knowledgeBaseId: entityId,
        ...(teamId && { teamId }),
      };
      kbMutation.mutate({ data });
    }
  }

  return {
    createShare,
    isCreating: skillMutation.isPending || kbMutation.isPending,
  };
}
