import { useThreadsControllerFindAll } from "@/shared/api/generated/ayunisCoreAPI";

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
  } = useThreadsControllerFindAll({
    query: {
      queryKey: ["threads"],
    },
  });

  return {
    threads,
    isLoading,
    error,
    refetch,
  };
}
