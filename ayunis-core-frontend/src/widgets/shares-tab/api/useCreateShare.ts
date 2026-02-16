import { useQueryClient } from '@tanstack/react-query';
import {
  useSharesControllerCreateShare,
  useSharesControllerCreateSkillShare,
  getSharesControllerGetSharesQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type {
  CreateAgentShareDto,
  CreateSkillShareDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  CreateAgentShareDtoEntityType,
  CreateSkillShareDtoEntityType,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/shared/lib/toast';

type EntityType = 'agent' | 'skill';

export function useCreateShare(entityType: EntityType, entityId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const translationNs = entityType === 'agent' ? 'agent' : 'skill';
  const { t } = useTranslation(translationNs);

  const sharesEntityType =
    entityType === 'agent'
      ? CreateAgentShareDtoEntityType.agent
      : CreateSkillShareDtoEntityType.skill;

  const settledHandler = () => {
    void queryClient.invalidateQueries({
      queryKey: getSharesControllerGetSharesQueryKey({
        entityId,
        entityType: sharesEntityType,
      }),
    });
    void router.invalidate();
  };

  const agentMutation = useSharesControllerCreateShare({
    mutation: {
      onSuccess: () => showSuccess(t('shares.success.created')),
      onError: () => showError(t('shares.error.create')),
      onSettled: settledHandler,
    },
  });

  const skillMutation = useSharesControllerCreateSkillShare({
    mutation: {
      onSuccess: () => showSuccess(t('shares.success.created')),
      onError: () => showError(t('shares.error.create')),
      onSettled: settledHandler,
    },
  });

  function createShare(teamId?: string) {
    if (entityType === 'agent') {
      const data: CreateAgentShareDto = {
        entityType: CreateAgentShareDtoEntityType.agent,
        agentId: entityId,
        ...(teamId && { teamId }),
      };
      agentMutation.mutate({ data });
    } else {
      const data: CreateSkillShareDto = {
        entityType: CreateSkillShareDtoEntityType.skill,
        skillId: entityId,
        ...(teamId && { teamId }),
      };
      skillMutation.mutate({ data });
    }
  }

  return {
    createShare,
    isCreating: agentMutation.isPending || skillMutation.isPending,
  };
}
