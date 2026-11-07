import {
  useThreadsControllerFindAll,
  getThreadsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import {
  ThreadType,
  type ThreadsControllerFindAllParams,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

export interface SidebarThread {
  id: string;
  name: string;
  url: string;
  timestamp: string;
}

const SIDEBAR_THREADS_LIMIT = 20;

export function useThreads({
  hideRoutineThreads = false,
}: { hideRoutineThreads?: boolean } = {}) {
  const params: ThreadsControllerFindAllParams = {
    limit: SIDEBAR_THREADS_LIMIT,
    offset: 0,
    ...(hideRoutineThreads && { type: ThreadType.chat }),
  };
  const { data, isLoading, isError, error, refetch } =
    useThreadsControllerFindAll(params, {
      query: {
        queryKey: getThreadsControllerFindAllQueryKey(params),
      },
    });

  const threads = data?.data ?? [];
  const total = data?.pagination.total ?? 0;
  const hasMore = total > SIDEBAR_THREADS_LIMIT;

  return {
    threads,
    isLoading,
    // The generated hook types `error` as void, so callers that only need to
    // know whether the fetch failed use this flag.
    isError,
    error,
    refetch,
    hasMore,
    total,
  };
}
