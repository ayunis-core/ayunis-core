import type { ModelWithConfigResponseDto } from '@/shared/api';
import { useModelsControllerGetAvailableLanguageModels } from '@/shared/api';

export function useLanguageModels() {
  const { data, isLoading, isError, error, refetch } =
    useModelsControllerGetAvailableLanguageModels();

  const models: ModelWithConfigResponseDto[] = data ?? [];

  return { models, isLoading, isError, error, refetch };
}
