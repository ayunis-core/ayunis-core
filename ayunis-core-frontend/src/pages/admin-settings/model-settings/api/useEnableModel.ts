import type { ModelWithConfigResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useCreatePermittedModel } from './useCreatePermittedModel';

export function useEnableModel() {
  const { createPermittedModel, isLoading } = useCreatePermittedModel();

  function enableModel(model: ModelWithConfigResponseDto) {
    createPermittedModel({ modelId: model.modelId });
  }

  return {
    enableModel,
    isEnabling: isLoading,
  };
}
