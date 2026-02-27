import { useQueryClient } from '@tanstack/react-query';
import {
  useSharesControllerCreateShare,
  useSharesControllerCreateSkillShare,
  useSharesControllerCreateKnowledgeBaseShare,
  getSharesControllerGetSharesQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type {
  CreateAgentShareDto,
  CreateSkillShareDto,
  CreateKnowledgeBaseShareDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  CreateAgentShareDtoEntityType,
  CreateSkillShareDtoEntityType,
  CreateKnowledgeBaseShareDtoEntityType,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/shared/lib/toast';
import {
  type EntityType,
  translationNsMap,
  sharesEntityTypeMap,
} from '../lib/constants';

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

  const agentMutation = useSharesControllerCreateShare(mutationOptions);
  const skillMutation = useSharesControllerCreateSkillShare(mutationOptions);
  const kbMutation =
    useSharesControllerCreateKnowledgeBaseShare(mutationOptions);

  function createShare(teamId?: string) {
    if (entityType === 'agent') {
      const data: CreateAgentShareDto = {
        entityType: CreateAgentShareDtoEntityType.agent,
        agentId: entityId,
        ...(teamId && { teamId }),
      };
      agentMutation.mutate({ data });
    } else if (entityType === 'skill') {
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
    isCreating:
      agentMutation.isPending ||
      skillMutation.isPending ||
      kbMutation.isPending,
  };
}
