import { useSuperAdminPermittedModelsControllerGetAvailableModels } from '@/shared/api';

export function useSuperAdminModels(orgId: string) {
  const {
    data: models = [],
    isLoading,
    error,
  } = useSuperAdminPermittedModelsControllerGetAvailableModels(orgId);

  return {
    models,
    isLoading,
    isError: !!error,
    error,
  };
}
