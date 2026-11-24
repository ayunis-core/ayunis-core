import type { ModelWithConfigResponseDto } from '@ayunis/api-client/schemas';
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
