import type { ModelWithConfigResponseDto } from '@/shared/api';
import { useModelsControllerGetAvailableEmbeddingModels } from '@/shared/api';

export function useEmbeddingModels() {
  const { data, isLoading, isError, error, refetch } =
    useModelsControllerGetAvailableEmbeddingModels();

  const models: ModelWithConfigResponseDto[] = data ?? [];

  return { models, isLoading, isError, error, refetch };
}
