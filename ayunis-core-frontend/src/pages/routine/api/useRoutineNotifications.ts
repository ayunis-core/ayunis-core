import {
  getNotificationsControllerFindAllQueryKey,
  useNotificationsControllerFindAll,
} from '@ayunis/api-client/endpoints';
import { ROUTINE_ITEMS_PER_PAGE } from '@/pages/routine/model/constants';

export function useRoutineNotifications(routineId: string, page: number) {
  const params = {
    routineId,
    limit: ROUTINE_ITEMS_PER_PAGE,
    offset: (page - 1) * ROUTINE_ITEMS_PER_PAGE,
  };
  const { data, isLoading, error } = useNotificationsControllerFindAll(params, {
    query: { queryKey: getNotificationsControllerFindAllQueryKey(params) },
  });

  return {
    notifications: data?.data ?? [],
    total: data?.pagination.total ?? 0,
    isLoading,
    error,
  };
}
