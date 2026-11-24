import { useModelsControllerGetPermittedLanguageModels } from '@ayunis/api-client/endpoints';

export function usePermittedModels() {
  const {
    data: permittedModels,
    isLoading,
    isError,
  } = useModelsControllerGetPermittedLanguageModels();

  const getPlaceholder = (): string => {
    if (isLoading) return 'Loading models...';
    if (isError) return 'Error loading models';
    if (!permittedModels) return 'No models available';
    return 'Select a model';
  };

  const isDisabled = isLoading || isError || !permittedModels;

  return {
    models: permittedModels ?? [],
    isLoading,
    error: isError,
    placeholder: getPlaceholder(),
    isDisabled,
  };
}
