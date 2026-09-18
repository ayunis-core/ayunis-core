import {
  useThreadsControllerFindAll,
  getThreadsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

const WORKSPACE_THREADS_LIMIT = 10;

export function useWorkspaceThreads(workspaceId: string, enabled: boolean) {
  const params = {
    workspaceId,
    limit: WORKSPACE_THREADS_LIMIT,
    offset: 0,
  };
  const { data, isLoading, error } = useThreadsControllerFindAll(params, {
    query: {
      queryKey: getThreadsControllerFindAllQueryKey(params),
      enabled,
    },
  });

  const total = data?.pagination.total ?? 0;

  return {
    threads: data?.data ?? [],
    hasMore: total > WORKSPACE_THREADS_LIMIT,
    isLoading,
    error,
  };
}
