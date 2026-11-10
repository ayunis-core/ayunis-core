import { useRoutinesControllerFindOne } from '@/shared/api';

export function useRoutineToEdit(routineId?: string) {
  const routineQuery = useRoutinesControllerFindOne(routineId ?? '', {
    query: { enabled: !!routineId, staleTime: Infinity },
  });
  return {
    routine: routineQuery.data,
    lookupComplete: routineQuery.isFetched,
  };
}
