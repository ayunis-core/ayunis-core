import {
  useSuperAdminCatalogModelsControllerGetAllCatalogModels,
  useSuperAdminOparlEmbeddingModelControllerGet,
} from '@ayunis/api-client';
import { isEmbeddingModel } from '@/features/models';

/** The OParl embedding model and the catalog embedding models to choose from. */
export function useOparlEmbeddingModel() {
  const current = useSuperAdminOparlEmbeddingModelControllerGet();
  const catalog = useSuperAdminCatalogModelsControllerGetAllCatalogModels();
  const choices = (catalog.data ?? [])
    .filter(isEmbeddingModel)
    .filter((model) => !model.isArchived);
  return {
    model: current.data?.model ?? null,
    choices,
    isLoading: current.isLoading || catalog.isLoading,
    isError: current.isError || catalog.isError,
  };
}
