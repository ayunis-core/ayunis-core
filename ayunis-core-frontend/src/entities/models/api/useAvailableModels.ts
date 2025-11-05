import { useModelsControllerGetAvailableModelsWithConfig } from "@/shared/api";

export function useAvailableModels() {
  const {
    data: models = [],
    isLoading,
    error,
    refetch,
  } = useModelsControllerGetAvailableModelsWithConfig();

  return {
    models,
    isLoading,
    isError: !!error,
    error,
    refetch,
  };
}
