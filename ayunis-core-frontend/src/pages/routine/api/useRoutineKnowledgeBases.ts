import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getKnowledgeBasesControllerFindAllQueryKey,
  getRoutineKnowledgeBasesControllerListQueryKey,
  routineKnowledgeBasesControllerAdd,
  routineKnowledgeBasesControllerRemove,
  useKnowledgeBasesControllerFindAll,
  useRoutineKnowledgeBasesControllerList,
} from '@ayunis/api-client/endpoints';
import type { KnowledgeBaseResponseDto } from '@ayunis/api-client/schemas';
import extractErrorData from '@/shared/api/extract-error-data';
import { personalKnowledgeBaseListParams } from '@/shared/api/knowledge-base-scopes';
import { showError } from '@/shared/lib/toast';

/** The user's own and shared personal knowledge bases, and the routine's. */
export function useRoutineKnowledgeBases(routineId: string) {
  const available = useKnowledgeBasesControllerFindAll(
    personalKnowledgeBaseListParams,
  );
  const assigned = useRoutineKnowledgeBasesControllerList(routineId);

  return {
    availableKnowledgeBases: available.data?.data,
    assignedKnowledgeBases: assigned.data,
    assignedIds: assigned.data?.map(({ id }) => id),
    isLoading: available.isLoading || assigned.isLoading,
    isError: available.isError || assigned.isError,
    refetch: () => {
      void available.refetch();
      void assigned.refetch();
    },
  };
}

interface ToggleKnowledgeBaseParams {
  knowledgeBaseId: string;
  on: boolean;
}

/** Shows the switch in its new state at once and flips it back if saving fails. */
export function useToggleRoutineKnowledgeBase(
  routineId: string,
  availableKnowledgeBases?: KnowledgeBaseResponseDto[],
) {
  const { t } = useTranslation('routines');
  const queryClient = useQueryClient();
  const queryKey = getRoutineKnowledgeBasesControllerListQueryKey(routineId);

  return useMutation({
    mutationFn: ({ knowledgeBaseId, on }: ToggleKnowledgeBaseParams) =>
      on
        ? routineKnowledgeBasesControllerAdd(routineId, knowledgeBaseId)
        : routineKnowledgeBasesControllerRemove(routineId, knowledgeBaseId),
    onMutate: async ({ knowledgeBaseId, on }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<KnowledgeBaseResponseDto[]>(queryKey);
      queryClient.setQueryData<KnowledgeBaseResponseDto[]>(
        queryKey,
        (old = []) => {
          if (!on) return old.filter(({ id }) => id !== knowledgeBaseId);
          const knowledgeBase = availableKnowledgeBases?.find(
            ({ id }) => id === knowledgeBaseId,
          );
          return knowledgeBase ? [...old, knowledgeBase] : old;
        },
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
      // What made it fail (a disconnected integration, a revoked share) may
      // change what can be switched on.
      void queryClient.invalidateQueries({
        queryKey: getKnowledgeBasesControllerFindAllQueryKey(
          personalKnowledgeBaseListParams,
        ),
      });
      try {
        const { code } = extractErrorData(error);
        switch (code) {
          case 'KNOWLEDGE_BASE_NOT_FOUND':
            showError(t('toast.knowledgeBaseUnavailable'));
            break;
          case 'ROUTINE_NOT_FOUND':
            showError(t('toast.notFound'));
            break;
          default:
            showError(t('toast.contextSaveError'));
        }
      } catch {
        showError(t('toast.contextSaveError'));
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}
