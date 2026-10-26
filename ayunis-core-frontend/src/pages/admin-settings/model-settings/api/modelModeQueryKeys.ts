import {
  getModelModeDefaultsControllerGetDefaultSelectionQueryKey,
  getModelModesControllerGetModelModesQueryKey,
} from '@/shared/api';
import { getModelModeDefaultQueryKey } from '@/features/model-mode-defaults';

/** Which modes are available, and the model each resolves to, follow the org's model access. */
export function modelModeQueryKeys() {
  return [
    getModelModeDefaultQueryKey({ level: 'org' }),
    getModelModeDefaultQueryKey({ level: 'user' }),
    getModelModeDefaultsControllerGetDefaultSelectionQueryKey(),
    getModelModesControllerGetModelModesQueryKey(),
  ];
}
