import {
  useConnectorsControllerGetMicrosoft365,
  getConnectorsControllerGetMicrosoft365QueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export function useMicrosoft365Connector() {
  const { data, isLoading, error, refetch } =
    useConnectorsControllerGetMicrosoft365({
      query: { queryKey: getConnectorsControllerGetMicrosoft365QueryKey() },
    });

  return { connector: data, isLoading, error, refetch };
}
