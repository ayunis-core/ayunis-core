import {
  useThreadsControllerFindAll,
  getThreadsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export interface SidebarThread {
  id: string;
  name: string;
  url: string;
  timestamp: string;
}

const SIDEBAR_THREADS_LIMIT = 20;

export function useThreads() {
  const { data, isLoading, error, refetch } = useThreadsControllerFindAll(
    { limit: SIDEBAR_THREADS_LIMIT, offset: 0 },
    {
      query: {
        queryKey: getThreadsControllerFindAllQueryKey({
          limit: SIDEBAR_THREADS_LIMIT,
          offset: 0,
        }),
      },
    },
  );

  const threads = data?.data ?? [];
  const total = data?.pagination.total ?? 0;
  const hasMore = total > SIDEBAR_THREADS_LIMIT;

  return {
    threads,
    isLoading,
    error,
    refetch,
    hasMore,
    total,
  };
}
