import {
  getModelsDefaultsControllerGetEffectiveDefaultModelQueryKey,
  modelsDefaultsControllerGetEffectiveDefaultModel,
} from '@/shared/api';

export function effectiveDefaultModelQueryOptions() {
  return {
    queryKey: getModelsDefaultsControllerGetEffectiveDefaultModelQueryKey(),
    queryFn: () => modelsDefaultsControllerGetEffectiveDefaultModel(),
    staleTime: 0,
  };
}
