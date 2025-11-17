import {
  getAgentsControllerFindAllQueryKey,
  useAgentsControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';

export function useAgents() {
  const {
    data: agents = [],
    isLoading,
    error,
    refetch,
  } = useAgentsControllerFindAll({
    query: {
      queryKey: getAgentsControllerFindAllQueryKey(),
    },
  });

  return {
    agents,
    isLoading,
    error,
    refetch,
  };
}
