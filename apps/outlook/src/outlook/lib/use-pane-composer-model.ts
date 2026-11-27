import {
  useModelModeDefaultsControllerGetDefaultSelection,
  useModelModesControllerGetModelModes,
  useModelsControllerGetPermittedLanguageModels,
} from '@ayunis/api-client/endpoints';
import type {
  DefaultModelSelectionResponseDto,
  PermittedLanguageModelResponseDto,
} from '@ayunis/api-client/schemas';
import {
  getModeValue,
  resolveSelectedModel,
} from '@ayunis/chat/model-presentation';

function initialValue(
  selection: DefaultModelSelectionResponseDto | undefined,
  models: readonly PermittedLanguageModelResponseDto[],
): string | undefined {
  if (selection?.mode) return getModeValue(selection.mode);
  return (
    selection?.permittedModelId ??
    models.find(({ isDefault }) => isDefault)?.id ??
    models[0]?.id
  );
}

export function usePaneComposerModel({
  enabled,
  anonymous,
  selectedValue,
}: Readonly<{ enabled: boolean; anonymous: boolean; selectedValue?: string }>) {
  const query = { enabled };
  const permitted = useModelsControllerGetPermittedLanguageModels({ query });
  const modes = useModelModesControllerGetModelModes({ query });
  const selection = useModelModeDefaultsControllerGetDefaultSelection({
    query,
  });
  const models = permitted.data ?? [];
  const resolutions = modes.data ?? [];
  const value = selectedValue ?? initialValue(selection.data, models);

  return {
    models,
    resolutions,
    value,
    resolved: resolveSelectedModel(
      value,
      models,
      resolutions,
      anonymous,
      selection.data,
    ),
    pending: enabled && (permitted.isPending || selection.isPending),
    failed: permitted.isError,
  };
}
