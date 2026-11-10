import {
  getRoutinesControllerFindAllQueryKey,
  useRoutinesControllerFindAll,
} from '@/shared/api';

export function useRoutineFromProposal(toolCallId: string) {
  const query = useRoutinesControllerFindAll({
    query: {
      queryKey: getRoutinesControllerFindAllQueryKey(),
      enabled: toolCallId.length > 0,
    },
  });

  return {
    routine: query.data?.find(
      (routine) => routine.sourceToolCallId === toolCallId,
    ),
    // A failed lookup means "unknown"; the widget then still offers saving,
    // and the backend refuses a second routine from the same proposal.
    isLoading: query.isLoading,
  };
}
