import {
  useConnectorsControllerList,
  getConnectorsControllerListQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

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
