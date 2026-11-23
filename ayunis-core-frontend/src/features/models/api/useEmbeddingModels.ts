import type { ModelWithConfigResponseDto } from '@ayunis/api-client';
import { useModelsControllerGetAvailableEmbeddingModels } from '@ayunis/api-client';

export function useEmbeddingModels() {
  const { data, isLoading, isError, error, refetch } =
    useModelsControllerGetAvailableEmbeddingModels();

  const models: ModelWithConfigResponseDto[] = data ?? [];

  return { models, isLoading, isError, error, refetch };
}
