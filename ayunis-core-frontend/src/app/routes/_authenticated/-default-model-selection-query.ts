import {
  getModelModeDefaultsControllerGetDefaultSelectionQueryKey,
  modelModeDefaultsControllerGetDefaultSelection,
  type DefaultModelSelectionResponseDto,
} from '@/shared/api';
import { getModeValue } from '@/widgets/model-select-options';

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
