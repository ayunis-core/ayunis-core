import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  useSkillKnowledgeBasesControllerAssignKnowledgeBase,
  getSkillKnowledgeBasesControllerListSkillKnowledgeBasesQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { KnowledgeBaseResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showSuccess, showError } from '@/shared/lib/toast';

/**
 * Hook to assign a knowledge base to a skill with optimistic updates
 */
export function useAssignKnowledgeBase(
  availableKnowledgeBases?: KnowledgeBaseResponseDto[],
) {
  const { t } = useTranslation('skill');
  const queryClient = useQueryClient();

  return useSkillKnowledgeBasesControllerAssignKnowledgeBase({
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
            const knowledgeBase = availableKnowledgeBases?.find(
              (kb) => kb.id === knowledgeBaseId,
            );
            return knowledgeBase ? [...old, knowledgeBase] : old;
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
        console.error('Assign knowledge base failed:', error);
        showError(t('knowledgeBases.errors.failedToAssign'));
      },
      onSuccess: () => {
        showSuccess(t('knowledgeBases.success.assigned'));
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
