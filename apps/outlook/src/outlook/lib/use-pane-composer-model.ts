import {
  useModelModeDefaultsControllerGetDefaultSelection,
  useModelModesControllerGetModelModes,
  useModelsControllerGetPermittedLanguageModels,
} from '@ayunis/api-client/endpoints';
import {
  getModeValue,
  resolveSelectedModel,
} from '@ayunis/chat/model-presentation';

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
  const initial = selection.data?.mode
    ? getModeValue(selection.data.mode)
    : (selection.data?.permittedModelId ??
      models.find(({ isDefault }) => isDefault)?.id ??
      models[0]?.id);
  const value = selectedValue ?? initial;

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
