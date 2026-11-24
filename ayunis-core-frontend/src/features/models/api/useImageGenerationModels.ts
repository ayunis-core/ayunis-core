import type { ModelWithConfigResponseDto } from '@ayunis/api-client';
import { useModelsControllerGetAvailableImageGenerationModels } from '@ayunis/api-client';

export function useImageGenerationModels() {
  const { data, isLoading, isError, error, refetch } =
    useModelsControllerGetAvailableImageGenerationModels();

  const models: ModelWithConfigResponseDto[] = data ?? [];

  return { models, isLoading, isError, error, refetch };
}
