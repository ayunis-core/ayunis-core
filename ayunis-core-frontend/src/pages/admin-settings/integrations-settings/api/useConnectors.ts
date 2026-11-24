import {
  useConnectorsControllerList,
  getConnectorsControllerListQueryKey,
} from '@ayunis/api-client/endpoints';

export function useConnectors() {
  const {
    data: connectors = [],
    isLoading,
    error,
    refetch,
  } = useConnectorsControllerList({
    query: { queryKey: getConnectorsControllerListQueryKey() },
  });

  return { connectors, isLoading, error, refetch };
}
