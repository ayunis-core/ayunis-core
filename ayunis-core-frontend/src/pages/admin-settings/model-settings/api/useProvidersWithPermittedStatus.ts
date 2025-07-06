import { useModelsControllerGetAllModelProviderInfosWithPermittedStatus } from "@/shared/api";
import type { Provider } from "../model/openapi";

export function useProvidersWithPermittedStatus() {
  const {
    data: providers = [],
    isLoading,
    error,
    refetch,
  } = useModelsControllerGetAllModelProviderInfosWithPermittedStatus();

  return {
    providers: providers as Provider[],
    isLoading,
    isError: !!error,
    error,
    refetch,
  };
}
