import type { ModelWithConfigResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useSuperAdminCreatePermittedModel } from './useSuperAdminCreatePermittedModel';

export function useSuperAdminEnableModel(orgId: string) {
  const { createPermittedModel, isLoading } =
    useSuperAdminCreatePermittedModel(orgId);

  function enableModel(model: ModelWithConfigResponseDto) {
    createPermittedModel({ modelId: model.modelId });
  }

  return {
    enableModel,
    isEnabling: isLoading,
  };
}
