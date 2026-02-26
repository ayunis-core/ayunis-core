import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  useSkillKnowledgeBasesControllerUnassignKnowledgeBase,
  getSkillKnowledgeBasesControllerListSkillKnowledgeBasesQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { KnowledgeBaseResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showSuccess, showError } from '@/shared/lib/toast';

/**
 * Hook to unassign a knowledge base from a skill with optimistic updates
 */
export function useUnassignKnowledgeBase() {
  const { t } = useTranslation('skill');
  const queryClient = useQueryClient();

  return useSkillKnowledgeBasesControllerUnassignKnowledgeBase({
    mutation: {
      onMutate: async ({ skillId, knowledgeBaseId }) => {
        await queryClient.cancelQueries({
          queryKey:
            getSkillKnowledgeBasesControllerListSkillKnowledgeBasesQueryKey(
              skillId,
            ),
        });

        const previousAssignments = queryClient.getQueryData(
          getSkillKnowledgeBasesControllerListSkillKnowledgeBasesQueryKey(
            skillId,
          ),
        );

        queryClient.setQueryData(
          getSkillKnowledgeBasesControllerListSkillKnowledgeBasesQueryKey(
            skillId,
          ),
          (old: KnowledgeBaseResponseDto[] | undefined) => {
            if (!old) return old;
            return old.filter((kb) => kb.id !== knowledgeBaseId);
          },
        );

        return { previousAssignments };
      },
      onError: (error, variables, context) => {
        if (context?.previousAssignments) {
          queryClient.setQueryData(
            getSkillKnowledgeBasesControllerListSkillKnowledgeBasesQueryKey(
              variables.skillId,
            ),
            context.previousAssignments,
          );
        }
        console.error('Unassign knowledge base failed:', error);
        showError(t('knowledgeBases.errors.failedToUnassign'));
      },
      onSuccess: () => {
        showSuccess(t('knowledgeBases.success.unassigned'));
      },
      onSettled: (_data, _error, variables) => {
        void queryClient.invalidateQueries({
          queryKey:
            getSkillKnowledgeBasesControllerListSkillKnowledgeBasesQueryKey(
              variables.skillId,
            ),
        });
      },
    },
  });
}
