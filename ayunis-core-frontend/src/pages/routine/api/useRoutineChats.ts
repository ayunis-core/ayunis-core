import {
  getThreadsControllerFindAllQueryKey,
  useThreadsControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';
import { ROUTINE_ITEMS_PER_PAGE } from '@/pages/routine/model/constants';

export function useRoutineChats(routineId: string, page: number) {
  const params = {
    routineId,
    limit: ROUTINE_ITEMS_PER_PAGE,
    offset: (page - 1) * ROUTINE_ITEMS_PER_PAGE,
  };
  const { data, isLoading, error } = useThreadsControllerFindAll(params, {
    query: { queryKey: getThreadsControllerFindAllQueryKey(params) },
  });

  return {
    chats: data?.data ?? [],
    total: data?.pagination.total ?? 0,
    isLoading,
    error,
  };
}
