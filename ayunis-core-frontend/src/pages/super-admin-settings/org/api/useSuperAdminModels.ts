import {
  useSuperAdminModelsControllerGetAvailableModels,
  useSuperAdminModelsControllerGetAllModelProviderInfosWithPermittedStatus,
} from "@/shared/api";

export function useSuperAdminModels(orgId: string) {
  const {
    data: models = [],
    isLoading: isLoadingModels,
    error: modelsError,
  } = useSuperAdminModelsControllerGetAvailableModels(orgId);

  const {
    data: providers = [],
    isLoading: isLoadingProviders,
    error: providersError,
  } = useSuperAdminModelsControllerGetAllModelProviderInfosWithPermittedStatus(
    orgId,
  );

  return {
    models,
    providers,
    isLoading: isLoadingModels || isLoadingProviders,
    isError: !!modelsError || !!providersError,
    error: modelsError || providersError,
  };
}
