import {
  useThreadsControllerFindAll,
  getThreadsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useIsWorkspacesEnabled } from '@/features/feature-toggles';

export interface SidebarThread {
  id: string;
  name: string;
  url: string;
  timestamp: string;
}

const SIDEBAR_THREADS_LIMIT = 20;

export function useThreads() {
  const workspacesEnabled = useIsWorkspacesEnabled();
  const params = {
    limit: SIDEBAR_THREADS_LIMIT,
    offset: 0,
    ...(workspacesEnabled ? { unfiled: true } : {}),
  };
  const { data, isLoading, error, refetch } = useThreadsControllerFindAll(
    params,
    {
      query: {
        queryKey: getThreadsControllerFindAllQueryKey(params),
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
