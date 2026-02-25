import {
  getAgentsControllerFindAllQueryKey,
  useAgentsControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';

interface UseAgentsOptions {
  enabled?: boolean;
}

export function useAgents(options: UseAgentsOptions = {}) {
  const { enabled = true } = options;
  const {
    data: agents = [],
    isLoading,
    error,
    refetch,
  } = useAgentsControllerFindAll({
    query: {
      queryKey: getAgentsControllerFindAllQueryKey(),
      enabled,
    },
  });

  return {
    agents,
    isLoading,
    error,
    refetch,
  };
}
