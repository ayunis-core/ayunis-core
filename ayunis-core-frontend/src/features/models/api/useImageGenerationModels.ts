import type { ModelWithConfigResponseDto } from '@/shared/api';
import { useModelsControllerGetAvailableImageGenerationModels } from '@/shared/api';

export function useImageGenerationModels() {
  const { data, isLoading, isError, error, refetch } =
    useModelsControllerGetAvailableImageGenerationModels();

  const models: ModelWithConfigResponseDto[] = data ?? [];

  return { models, isLoading, isError, error, refetch };
}
