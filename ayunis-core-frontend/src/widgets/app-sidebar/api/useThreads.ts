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

export function useThreads() {
  const {
    data: threads = [],
    isLoading,
    error,
    refetch,
  } = useThreadsControllerFindAll(undefined, {
    query: {
      queryKey: getThreadsControllerFindAllQueryKey(),
    },
  });

  return {
    threads,
    isLoading,
    error,
    refetch,
  };
}
