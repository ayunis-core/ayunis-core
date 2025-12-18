import { useSuperAdminModelsControllerGetAvailableModels } from '@/shared/api';

export function useSuperAdminModels(orgId: string) {
  const {
    data: models = [],
    isLoading,
    error,
  } = useSuperAdminModelsControllerGetAvailableModels(orgId);

  return {
    models,
    isLoading,
    isError: !!error,
    error,
  };
}
