import type { ModelWithConfigResponseDto } from '@ayunis/api-client';
import { useModelsControllerGetAvailableLanguageModels } from '@ayunis/api-client';

export function useLanguageModels() {
  const { data, isLoading, isError, error, refetch } =
    useModelsControllerGetAvailableLanguageModels();

  const models: ModelWithConfigResponseDto[] = data ?? [];

  return { models, isLoading, isError, error, refetch };
}
