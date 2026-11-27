import {
  getModelModeDefaultsControllerGetDefaultSelectionQueryKey,
  modelModeDefaultsControllerGetDefaultSelection,
  type DefaultModelSelectionResponseDto,
} from '@ayunis/api-client';
import { getModeValue } from './model-modes';

export function defaultModelSelectionQueryOptions() {
  return {
    queryKey: getModelModeDefaultsControllerGetDefaultSelectionQueryKey(),
    queryFn: () => modelModeDefaultsControllerGetDefaultSelection(),
    staleTime: 0,
  };
}

/** Composer value: `mode:<mode>` for a mode default, else the model id. */
export function toComposerValue(
  selection: DefaultModelSelectionResponseDto | null | undefined,
): string | undefined {
  if (!selection) return undefined;
  return selection.mode
    ? getModeValue(selection.mode)
    : selection.permittedModelId;
}
