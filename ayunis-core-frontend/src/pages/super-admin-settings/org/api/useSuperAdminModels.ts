import {
  useSuperAdminPermittedModelsControllerGetAvailableLanguageModels,
  useSuperAdminPermittedModelsControllerGetAvailableEmbeddingModels,
  useSuperAdminPermittedModelsControllerGetAvailableImageGenerationModels,
} from '@/shared/api';
import type { ModelWithConfigResponseDto } from '@/shared/api';

export function useSuperAdminModels(orgId: string) {
  const {
    data: languageData,
    isLoading: isLoadingLanguage,
    isError: hasLanguageError,
  } = useSuperAdminPermittedModelsControllerGetAvailableLanguageModels(orgId);
  const {
    data: embeddingData,
    isLoading: isLoadingEmbedding,
    isError: hasEmbeddingError,
  } = useSuperAdminPermittedModelsControllerGetAvailableEmbeddingModels(orgId);
  const {
    data: imageGenData,
    isLoading: isLoadingImageGen,
    isError: hasImageGenerationError,
  } = useSuperAdminPermittedModelsControllerGetAvailableImageGenerationModels(
    orgId,
  );

  const languageModels: ModelWithConfigResponseDto[] = languageData ?? [];
  const embeddingModels: ModelWithConfigResponseDto[] = embeddingData ?? [];
  const imageGenerationModels: ModelWithConfigResponseDto[] =
    imageGenData ?? [];

  const isLoading =
    isLoadingLanguage || isLoadingEmbedding || isLoadingImageGen;
  const hasAnyError =
    hasLanguageError || hasEmbeddingError || hasImageGenerationError;
  const hasCriticalError =
    hasLanguageError && hasEmbeddingError && hasImageGenerationError;
  const hasPartialError = hasAnyError && !hasCriticalError;

  return {
    languageModels,
    embeddingModels,
    imageGenerationModels,
    isLoading,
    isError: hasAnyError,
    hasLanguageError,
    hasEmbeddingError,
    hasImageGenerationError,
    hasPartialError,
    hasCriticalError,
  };
}
