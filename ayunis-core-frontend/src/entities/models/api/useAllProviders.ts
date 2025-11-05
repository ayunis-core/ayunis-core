import { useModelsControllerGetAllModelProviderInfosWithPermittedStatus } from "@/shared/api";

export function useAllProviders() {
  const {
    data: providers = [],
    isLoading,
    error,
    refetch,
  } = useModelsControllerGetAllModelProviderInfosWithPermittedStatus();

  return {
    providers,
    isLoading,
    isError: !!error,
    error,
    refetch,
  };
}
